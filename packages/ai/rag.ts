/**
 * RAG search against pgvector knowledge_base table.
 * Schema: id uuid, tenant_id uuid, content text, embedding vector(1536), metadata jsonb
 *
 * Defaults tuned for text-embedding-3-small on WhatsApp-short queries:
 * - topK = 5
 * - minSimilarity = 0.45
 */
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

async function embed(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });
  if (!res.ok) {
    throw new Error(`embedding failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0].embedding;
}

export type KnowledgeChunk = {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
};

export async function searchKnowledgeBase(params: {
  tenantId: string;
  query: string;
  topK?: number;
  minSimilarity?: number;
}): Promise<KnowledgeChunk[]> {
  const { tenantId, query, topK = 5, minSimilarity = 0.45 } = params;
  try {
    const embedding = await embed(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result: any = await db.execute(sql`
      SELECT id, content, metadata,
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM knowledge_base
      WHERE tenant_id = ${tenantId}::uuid
        AND 1 - (embedding <=> ${embeddingStr}::vector) > ${minSimilarity}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `);

    const rows: any[] = Array.isArray(result) ? result : (result?.rows ?? []);

    return rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      similarity: Number(r.similarity),
      metadata: r.metadata ?? {},
    }));
  } catch (err) {
    console.warn('[ai/rag] searchKnowledgeBase failed (non-blocking):', (err as Error).message);
    return [];
  }
}
