/**
 * Re-seed the 'Ubicación del consultorio' chunk for dra-martinez using the real
 * address from tenants.config.contact (source of truth for the portal).
 *
 * Run: source apps/medconcierge/.env.local && npx tsx scripts/reseed-kb-location-dra-martinez.ts
 */
import { db } from '../packages/db/index';
import { sql } from 'drizzle-orm';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

async function embed(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`embedding failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0].embedding;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const tenantResult = await db.execute(sql`
    SELECT id, name, config::text as config_json
    FROM tenants
    WHERE slug = 'dra-martinez'
    LIMIT 1
  `);

  const tenant = (tenantResult as any[])[0];
  if (!tenant) throw new Error('Tenant not found');

  const config = JSON.parse(tenant.config_json);
  const contact = config.contact || {};

  const realAddress =
    contact.address ||
    config.address ||
    'Blvd. V. Carranza 2345, Consultorio 8, Saltillo, Coahuila';
  const realPhone = contact.phone || '';
  const realEmail = contact.email || '';

  console.log('Dirección REAL desde config.contact:', realAddress);
  console.log('Teléfono:', realPhone);
  console.log('Email:', realEmail);

  const locationContent = `El consultorio de la Dra. Laura Martínez está ubicado en ${realAddress}, Saltillo, Coahuila, México. ${realPhone ? `El teléfono de contacto es ${realPhone}.` : ''} ${realEmail ? `Email: ${realEmail}.` : ''} El consultorio cuenta con estacionamiento y acceso para sillas de ruedas. Si necesita indicaciones específicas para llegar, puede pedirlas por este mismo chat.`;

  console.log('\nNuevo chunk de ubicación:');
  console.log(locationContent);

  const deleted = await db.execute(sql`
    DELETE FROM knowledge_base
    WHERE tenant_id = ${tenant.id}
      AND metadata->>'title' = 'Ubicación del consultorio'
    RETURNING id
  `);
  console.log(`\nEliminados ${(deleted as any[]).length} chunks viejos de ubicación`);

  const embedding = await embed(locationContent);
  const embeddingStr = `[${embedding.join(',')}]`;

  await db.execute(sql`
    INSERT INTO knowledge_base (tenant_id, content, embedding, metadata)
    VALUES (
      ${tenant.id},
      ${locationContent},
      ${embeddingStr}::vector,
      ${JSON.stringify({ title: 'Ubicación del consultorio', source: 'reseed-from-config' })}::jsonb
    )
  `);

  console.log('Chunk nuevo insertado');

  const queryEmb = await embed('¿dónde está el consultorio?');
  const queryEmbStr = `[${queryEmb.join(',')}]`;

  const rag = await db.execute(sql`
    SELECT
      substring(content, 1, 200) as preview,
      1 - (embedding <=> ${queryEmbStr}::vector) as similarity
    FROM knowledge_base
    WHERE tenant_id = ${tenant.id}
    ORDER BY embedding <=> ${queryEmbStr}::vector
    LIMIT 1
  `);

  const top = (rag as any[])[0];
  console.log(`\nRAG verificación: similarity=${Number(top.similarity).toFixed(3)}`);
  console.log(`Preview: ${top.preview}`);

  if (!String(top.preview).includes(realAddress.split(',')[0].trim())) {
    console.error('WARN: El top chunk no contiene la calle de la dirección real');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
