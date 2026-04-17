export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, portalPages } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { z } from "zod"

const reorderSchema = z.object({
  sectionIds: z.array(z.string()),
})

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = reorderSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const tenantId = auth.tenant.id

    const [homepage] = await db
      .select()
      .from(portalPages)
      .where(and(eq(portalPages.tenantId, tenantId), eq(portalPages.isHomepage, true)))
      .limit(1)

    if (!homepage) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 })

    const sections = (homepage.sections as any[]) || []
    const reordered = parsed.data.sectionIds
      .map((id, order) => {
        const section = sections.find((s: any) => s.id === id)
        return section ? { ...section, order } : null
      })
      .filter(Boolean)

    await db
      .update(portalPages)
      .set({ sections: reordered, updatedAt: new Date() })
      .where(eq(portalPages.id, homepage.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Portal reorder error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
