import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../apps/web/.env.local' });
const sql = postgres(process.env.DATABASE_URL!);
async function main() {
  const users = await sql`SELECT email FROM users ORDER BY email`;
  console.log('App users:', users.map(u => u.email));
  const auth = await sql`SELECT email FROM auth.users ORDER BY email`;
  console.log('Auth users:', auth.map(u => u.email));
  await sql.end();
}
main().catch(e => { console.error(e); process.exit(1); });
