import { NextRequest, NextResponse } from 'next/server';
import { db, quotes, quoteItems, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { generateQuotePDF } from '@quote-engine/pdf';
import type { TenantConfig } from '@quote-engine/db';
import crypto from 'crypto';

type RouteContext = { params: { quoteId: string } };

function verifyPdfSignature(quoteId: string, sig: string | null): boolean {
  if (!sig) return false;
  const secret = process.env.PDF_SIGNING_SECRET || 'auctorum-pdf-secret';
  const dayKey = Math.floor(Date.now() / 86400000).toString();
  const expected = crypto.createHmac('sha256', secret).update(quoteId + ':' + dayKey).digest('hex').substring(0, 16);
  // Also check yesterday's key for timezone edge cases
  const yesterdayKey = (Math.floor(Date.now() / 86400000) - 1).toString();
  const expectedYesterday = crypto.createHmac('sha256', secret).update(quoteId + ':' + yesterdayKey).digest('hex').substring(0, 16);
  return sig === expected || sig === expectedYesterday;
}

function generatePdfSignature(quoteId: string): string {
  const secret = process.env.PDF_SIGNING_SECRET || 'auctorum-pdf-secret';
  const dayKey = Math.floor(Date.now() / 86400000).toString();
  return crypto.createHmac('sha256', secret).update(quoteId + ':' + dayKey).digest('hex').substring(0, 16);
}

// Fetches a tenant-provided logo URL and returns it as a base64 data URL
// suitable for @react-pdf/renderer <Image src=...>. 5s timeout; any error
// (network, non-200, timeout) returns null so the PDF still renders.
async function fetchLogoBase64(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[pdf] logo fetch failed', err);
    return null;
  }
}

// GET /api/quotes/[quoteId]/pdf
// Generates a PDF for the quote on the fly and streams it to the client.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { quoteId } = params;

    // Verify signature before any DB query
    const { searchParams } = new URL(_request.url);
    const sig = searchParams.get('sig');
    if (!verifyPdfSignature(quoteId, sig)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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

    // Resolve branding: logo (best-effort) and folio (prefix + padded tenant seq).
    const logoBase64 = await fetchLogoBase64(tenant.logoUrl);
    const prefix = config.quote_settings?.auto_number_prefix?.trim() || 'COT';
    const seqNumber = quote.tenantSeq ?? quote.quoteNumber;
    const folio = `${prefix}-${String(seqNumber ?? 0).padStart(4, '0')}`;

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
      logoBase64,
      folio,
    });

    const filename = `cotizacion-${folio}.pdf`;

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