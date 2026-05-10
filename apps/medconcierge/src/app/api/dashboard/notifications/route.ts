export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { and, eq, desc, sql } from "drizzle-orm"
import { db, notifications } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    // Two queries instead of one. Pre-2026-05-10 the bell asked for
    // `WHERE read=false LIMIT 50` and used results.length as the badge
    // count — capped at 50 so a tenant with 200 unread saw "50" forever.
    // Now the list shows the most recent 20 (read or unread) and the
    // badge gets the precise unread count via COUNT(*).
    const [list, [{ count } = { count: 0 }]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.tenantId, auth.tenant.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, auth.tenant.id),
            eq(notifications.read, false),
          ),
        ),
    ])

    return NextResponse.json({ notifications: list, unreadCount: Number(count ?? 0) })
  } catch (error) {
    console.error("Notifications GET error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
