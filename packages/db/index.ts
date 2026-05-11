export { auditLog } from './audit';
export * from './schema';
// AES-256-GCM helpers — encrypt OAuth tokens / Stripe keys / etc.
// before persisting to JSONB. Pre-2026-05-12 these were plaintext;
// any DB-read access leaked permanent credentials.
export { encrypt, decrypt } from './src/encryption';

// Drizzle client setup — lazy initialization
// The connection is only established on first query, not at import time.
// Usage: import { db } from '@quote-engine/db';

import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    // Pool config tuned for Supabase Transaction-mode pooler.
    //
    // - `max: 4` — cap per process. 14 PM2 procs × 4 = 56 sockets total,
    //   fits inside Supabase Free (30) and Pro (60+) pool budgets. Pre-
    //   2026-05-11 default was 10, giving a 140-socket potential that
    //   would intermittently 503 under modest concurrency.
    // - `prepare: false` — REQUIRED. Transaction-mode poolers reuse
    //   connections across statements, breaking server-side prepared
    //   statement state. postgres-js silently misbehaves with prepare=on.
    // - `idle_timeout: 20` — drop idle sockets within 20s; the pooler
    //   recycles aggressively so holding sockets open wastes the budget.
    // - `connect_timeout: 10` — fail fast on pooler unreachable instead
    //   of hanging the request.
    // - Crons should override max=2 via env (they're short-lived).
    const poolMax = Number(process.env.DB_POOL_MAX ?? 4)
    const client = postgres(connectionString, {
      max: poolMax,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

import { sql } from 'drizzle-orm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Enforce Tenant Isolation Wrapper (RLS / Application Level Middleware)
 * Wrap all tenant-specific database interactions here to prevent data leakage.
 * Sets app.tenant_id via set_config so Postgres RLS policies can enforce isolation.
 *
 * SECURITY: Throws if tenantId is missing or malformed — failing closed.
 * Pre-2026-05-11 this silently accepted any string, including '' (the
 * empty-string case lets RLS policies that compare against an empty UUID
 * return zero rows, masking the bug under "no data" UX instead of erroring).
 */
export async function withTenant<T>(tenantId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  if (!tenantId) {
    throw new Error('[DB] withTenant called without tenantId — refusing to execute (potential cross-tenant leak)')
  }
  if (!UUID_RE.test(tenantId)) {
    throw new Error(`[DB] withTenant called with non-UUID tenantId: ${String(tenantId).slice(0, 64)}`)
  }
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return await callback(tx);
  });
}

/**
 * Alias for withTenant — matches the naming used in the 2026-05-11 P1
 * audit and the prompts referencing it. Same shape, same guarantees.
 */
export const withTenantScope = withTenant
