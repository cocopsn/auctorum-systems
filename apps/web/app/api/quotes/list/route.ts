import { NextRequest, NextResponse } from 'next/server';
import { db, quotes, tenants } from '@quote-engine/db';
import { eq, desc, and, count, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getAuthTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/quotes/list
// Returns all quotes for the current tenant (resolved from x-tenant-slug header
// or from the ?tenant=slug query param for client-side calls).
//
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let slug = searchParams.get('tenant');

    // Fallback: read from header (set by middleware for subdomains)
    if (!slug) {
      const headersList = await headers();
      slug = headersList.get('x-tenant-slug');
    }

    let tenantId: string | null = auth.tenant.id;

    if (slug) {
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.slug, slug), eq(tenants.isActive, true)))
        .limit(1);
      if (!tenant || tenant.id !== auth.tenant.id) {
        return NextResponse.json({ error: 'No autorizado para este tenant' }, { status: 403 });
      }
      tenantId = tenant.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const whereCondition = and(eq(quotes.tenantId, tenantId), isNull(quotes.deletedAt));

    const [totalResult] = await db
      .select({ count: count() })
      .from(quotes)
      .where(whereCondition);

    const total = totalResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const allQuotes = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        clientName: quotes.clientName,
        clientCompany: quotes.clientCompany,
        total: quotes.total,
        status: quotes.status,
        createdAt: quotes.createdAt,
        pdfUrl: quotes.pdfUrl,
      })
      .from(quotes)
      .where(whereCondition)
      .orderBy(desc(quotes.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: allQuotes,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    console.error('GET /api/quotes/list error:', error);
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 });
  }
}
