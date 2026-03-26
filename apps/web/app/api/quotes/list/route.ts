import { NextRequest, NextResponse } from 'next/server';
import { db, quotes, tenants } from '@quote-engine/db';
import { eq, desc, and } from 'drizzle-orm';
import { headers } from 'next/headers';

// GET /api/quotes/list
// Returns all quotes for the current tenant (resolved from x-tenant-slug header
// or from the ?tenant=slug query param for client-side calls).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let slug = searchParams.get('tenant');

    // Fallback: read from header (set by middleware for subdomains)
    if (!slug) {
      const headersList = await headers();
      slug = headersList.get('x-tenant-slug');
    }

    let tenantId: string | null = null;

    if (slug) {
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.slug, slug), eq(tenants.isActive, true)))
        .limit(1);
      tenantId = tenant?.id ?? null;
    } else {
      // Dev fallback: use the first tenant
      const [first] = await db.select({ id: tenants.id }).from(tenants).limit(1);
      tenantId = first?.id ?? null;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

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
      .where(eq(quotes.tenantId, tenantId))
      .orderBy(desc(quotes.createdAt));

    return NextResponse.json({ success: true, data: allQuotes });
  } catch (error) {
    console.error('GET /api/quotes/list error:', error);
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 });
  }
}
