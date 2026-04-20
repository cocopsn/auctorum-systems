export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
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
    checks.database = { status: "error", error: err.message }
  }

  // Table counts
  try {
    const tables = ["tenants", "users", "patients", "appointments", "conversations", "messages", "clinical_records"]
    const counts: Record<string, number> = {}
    for (const t of tables) {
      const [r] = await db.execute(sql.raw(`SELECT count(*) as c FROM ${t}`))
      counts[t] = Number(r.c)
    }
    checks.tableCounts = counts
  } catch (err: any) {
    checks.tableCounts = { error: err.message }
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
