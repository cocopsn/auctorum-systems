/**
 * AI package public API.
 *
 * NOTE (L-7): This file contains duplicate implementations of functions
 * that also exist in src/. The src/ directory is the canonical source.
 * Migration plan:
 * 1. Verify all callers import from '@quote-engine/ai' (this file)
 * 2. Replace duplicate function bodies with re-exports from src/
 * 3. Remove dead code from this file
 *
 * Functions duplicated in src/:
 * - getAiSettings (src/settings.ts)
 * - saveAiSettings (src/settings.ts)
 * - runPlayground (src/chat.ts)
 * - runWhatsAppReply (src/chat.ts)
 * - DEFAULT_AI_SETTINGS (src/types.ts)
 * - FALLBACK_ERROR_MESSAGE (src/types.ts)
 */
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
// Imported for internal use in uploadKnowledgeFile (storage quota gate).
// Re-exported below at the public API surface.
import { checkAndTrackUsage } from './usage-tracker';
import {
  aiKnowledgeFiles,
  aiUsageEvents,
  db,
  tenants,
  type Tenant,
  type TenantConfig,
} from '@quote-engine/db';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const WHATSAPP_TIMEOUT_MS = 15_000;
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
  temperature: 0.7,
  maxTokens: 300,
};

const FALLBACK_ERROR_MESSAGE =
  `Disculpe, estoy teniendo dificultades tecnicas. Por favor intente de nuevo en unos minutos, o llame directamente al ${process.env.FALLBACK_CONTACT_PHONE || '+52 844 664 4307'}.`;

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
    if (response.status === 429 || detail.includes('quota') || detail.includes('billing')) {
      throw new Error('El servicio de IA no esta disponible en este momento. Contacta al administrador para verificar la cuota de OpenAI.');
    }
    if (response.status === 401) {
      throw new Error('La clave de API de OpenAI es invalida o ha expirado.');
    }
    throw new Error(`OpenAI ${response.status}: ${detail}`);
  }

  return response.json() as Promise<T>;
}

async function openaiFetchWithTimeout<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs: number = WHATSAPP_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await openaiFetch<T>(path, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

  // Quota gate — counts toward the tenant's storage_bytes allowance.
  // Pre-2026-05-12 there was no enforcement at upload time; tenants
  // could exceed their plan limit without any signal.
  const quota = await checkAndTrackUsage(
    tenant.id,
    (tenant as any).plan ?? 'basico',
    'storage_bytes',
    file.size,
  );
  if (!quota.allowed) {
    throw new Error(
      `Espacio insuficiente: ${Math.round(quota.current / 1024 / 1024)}MB usados de ${Math.round(
        (quota.totalLimit ?? 0) / 1024 / 1024,
      )}MB. Borre archivos antiguos o suba de plan.`,
    );
  }

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

  await openaiFetch(`/vector_stores/${record.vectorStoreId}/files/${record.openaiFileId}`, { method: 'DELETE' }).catch((err) => { console.error('Notification insert failed:', err) });
  await openaiFetch(`/files/${record.openaiFileId}`, { method: 'DELETE' }).catch((err) => { console.error('Notification insert failed:', err) });

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

// --------------- WhatsApp AI Concierge ---------------

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Run an AI reply for an incoming WhatsApp message.
 * Uses Chat Completions API with conversation history for multi-turn context.
 * Includes a 15-second timeout and graceful error handling.
 */
export async function runWhatsAppReply({
  tenant,
  messageHistory,
  incomingMessage,
  systemPromptOverride,
}: {
  tenant: Tenant;
  messageHistory: Array<{ direction: string; content: string }>;
  incomingMessage: string;
  /** If provided, replaces tenant's default systemPrompt (used for RAG-augmented prompts). */
  systemPromptOverride?: string;
}): Promise<{ answer: string; model: string; latencyMs: number; inputTokens: number | null; outputTokens: number | null }> {
  const startedAt = Date.now();
  const settings = getAiSettings(tenant);

  if (!settings.enabled) {
    throw new Error('AI is disabled for this tenant');
  }

  const model = settings.model || DEFAULT_MODEL;
  const systemPrompt =
    systemPromptOverride || settings.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt;

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of messageHistory) {
    chatMessages.push({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  chatMessages.push({ role: 'user', content: incomingMessage });

  try {
    const response = await openaiFetchWithTimeout<{
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: chatMessages,
        max_tokens: settings.maxTokens || 300,
        temperature: settings.temperature ?? 0.7,
        // PII safety — opt out of 30-day OpenAI retention. See
        // run-with-tools.ts for the rationale.
        store: false,
      }),
    }, WHATSAPP_TIMEOUT_MS);

    const answer = response.choices?.[0]?.message?.content?.trim()
      || 'No pude generar una respuesta en este momento.';
    const latencyMs = Date.now() - startedAt;
    const inputTokens = response.usage?.prompt_tokens ?? null;
    const outputTokens = response.usage?.completion_tokens ?? null;

    await db.insert(aiUsageEvents).values({
      tenantId: tenant.id,
      channel: 'whatsapp',
      prompt: incomingMessage,
      responseSummary: answer.slice(0, 1000),
      model,
      inputTokens,
      outputTokens,
      latencyMs,
      resolved: true,
    }).catch((e) => console.error('[ai] failed to log usage event:', e));

    return { answer, model, latencyMs, inputTokens, outputTokens };
  } catch (error: any) {
    const latencyMs = Date.now() - startedAt;
    const isTimeout = error?.name === 'AbortError';

    console.error(`[ai whatsapp] ${isTimeout ? 'TIMEOUT' : 'ERROR'} after ${latencyMs}ms:`, error?.message || error);

    // Log the failed attempt
    await db.insert(aiUsageEvents).values({
      tenantId: tenant.id,
      channel: 'whatsapp',
      prompt: incomingMessage,
      responseSummary: `ERROR: ${isTimeout ? 'timeout' : error?.message?.slice(0, 200) || 'unknown'}`,
      model,
      latencyMs,
      resolved: false,
    }).catch((e) => console.error('[ai] failed to log error event:', e));

    return {
      answer: FALLBACK_ERROR_MESSAGE,
      model,
      latencyMs,
      inputTokens: null,
      outputTokens: null,
    };
  }
}

// --------------------------------------------------------------------------
// RAG, per-tenant prompts, and budget control (added 2026-04-16)
// --------------------------------------------------------------------------
export { searchKnowledgeBase, type KnowledgeChunk as RAGChunk } from './rag';
export { buildTenantSystemPrompt, getTenantVertical, getOutOfHoursMessage } from './prompts';
export { checkTenantBudget, getTenantUsage, type BudgetCheckResult } from './budget';
export {
  SPECIALTY_TEMPLATES,
  getSpecialtyTemplate,
  getSpecialtyList,
  type SpecialtyTemplate,
  type SpecialtyId,
} from './specialty-templates';

export {
  ICD10_COMMON,
  ICD10_CATEGORIES,
  findIcd10ByCode,
  searchIcd10,
  type Icd10Entry,
} from './icd10-common';


// --------------------------------------------------------------------------
// Function calling / tools (added 2026-04-16 PROMPT 2.1b.2)
// --------------------------------------------------------------------------
export { runWhatsAppReplyWithTools } from './run-with-tools';
export type { RunWithToolsParams, RunWithToolsResult } from './run-with-tools';
export { WHATSAPP_TOOLS } from './tools';
export { runWithDoctorContext, setDoctorContext } from './tool-executors';
export type { ToolCallResult, ToolName } from './tools';

// --------------------------------------------------------------------------
// Resilience — circuit breaker + canned fallback responses
// --------------------------------------------------------------------------
export {
  recordSuccess,
  recordFailure,
  isCircuitOpen,
  getCircuitStatus,
  generateFallbackResponse,
  withAiFallback,
  type FallbackTenantHint,
} from './fallback';

export {
  calendarWithFallback,
  processPendingCalendarOps,
  CALENDAR_RETRY_BACKOFF_MS,
  CALENDAR_RETRY_MAX_ATTEMPTS,
  type CalendarOperation,
} from './calendar-fallback';

// --------------------------------------------------------------------------
// Per-tenant usage tracking + add-on packs
// --------------------------------------------------------------------------
export {
  PLAN_LIMITS,
  ADDON_PACKAGES,
  getPlanLimits,
  getAddonPackage,
  currentPeriod,
  type PlanId,
  type PlanLimits,
  type AddonPackage,
  type UsageMetric,
} from './plan-limits';

export { checkAndTrackUsage };
export {
  getUsageSnapshot,
  creditAddon,
  type GatedMetric,
  type UsageCheckResult,
  type UsageSnapshot,
} from './usage-tracker';
