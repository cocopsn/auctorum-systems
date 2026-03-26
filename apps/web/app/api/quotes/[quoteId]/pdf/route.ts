import { NextRequest, NextResponse } from 'next/server';
import { db, quotes, quoteItems, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { generateQuotePDF } from '@quote-engine/pdf';
import type { TenantConfig } from '@quote-engine/db';

type RouteContext = { params: { quoteId: string } };

// GET /api/quotes/[quoteId]/pdf
// Generates a PDF for the quote on the fly and streams it to the client.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { quoteId } = params;

    // Fetch quote
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Fetch tenant for branding
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, quote.tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    // Fetch items
    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    const config = tenant.config as TenantConfig;

    // Generate PDF buffer
    const pdfBuffer = await generateQuotePDF({
      tenant,
      config,
      quote,
      items: items.map((i: any) => ({
        productId: i.productId ?? undefined,
        productName: i.productName,
        productSku: i.productSku ?? undefined,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitType: i.unitType ?? undefined,
        lineTotal: i.lineTotal,
      })),
    });

    const filename = `cotizacion-${String(quote.quoteNumber).padStart(4, '0')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('GET /api/quotes/[quoteId]/pdf error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
