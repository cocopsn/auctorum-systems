export * from './schema';

// Drizzle client setup — import this in your app
// Usage: import { db } from '@quote-engine/db';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!_db) {
      const connectionString = process.env.DATABASE_URL!;
      const client = postgres(connectionString);
      _db = drizzle(client, { schema });
    }
    return (_db as any)[prop];
  },
});
