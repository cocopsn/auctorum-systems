export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, portalPages } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { z } from "zod"
import { validateOrigin } from '@/lib/csrf'

const sectionSchema = z.object({
  type: z.enum(["hero", "about", "services", "gallery", "testimonials", "team", "faq", "contact", "cta", "custom"]),
  visible: z.boolean().default(true),
  order: z.number().default(0),
  data: z.record(z.any()),
})

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = sectionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const tenantId = auth.tenant.id

    // Get homepage
    let [homepage] = await db
      .select()
      .from(portalPages)
      .where(and(eq(portalPages.tenantId, tenantId), eq(portalPages.isHomepage, true)))
      .limit(1)

    if (!homepage) {
      // Create default page first
      const [created] = await db
        .insert(portalPages)
        .values({
          tenantId,
          title: auth.tenant.name,
          slug: "home",
          isHomepage: true,
          sections: [],
          portalConfig: {},
        })
        .returning()
      homepage = created
    }

    const sections = (homepage.sections as any[]) || []
    const newSection = {
      id: crypto.randomUUID(),
      ...parsed.data,
      order: sections.length,
    }
    sections.push(newSection)

    await db
      .update(portalPages)
      .set({ sections, updatedAt: new Date() })
      .where(eq(portalPages.id, homepage.id))

    return NextResponse.json({ section: newSection })
  } catch (error) {
    console.error("Portal section POST error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
