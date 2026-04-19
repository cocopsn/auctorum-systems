export * from './schema';

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
    const client = postgres(connectionString);
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

/**
 * Enforce Tenant Isolation Wrapper (RLS / Application Level Middleware)
 * Wrap all tenant-specific database interactions here to prevent data leakage.
 * Sets app.tenant_id via set_config so Postgres RLS policies can enforce isolation.
 */
export async function withTenant<T>(tenantId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return await callback(tx);
  });
}
