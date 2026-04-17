import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, products, tenants } from '@quote-engine/db';
import { eq, and, asc, count, isNull } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { apiError } from '@/lib/api-helpers';
import { getAuthTenant } from '@/lib/auth';

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
// SEC-06 AUTH AUDIT: GET is public-facing (serves product catalog for portal).
// No auth required for reading active products — this is intentional.
export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 30 req/min
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const { success: rateLimitOk } = rateLimit(`products:${ip}`, 30, 60_000);
    if (!rateLimitOk) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

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

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const whereCondition = and(eq(products.tenantId, tenant.id), eq(products.isActive, true), isNull(products.deletedAt));

    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(whereCondition);

    const total = totalResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const tenantProducts = await db
      .select()
      .from(products)
      .where(whereCondition)
      .orderBy(asc(products.sortOrder), asc(products.name))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: tenantProducts,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return apiError(500, 'Error al obtener productos');
  }
}

// POST /api/products
// SEC-06 AUTH AUDIT: Requires authenticated user who belongs to the target tenant.
export async function POST(request: NextRequest) {
  try {
    // CSRF: validate origin for state-changing requests
    if (!validateOrigin(request)) {
      return Response.json({ error: 'Invalid origin' }, { status: 403 });
    }

    // Verify authenticated user
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const user = auth.user;

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

    // Verify user belongs to the target tenant
    if (user.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'No autorizado para este tenant' }, { status: 403 });
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
    return apiError(500, 'Error al crear producto');
  }
}
