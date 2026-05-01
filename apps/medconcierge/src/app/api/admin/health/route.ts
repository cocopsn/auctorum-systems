export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // LOW-12: Optional secret header check
  const secret = request.headers.get("x-health-secret");
  const expected = process.env.HEALTH_CHECK_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const checks: Record<string, any> = {}

  // DB check
  try {
    const [result] = await db.execute(sql`SELECT 1 as ok, now() as server_time, pg_database_size(current_database()) as db_size`)
    checks.database = {
      status: "ok",
      serverTime: result.server_time,
      dbSizeMB: Math.round(Number(result.db_size) / 1024 / 1024),
    }
  } catch (err: any) {
    console.error("[Health] DB check error:", err)
    checks.database = { status: "error", error: "Database connection failed" }
  }

  // Table counts — MED-16: replaced sql.raw() with parameterized sql`` template literals
  try {
    const counts: Record<string, number> = {}

    const [c1] = await db.execute(sql`SELECT count(*) as c FROM tenants`)
    counts.tenants = Number(c1.c)
    const [c2] = await db.execute(sql`SELECT count(*) as c FROM users`)
    counts.users = Number(c2.c)
    const [c3] = await db.execute(sql`SELECT count(*) as c FROM patients`)
    counts.patients = Number(c3.c)
    const [c4] = await db.execute(sql`SELECT count(*) as c FROM appointments`)
    counts.appointments = Number(c4.c)
    const [c5] = await db.execute(sql`SELECT count(*) as c FROM conversations`)
    counts.conversations = Number(c5.c)
    const [c6] = await db.execute(sql`SELECT count(*) as c FROM messages`)
    counts.messages = Number(c6.c)
    const [c7] = await db.execute(sql`SELECT count(*) as c FROM clinical_records`)
    counts.clinical_records = Number(c7.c)

    checks.tableCounts = counts
  } catch (err: any) {
    console.error("[Health] Table counts error:", err)
    checks.tableCounts = { error: "Failed to retrieve table counts" }
  }

  // Redis check
  try {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    if (redisUrl) {
      checks.redis = { status: "configured", url: redisUrl.replace(/\/\/.*@/, "//***@") }
    } else {
      checks.redis = { status: "not_configured" }
    }
  } catch {
    checks.redis = { status: "unknown" }
  }

  // Environment info
  checks.environment = {
    nodeVersion: process.version,
    nextPublicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
    databaseUrl: process.env.DATABASE_URL ? "configured" : "missing",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing",
    openaiKey: process.env.OPENAI_API_KEY ? "configured" : "missing",
    stripeKey: process.env.STRIPE_SECRET_KEY ? "configured" : "missing",
  }

  // Memory
  const mem = process.memoryUsage()
  checks.memory = {
    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
  }

  return NextResponse.json({ status: "ok", checks, timestamp: new Date().toISOString() })
}
