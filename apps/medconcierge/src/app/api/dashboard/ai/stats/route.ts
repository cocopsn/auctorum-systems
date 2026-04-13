export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { and, eq, gte, sql, count } from "drizzle-orm"
import { db, aiUsageEvents } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const tenantId = auth.tenant.id
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Total messages last 30 days
    const [totals] = await db
      .select({
        totalMessages: count(),
        totalInputTokens: sql<number>`COALESCE(SUM(${aiUsageEvents.inputTokens}), 0)::int`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${aiUsageEvents.outputTokens}), 0)::int`,
        avgLatency: sql<number>`COALESCE(AVG(${aiUsageEvents.latencyMs}), 0)::int`,
      })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.tenantId, tenantId),
          gte(aiUsageEvents.createdAt, thirtyDaysAgo)
        )
      )

    // Messages per day (last 7 days)
    const dailyMessages = await db
      .select({
        date: sql<string>`DATE(${aiUsageEvents.createdAt})::text`,
        count: count(),
      })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.tenantId, tenantId),
          gte(aiUsageEvents.createdAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`DATE(${aiUsageEvents.createdAt})`)
      .orderBy(sql`DATE(${aiUsageEvents.createdAt})`)

    const inputTokens = totals?.totalInputTokens || 0
    const outputTokens = totals?.totalOutputTokens || 0
    // Approximate cost: gpt-4o-mini ~$0.15/1M input, ~$0.60/1M output
    const estimatedCost = (inputTokens * 0.00000015 + outputTokens * 0.0000006)

    return NextResponse.json({
      totalMessages: totals?.totalMessages || 0,
      totalTokens: inputTokens + outputTokens,
      estimatedCostUSD: parseFloat(estimatedCost.toFixed(4)),
      avgLatencyMs: totals?.avgLatency || 0,
      dailyMessages,
    })
  } catch (error) {
    console.error("AI stats error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
