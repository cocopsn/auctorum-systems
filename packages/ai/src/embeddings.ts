import { openaiFetch } from "./client";

/**
 * Generate an embedding vector for the given text using OpenAI embeddings API.
 * Uses text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiFetch<{
    data: Array<{ embedding: number[] }>;
  }>("/embeddings", {
    method: "POST",
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  return response.data[0].embedding;
}
