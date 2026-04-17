export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq, desc, sql } from "drizzle-orm"
import { db, notifications } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const results = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, auth.tenant.id),
          eq(notifications.read, false)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50)

    return NextResponse.json({ notifications: results, unreadCount: results.length })
  } catch (error) {
    console.error("Notifications GET error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
