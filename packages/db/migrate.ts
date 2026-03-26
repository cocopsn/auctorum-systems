import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from apps/web
config({ path: resolve(__dirname, '../../apps/web/.env.local') });

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[migrate] DATABASE_URL not set');
    process.exit(1);
  }
  const client = postgres(dbUrl);
  console.log('[migrate] Connecting to database...');

  const sql = readFileSync(join(__dirname, 'migrations', '0000_initial.sql'), 'utf-8');
  await client.unsafe(sql);

  console.log('[migrate] Migration applied successfully');
  await client.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
