export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { sql, eq, and, gte, lte, desc } from "drizzle-orm"
import { db, tenants, users, auditLogs } from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get("tenantId")
  const action = searchParams.get("action")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200)
  const offset = Number(searchParams.get("offset") || 0)

  const conditions = []
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId))
  if (action) conditions.push(sql`${auditLogs.action} ilike ${`%${action}%`}`)
  if (from) conditions.push(gte(auditLogs.createdAt, from))
  if (to) conditions.push(lte(auditLogs.createdAt, to))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const logs = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(where)

  // Get tenant and user names for display
  const tenantIds = [...new Set(logs.map(l => l.tenantId))]
  const userIds = [...new Set(logs.filter(l => l.userId).map(l => l.userId!))]

  const tenantNames = tenantIds.length > 0
    ? await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(sql`${tenants.id} in ${tenantIds}`)
    : []
  const userNames = userIds.length > 0
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(sql`${users.id} in ${userIds}`)
    : []

  const tMap = Object.fromEntries(tenantNames.map(t => [t.id, t.name]))
  const uMap = Object.fromEntries(userNames.map(u => [u.id, u.name || u.email]))

  const enriched = logs.map(l => ({
    ...l,
    tenantName: tMap[l.tenantId] || l.tenantId,
    userName: l.userId ? (uMap[l.userId] || l.userId) : "Sistema",
  }))

  return NextResponse.json({
    logs: enriched,
    total: Number(countResult?.count ?? 0),
    limit,
    offset,
  })
}
