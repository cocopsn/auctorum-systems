export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, notifications } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { validateOrigin } from '@/lib/csrf'

export async function PUT() {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

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
