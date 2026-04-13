export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, notifications } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, params.id),
          eq(notifications.tenantId, auth.tenant.id)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification read error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
