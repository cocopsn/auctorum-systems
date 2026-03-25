export * from './schema';

// Drizzle client setup — import this in your app
// Usage: import { db } from '@quote-engine/db';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
