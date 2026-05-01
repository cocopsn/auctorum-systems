export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { eq, sql, and, gte } from "drizzle-orm"
import { db, tenants, users, appointments, messages, conversations, subscriptions, auditLogs } from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [tenantStats] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where ${tenants.provisioningStatus} = 'active')`,
      suspended: sql<number>`count(*) filter (where ${tenants.provisioningStatus} = 'suspended')`,
      draft: sql<number>`count(*) filter (where ${tenants.provisioningStatus} = 'draft')`,
    })
    .from(tenants)
    .where(sql`${tenants.deletedAt} is null`)

  const [userStats] = await db
    .select({ total: sql<number>`count(*)` })
    .from(users)

  const [appointmentStats] = await db
    .select({ thisMonth: sql<number>`count(*)` })
    .from(appointments)
    .where(gte(appointments.createdAt, startOfMonth))

  const [messageStats] = await db
    .select({ thisMonth: sql<number>`count(*)` })
    .from(messages)
    .where(gte(messages.createdAt, startOfMonth))

  // Revenue from subscriptions
  const [revenueStats] = await db
    .select({ monthlyRevenue: sql<string>`coalesce(sum(${subscriptions.amount}::numeric), 0)` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"))

  // Tenants by plan
  const planDistribution = await db
    .select({
      plan: tenants.plan,
      count: sql<number>`count(*)`,
    })
    .from(tenants)
    .where(sql`${tenants.deletedAt} is null`)
    .groupBy(tenants.plan)

  // Recent audit logs
  const recentLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      createdAt: auditLogs.createdAt,
      tenantId: auditLogs.tenantId,
    })
    .from(auditLogs)
    .orderBy(sql`${auditLogs.createdAt} desc`)
    .limit(10)

  return NextResponse.json({
    userName: auth.user.name || auth.user.email,
    tenants: tenantStats,
    users: userStats,
    appointments: appointmentStats,
    messages: messageStats,
    revenue: { monthly: Number(revenueStats?.monthlyRevenue ?? 0) },
    planDistribution,
    recentLogs,
  })
}
