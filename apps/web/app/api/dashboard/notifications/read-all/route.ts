export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, notifications } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"

export async function PUT() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.tenantId, auth.tenant.id),
          eq(notifications.read, false)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Read all notifications error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
