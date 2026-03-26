import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, products, tenants } from '@quote-engine/db';
import { eq, and, asc } from 'drizzle-orm';

const createProductSchema = z.object({
  tenantSlug: z.string().min(1).max(63),
  name: z.string().min(1, 'Nombre requerido').max(255),
  sku: z.string().max(100).optional().or(z.literal('')),
  unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Precio inválido'),
  unitType: z.string().max(50).default('pieza'),
  category: z.string().max(100).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

// GET /api/products?tenant=slug
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('tenant');

    if (!slug) {
      return NextResponse.json({ error: 'Parámetro tenant requerido' }, { status: 400 });
    }

    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, slug), eq(tenants.isActive, true)))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const tenantProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenant.id), eq(products.isActive, true)))
      .orderBy(asc(products.sortOrder), asc(products.name));

    return NextResponse.json({ success: true, data: tenantProducts });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { tenantSlug, name, sku, unitPrice, unitType, category, description } = parsed.data;

    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.isActive, true)))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const [created] = await db
      .insert(products)
      .values({
        tenantId: tenant.id,
        name,
        sku: sku || null,
        unitPrice,
        unitType: unitType || 'pieza',
        category: category || null,
        description: description || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
