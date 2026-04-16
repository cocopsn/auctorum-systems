import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { validateOrigin } from '@/lib/csrf';
import { getAuthTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const tenantConfigSchema = z.object({
  colors: z.object({
    primary: z.string().max(20),
    secondary: z.string().max(20),
    background: z.string().max(20),
  }),
  contact: z.object({
    phone: z.string().max(50).default(''),
    email: z.string().max(255).default(''),
    whatsapp: z.string().max(20).default(''),
    address: z.string().max(500).default(''),
  }),
  business: z.object({
    razon_social: z.string().max(255).default(''),
    rfc: z.string().max(20).default(''),
    giro: z.string().max(255).default(''),
  }),
  quote_settings: z.object({
    currency: z.enum(['MXN', 'USD']).default('MXN'),
    tax_rate: z.number().min(0).max(1).default(0.16),
    validity_days: z.number().int().min(1).max(365).default(15),
    payment_terms: z.string().max(500).default(''),
    delivery_terms: z.string().max(500).default(''),
    custom_footer: z.string().max(1000).default(''),
  }),
  ai: z.any().optional(),
});

const updateSettingsSchema = z.object({
  tenantSlug: z.string().min(1).max(63),
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().max(1000).optional().or(z.literal('')),
  config: tenantConfigSchema.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Parametro slug requerido' }, { status: 400 });
    }
    if (slug !== auth.tenant.slug) {
      return NextResponse.json({ error: 'No autorizado para este tenant' }, { status: 403 });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tenant });
  } catch (error) {
    console.error('GET /api/tenant/settings error:', error);
    return NextResponse.json({ error: 'Error al obtener configuracion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!validateOrigin(request)) {
      return Response.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { tenantSlug, name, logoUrl, config } = parsed.data;
    if (tenantSlug !== auth.tenant.slug) {
      return NextResponse.json({ error: 'No autorizado para este tenant' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (config !== undefined) updateData.config = config;

    const [updated] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.slug, tenantSlug))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/tenant/settings error:', error);
    return NextResponse.json({ error: 'Error al guardar configuracion' }, { status: 500 });
  }
}
