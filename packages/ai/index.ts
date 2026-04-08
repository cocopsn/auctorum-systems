import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  aiKnowledgeFiles,
  aiUsageEvents,
  db,
  tenants,
  type Tenant,
  type TenantConfig,
} from '@quote-engine/db';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5-mini';
const ALLOWED_KNOWLEDGE_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_KNOWLEDGE_FILE_SIZE = 20 * 1024 * 1024;

export type AiSettings = NonNullable<TenantConfig['ai']>;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  systemPrompt: 'Eres el concierge de Auctorum para este negocio. Responde de forma clara, breve y profesional. Si no sabes algo, ofrece transferir a un humano.',
  autoSchedule: false,
  answerFaq: true,
  humanHandoff: true,
  model: DEFAULT_MODEL,
  vectorStoreId: null,
};

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return key;
}

async function openaiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${OPENAI_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI ${response.status}: ${detail}`);
  }

  return response.json() as Promise<T>;
}

export function getAiSettings(tenant: Tenant): AiSettings {
  const config = tenant.config as TenantConfig;
  return { ...DEFAULT_AI_SETTINGS, ...(config.ai ?? {}) };
}

export async function saveAiSettings(tenant: Tenant, settings: Partial<AiSettings>) {
  const config = tenant.config as TenantConfig;
  const merged = { ...config, ai: { ...getAiSettings(tenant), ...settings } };
  const [updated] = await db
    .update(tenants)
    .set({ config: merged, updatedAt: new Date() })
    .where(eq(tenants.id, tenant.id))
    .returning();
  return updated;
}

export async function ensureVectorStore(tenant: Tenant) {
  const settings = getAiSettings(tenant);
  if (settings.vectorStoreId) return settings.vectorStoreId;

  const created = await openaiFetch<{ id: string }>('/vector_stores', {
    method: 'POST',
    body: JSON.stringify({ name: `Auctorum ${tenant.slug} knowledge base` }),
  });

  await saveAiSettings(tenant, { vectorStoreId: created.id });
  return created.id;
}

export function validateKnowledgeFile(file: File) {
  if (!ALLOWED_KNOWLEDGE_TYPES.has(file.type) && !file.name.match(/\.(md|markdown)$/i)) {
    return 'Tipo de archivo no permitido. Usa PDF, TXT, Markdown o DOCX.';
  }
  if (file.size > MAX_KNOWLEDGE_FILE_SIZE) {
    return 'Archivo demasiado grande. El maximo es 20MB.';
  }
  return null;
}

export async function uploadKnowledgeFile({ tenant, userId, file }: { tenant: Tenant; userId: string; file: File }) {
  const validationError = validateKnowledgeFile(file);
  if (validationError) throw new Error(validationError);

  const vectorStoreId = await ensureVectorStore(tenant);
  const form = new FormData();
  form.set('purpose', 'assistants');
  form.set('file', file);

  const uploaded = await openaiFetch<{ id: string; filename?: string; bytes?: number }>('/files', {
    method: 'POST',
    body: form,
  });

  await openaiFetch(`/vector_stores/${vectorStoreId}/files`, {
    method: 'POST',
    body: JSON.stringify({ file_id: uploaded.id }),
  });

  const [record] = await db
    .insert(aiKnowledgeFiles)
    .values({
      tenantId: tenant.id,
      uploadedBy: userId,
      openaiFileId: uploaded.id,
      vectorStoreId,
      fileName: uploaded.filename ?? file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: String(uploaded.bytes ?? file.size),
      status: 'processing',
    })
    .returning();

  return record;
}

export async function listKnowledgeFiles(tenantId: string) {
  return db
    .select()
    .from(aiKnowledgeFiles)
    .where(and(eq(aiKnowledgeFiles.tenantId, tenantId), isNull(aiKnowledgeFiles.deletedAt)))
    .orderBy(desc(aiKnowledgeFiles.createdAt));
}

export async function deleteKnowledgeFile({ tenantId, fileId }: { tenantId: string; fileId: string }) {
  const [record] = await db
    .select()
    .from(aiKnowledgeFiles)
    .where(and(eq(aiKnowledgeFiles.tenantId, tenantId), eq(aiKnowledgeFiles.id, fileId), isNull(aiKnowledgeFiles.deletedAt)))
    .limit(1);

  if (!record) return null;

  await openaiFetch(`/vector_stores/${record.vectorStoreId}/files/${record.openaiFileId}`, { method: 'DELETE' }).catch(() => null);
  await openaiFetch(`/files/${record.openaiFileId}`, { method: 'DELETE' }).catch(() => null);

  const [updated] = await db
    .update(aiKnowledgeFiles)
    .set({ status: 'deleted', deletedAt: new Date() })
    .where(eq(aiKnowledgeFiles.id, record.id))
    .returning();

  return updated;
}

export async function getAiUsageSummary(tenantId: string) {
  const [summary] = await db
    .select({
      total: sql<number>`count(*)::int`,
      resolved: sql<number>`coalesce(sum(case when ${aiUsageEvents.resolved} then 1 else 0 end), 0)::int`,
    })
    .from(aiUsageEvents)
    .where(eq(aiUsageEvents.tenantId, tenantId));

  const total = summary?.total ?? 0;
  const resolved = summary?.resolved ?? 0;
  return {
    total,
    resolvedRate: total ? Math.round((resolved / total) * 100) : 0,
  };
}

function extractResponseText(response: any): string {
  if (typeof response.output_text === 'string') return response.output_text;
  const chunks = response.output?.flatMap((item: any) => item.content ?? []) ?? [];
  const text = chunks
    .map((content: any) => content.text ?? content.value ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
  return text || 'No pude generar una respuesta en este momento.';
}

export async function runPlayground({ tenant, userId, message }: { tenant: Tenant; userId: string; message: string }) {
  const startedAt = Date.now();
  const settings = getAiSettings(tenant);
  const model = settings.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const tools = settings.vectorStoreId
    ? [{ type: 'file_search', vector_store_ids: [settings.vectorStoreId] }]
    : [];

  const response = await openaiFetch<any>('/responses', {
    method: 'POST',
    body: JSON.stringify({
      model,
      instructions: settings.systemPrompt,
      input: message,
      tools,
    }),
  });

  const answer = extractResponseText(response);
  const latencyMs = Date.now() - startedAt;

  await db.insert(aiUsageEvents).values({
    tenantId: tenant.id,
    userId,
    channel: 'playground',
    prompt: message,
    responseSummary: answer.slice(0, 1000),
    model,
    responseId: response.id ?? null,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    latencyMs,
    resolved: true,
  });

  return { answer, responseId: response.id ?? null, model, latencyMs };
}
