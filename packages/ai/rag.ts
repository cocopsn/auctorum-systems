/**
 * RAG search against pgvector knowledge_base table.
 * Schema: id uuid, tenant_id uuid, content text, embedding vector(1536), metadata jsonb
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
  const { tenantId, query, topK = 3, minSimilarity = 0.55 } = params;
  console.log('[rag] ENTER tenantId=' + tenantId + ' query="' + query.substring(0, 50) + '" topK=' + topK + ' minSim=' + minSimilarity);

  try {
    console.log('[rag] computing embedding...');
    const embedding = await embed(query);
    console.log('[rag] embedding ready dim=' + embedding.length);

    const embeddingStr = '[' + embedding.join(',') + ']';

    console.log('[rag] executing SQL query...');
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
    console.log('[rag] SQL returned rows.length=' + rows.length);
    console.log('[rag] result type=' + typeof result + ' isArray=' + Array.isArray(result));

    if (rows.length > 0) {
      console.log('[rag] first row keys=' + Object.keys(rows[0]).join(','));
      console.log('[rag] first row similarity=' + rows[0].similarity);
      console.log('[rag] first row content preview=' + String(rows[0].content).substring(0, 60));
    } else {
      console.log('[rag] ZERO rows. Running debug count query...');
      const debug: any = await db.execute(sql`
        SELECT COUNT(*)::int as total FROM knowledge_base WHERE tenant_id = ${tenantId}::uuid
      `);
      const debugRows: any[] = Array.isArray(debug) ? debug : (debug?.rows ?? []);
      console.log('[rag] Debug count result=' + JSON.stringify(debugRows));
    }

    const chunks = rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      similarity: Number(r.similarity),
      metadata: r.metadata ?? {},
    }));

    console.log('[rag] EXIT returning ' + chunks.length + ' chunks');
    return chunks;
  } catch (err: any) {
    console.error('[rag] ERROR message=' + (err?.message || String(err)));
    if (err?.stack) {
      const firstLines = String(err.stack).split('\n').slice(0, 3).join(' | ');
      console.error('[rag] stack=' + firstLines);
    }
    return [];
  }
}
