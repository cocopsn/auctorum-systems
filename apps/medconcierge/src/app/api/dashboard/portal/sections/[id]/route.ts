export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, portalPages } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { z } from "zod"
import { validateOrigin } from '@/lib/csrf'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const tenantId = auth.tenant.id

    const [homepage] = await db
      .select()
      .from(portalPages)
      .where(and(eq(portalPages.tenantId, tenantId), eq(portalPages.isHomepage, true)))
      .limit(1)

    if (!homepage) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 })

    const sections = (homepage.sections as any[]) || []
    const idx = sections.findIndex((s: any) => s.id === params.id)
    if (idx === -1) return NextResponse.json({ error: "Seccion no encontrada" }, { status: 404 })

    sections[idx] = { ...sections[idx], ...body }

    await db
      .update(portalPages)
      .set({ sections, updatedAt: new Date() })
      .where(eq(portalPages.id, homepage.id))

    return NextResponse.json({ section: sections[idx] })
  } catch (error) {
    console.error("Portal section PUT error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const tenantId = auth.tenant.id

    const [homepage] = await db
      .select()
      .from(portalPages)
      .where(and(eq(portalPages.tenantId, tenantId), eq(portalPages.isHomepage, true)))
      .limit(1)

    if (!homepage) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 })

    const sections = ((homepage.sections as any[]) || []).filter((s: any) => s.id !== params.id)

    await db
      .update(portalPages)
      .set({ sections, updatedAt: new Date() })
      .where(eq(portalPages.id, homepage.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Portal section DELETE error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
