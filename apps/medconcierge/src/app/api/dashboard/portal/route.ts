export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq, asc } from "drizzle-orm"
import { db, portalPages } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { z } from "zod"
import { validateOrigin } from '@/lib/csrf'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const pages = await db
      .select()
      .from(portalPages)
      .where(eq(portalPages.tenantId, auth.tenant.id))
      .orderBy(asc(portalPages.sortOrder))

    // Return first page (homepage) or null
    const homepage = pages.find(p => p.isHomepage) || pages[0] || null

    return NextResponse.json({
      portal: homepage,
      pages,
      config: homepage?.portalConfig || {},
    })
  } catch (error) {
    console.error("Portal GET error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

const portalConfigSchema = z.object({
  businessName: z.string().optional(),
  logoUrl: z.string().optional(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
  }).optional(),
  font: z.string().optional(),
  contact: z.object({
    phone: z.string(),
    email: z.string(),
    address: z.string(),
    hours: z.string(),
  }).optional(),
  social: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string(),
  }).optional(),
  published: z.boolean().optional(),
})

export async function PUT(req: NextRequest) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = portalConfigSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const tenantId = auth.tenant.id

    // Find or create homepage
    let [homepage] = await db
      .select()
      .from(portalPages)
      .where(and(eq(portalPages.tenantId, tenantId), eq(portalPages.isHomepage, true)))
      .limit(1)

    if (!homepage) {
      const [created] = await db
        .insert(portalPages)
        .values({
          tenantId,
          title: parsed.data.businessName || auth.tenant.name,
          slug: "home",
          isHomepage: true,
          sections: getDefaultSections(auth.tenant),
          portalConfig: parsed.data,
        })
        .returning()
      homepage = created
    } else {
      await db
        .update(portalPages)
        .set({
          portalConfig: parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(portalPages.id, homepage.id))
    }

    return NextResponse.json({ success: true, portal: homepage })
  } catch (error) {
    console.error("Portal PUT error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

function getDefaultSections(tenant: any) {
  const config = tenant.config as Record<string, any>
  return [
    {
      id: crypto.randomUUID(),
      type: "hero",
      visible: true,
      order: 0,
      data: {
        headline: tenant.name,
        subheadline: config?.medical?.specialty || "Especialista en salud",
        ctaText: "Agendar Cita",
        ctaLink: "#contact",
        overlay_opacity: 0.4,
      },
    },
    {
      id: crypto.randomUUID(),
      type: "about",
      visible: true,
      order: 1,
      data: {
        title: "Sobre el Doctor",
        description: `Bienvenido al consultorio de ${tenant.name}. Ofrecemos atencion medica de calidad con un enfoque personalizado para cada paciente.`,
        specialties: config?.medical?.specialty ? [config.medical.specialty] : [],
        education: [],
        certifications: [],
      },
    },
    {
      id: crypto.randomUUID(),
      type: "services",
      visible: true,
      order: 2,
      data: {
        title: "Nuestros Servicios",
        subtitle: "Atencion integral para su salud",
        items: [
          { name: "Consulta General", description: "Evaluacion medica completa", icon: "stethoscope" },
          { name: "Diagnostico", description: "Estudios y analisis especializados", icon: "search" },
          { name: "Tratamiento", description: "Plan de tratamiento personalizado", icon: "heart" },
          { name: "Seguimiento", description: "Control y seguimiento continuo", icon: "calendar" },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      type: "contact",
      visible: true,
      order: 3,
      data: {
        title: "Contacto",
        phone: config?.contact?.phone || "",
        email: config?.contact?.email || "",
        address: config?.contact?.address || "",
        whatsapp_link: config?.contact?.whatsapp ? `https://wa.me/${config.contact.whatsapp.replace(/\D/g, "")}` : "",
      },
    },
    {
      id: crypto.randomUUID(),
      type: "cta",
      visible: true,
      order: 4,
      data: {
        title: "Agende su cita hoy",
        subtitle: "Estamos listos para atenderle",
        buttonText: "Agendar por WhatsApp",
        buttonLink: config?.contact?.whatsapp ? `https://wa.me/${config.contact.whatsapp.replace(/\D/g, "")}` : "#",
        backgroundColor: "blue-600",
      },
    },
  ]
}
