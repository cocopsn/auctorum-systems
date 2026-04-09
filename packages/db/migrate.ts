import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { config } from 'dotenv';

// Load .env.local from apps/web (DATABASE_URL lives there in dev)
config({ path: resolve(__dirname, '../../apps/web/.env.local') });

const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Migration runner — idempotent + ordered.
 *
 * Behaviour:
 *  1. Ensure the `_migrations` tracking table exists.
 *  2. Read every `*.sql` file from ./migrations and sort alphabetically.
 *  3. For each file: skip if already in `_migrations`, otherwise run it inside
 *     a transaction and INSERT a row into `_migrations` (ON CONFLICT DO NOTHING).
 *  4. Existing migrations (0000–0004) used `IF NOT EXISTS` everywhere, so
 *     re-applying them on a populated database is a safe no-op — the script
 *     can be adopted on prod without manual seeding.
 */
async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[migrate] DATABASE_URL not set');
    process.exit(1);
  }

  const client = postgres(dbUrl, { max: 1 });
  console.log('[migrate] Connecting to database...');

  try {
    // 1. Ensure tracking table.
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 2. Discover migration files.
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[migrate] No migration files found.');
      await client.end();
      process.exit(0);
    }

    // 3. Load already-applied set.
    const appliedRows = await client<{ name: string }[]>`SELECT name FROM _migrations`;
    const applied = new Set(appliedRows.map((r) => r.name));

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skipping ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`[migrate] applying ${file}...`);
      const sqlText = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

      try {
        await client.begin(async (tx) => {
          await tx.unsafe(sqlText);
          await tx`
            INSERT INTO _migrations (name) VALUES (${file})
            ON CONFLICT (name) DO NOTHING
          `;
        });
        console.log(`[migrate] ✓ ${file}`);
        appliedCount++;
      } catch (err) {
        console.error(`[migrate] ✗ ${file} failed`);
        throw err;
      }
    }

    console.log(`[migrate] done — applied ${appliedCount}, skipped ${skippedCount}`);
    await client.end();
    process.exit(0);
  } catch (err) {
    await client.end({ timeout: 5 }).catch(() => {});
    throw err;
  }
}

migrate().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
