import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  aiKnowledgeFiles,
  aiUsageEvents,
  db,
  type Tenant,
} from "@quote-engine/db";
import { openaiFetch } from "./client";
import { getAiSettings, saveAiSettings } from "./settings";

const ALLOWED_KNOWLEDGE_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_KNOWLEDGE_FILE_SIZE = 20 * 1024 * 1024;

export async function ensureVectorStore(tenant: Tenant): Promise<string> {
  const settings = getAiSettings(tenant);
  if (settings.vectorStoreId) return settings.vectorStoreId;

  const created = await openaiFetch<{ id: string }>("/vector_stores", {
    method: "POST",
    body: JSON.stringify({
      name: `Auctorum ${tenant.slug} knowledge base`,
    }),
  });

  await saveAiSettings(tenant, { vectorStoreId: created.id });
  return created.id;
}

export function validateKnowledgeFile(file: File): string | null {
  if (
    !ALLOWED_KNOWLEDGE_TYPES.has(file.type) &&
    !file.name.match(/\.(md|markdown)$/i)
  ) {
    return "Tipo de archivo no permitido. Usa PDF, TXT, Markdown o DOCX.";
  }
  if (file.size > MAX_KNOWLEDGE_FILE_SIZE) {
    return "Archivo demasiado grande. El maximo es 20MB.";
  }
  return null;
}

export async function uploadKnowledgeFile({
  tenant,
  userId,
  file,
}: {
  tenant: Tenant;
  userId: string;
  file: File;
}) {
  const validationError = validateKnowledgeFile(file);
  if (validationError) throw new Error(validationError);

  const vectorStoreId = await ensureVectorStore(tenant);
  const form = new FormData();
  form.set("purpose", "assistants");
  form.set("file", file);

  const uploaded = await openaiFetch<{
    id: string;
    filename?: string;
    bytes?: number;
  }>("/files", {
    method: "POST",
    body: form,
  });

  await openaiFetch(`/vector_stores/${vectorStoreId}/files`, {
    method: "POST",
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
      mimeType: file.type || "application/octet-stream",
      sizeBytes: String(uploaded.bytes ?? file.size),
      status: "processing",
    })
    .returning();

  return record;
}

export async function listKnowledgeFiles(tenantId: string) {
  return db
    .select()
    .from(aiKnowledgeFiles)
    .where(
      and(
        eq(aiKnowledgeFiles.tenantId, tenantId),
        isNull(aiKnowledgeFiles.deletedAt),
      ),
    )
    .orderBy(desc(aiKnowledgeFiles.createdAt));
}

export async function deleteKnowledgeFile({
  tenantId,
  fileId,
}: {
  tenantId: string;
  fileId: string;
}) {
  const [record] = await db
    .select()
    .from(aiKnowledgeFiles)
    .where(
      and(
        eq(aiKnowledgeFiles.tenantId, tenantId),
        eq(aiKnowledgeFiles.id, fileId),
        isNull(aiKnowledgeFiles.deletedAt),
      ),
    )
    .limit(1);

  if (!record) return null;

  await openaiFetch(
    `/vector_stores/${record.vectorStoreId}/files/${record.openaiFileId}`,
    { method: "DELETE" },
  ).catch(() => null);
  await openaiFetch(`/files/${record.openaiFileId}`, {
    method: "DELETE",
  }).catch(() => null);

  const [updated] = await db
    .update(aiKnowledgeFiles)
    .set({ status: "deleted", deletedAt: new Date() })
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
