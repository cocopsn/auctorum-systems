export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { sql, eq } from "drizzle-orm"
import { db, tenants, users, subscriptions, appointments, messages, conversations } from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      tenantType: tenants.tenantType,
      provisioningStatus: tenants.provisioningStatus,
      isActive: tenants.isActive,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
    })
    .from(tenants)
    .where(sql`${tenants.deletedAt} is null`)
    .orderBy(sql`${tenants.createdAt} desc`)

  // Enrich with counts
  const enriched = await Promise.all(
    rows.map(async (t) => {
      const [uCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.tenantId, t.id))

      const [mCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(sql`${conversations.tenantId} = ${t.id} and ${messages.createdAt} >= ${startOfMonth.toISOString()}`)

      const [sub] = await db
        .select({ plan: subscriptions.plan, amount: subscriptions.amount, status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, t.id))
        .limit(1)

      return {
        ...t,
        userCount: Number(uCount?.count ?? 0),
        messagesThisMonth: Number(mCount?.count ?? 0),
        subscription: sub || null,
      }
    })
  )

  return NextResponse.json({ tenants: enriched })
}
