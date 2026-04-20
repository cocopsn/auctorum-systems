export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { sql, eq } from "drizzle-orm"
import { db, tenants, messages, conversations } from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Messages per tenant this month
  const usage = await db
    .select({
      tenantId: conversations.tenantId,
      totalMessages: sql<number>`count(${messages.id})`,
      inboundMessages: sql<number>`count(*) filter (where ${messages.direction} = 'inbound')`,
      outboundMessages: sql<number>`count(*) filter (where ${messages.direction} = 'outbound')`,
      botMessages: sql<number>`count(*) filter (where ${messages.senderType} = 'bot')`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(sql`${messages.createdAt} >= ${startOfMonth.toISOString()}`)
    .groupBy(conversations.tenantId)

  // Get tenant names
  const allTenants = await db
    .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
    .from(tenants)
    .where(sql`${tenants.deletedAt} is null`)

  const tenantMap = Object.fromEntries(allTenants.map(t => [t.id, t]))

  const COST_PER_BOT_MSG = 0.015 // ~500 tokens * $0.03/1k tokens estimate

  const enriched = usage.map(u => ({
    tenantId: u.tenantId,
    tenantName: tenantMap[u.tenantId]?.name || "Unknown",
    tenantSlug: tenantMap[u.tenantId]?.slug || "",
    totalMessages: Number(u.totalMessages),
    inboundMessages: Number(u.inboundMessages),
    outboundMessages: Number(u.outboundMessages),
    botMessages: Number(u.botMessages),
    estimatedTokens: Number(u.botMessages) * 500,
    estimatedCostUSD: Number((Number(u.botMessages) * COST_PER_BOT_MSG).toFixed(2)),
  }))

  // Sort by total messages desc
  enriched.sort((a, b) => b.totalMessages - a.totalMessages)

  return NextResponse.json({
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    usage: enriched,
    totals: {
      messages: enriched.reduce((s, u) => s + u.totalMessages, 0),
      botMessages: enriched.reduce((s, u) => s + u.botMessages, 0),
      estimatedCostUSD: Number(enriched.reduce((s, u) => s + u.estimatedCostUSD, 0).toFixed(2)),
    },
  })
}
