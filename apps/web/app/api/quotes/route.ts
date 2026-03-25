import { NextRequest, NextResponse } from 'next/server';
import { db, tenants, products, quotes, quoteItems } from '@quote-engine/db';
import { eq, inArray } from 'drizzle-orm';
import type { TenantConfig, Product } from '@quote-engine/db';
import { generateQuotePDF } from '@quote-engine/pdf';
import { sendWhatsAppQuote } from '@quote-engine/notifications/whatsapp';
import { sendEmailQuote } from '@quote-engine/notifications/email';

// ============================================================
// POST /api/quotes
// Creates a quote, generates PDF, sends via WhatsApp + email
// This is the CORE endpoint of the entire SaaS
// ============================================================

interface QuoteRequest {
  tenantSlug: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientCompany: string;
  items: Array<{ id: string; qty: number }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();

    // 1. Validate tenant
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, body.tenantSlug))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const config = tenant.config as TenantConfig;

    // 2. Fetch products for the quote
    const productIds = body.items.map(i => i.id);
    const tenantProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    if (tenantProducts.length === 0) {
      return NextResponse.json({ error: 'No se encontraron productos' }, { status: 400 });
    }

    // 3. Build quote items with calculated totals
    const itemsWithTotals = body.items.map(item => {
      const product = tenantProducts.find((p: Product) => p.id === item.id);
      if (!product) return null;
      const unitPrice = parseFloat(product.unitPrice);
      const lineTotal = unitPrice * item.qty;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.qty.toString(),
        unitPrice: product.unitPrice,
        unitType: product.unitType,
        lineTotal: lineTotal.toFixed(2),
      };
    }).filter(Boolean);

    // 4. Calculate totals
    const subtotal = itemsWithTotals.reduce((sum, item) => sum + parseFloat(item!.lineTotal), 0);
    const taxRate = config.quote_settings.tax_rate;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // 5. Insert quote + items in a transaction
    const [quote] = await db.insert(quotes).values({
      tenantId: tenant.id,
      clientName: body.clientName,
      clientEmail: body.clientEmail || null,
      clientPhone: body.clientPhone,
      clientCompany: body.clientCompany,
      subtotal: subtotal.toFixed(2),
      taxRate: taxRate.toFixed(4),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      status: 'generated',
    }).returning();

    // Insert quote items
    for (const item of itemsWithTotals) {
      if (!item) continue;
      await db.insert(quoteItems).values({
        quoteId: quote.id,
        ...item,
      });
    }

    // 6. Generate PDF
    const pdfBuffer = await generateQuotePDF({
      tenant,
      config,
      quote,
      items: itemsWithTotals.filter(Boolean) as any[],
    });

    // TODO: Upload PDF to Supabase Storage and get public URL
    const pdfUrl = `/api/pdf/${quote.id}`;

    // Update quote with PDF URL
    await db.update(quotes)
      .set({ pdfUrl, status: 'sent', sentAt: new Date() })
      .where(eq(quotes.id, quote.id));

    // 7. Send notifications (fire and forget — don't block response)
    Promise.allSettled([
      sendWhatsAppQuote({
        to: body.clientPhone,
        tenantName: tenant.name,
        quoteNumber: quote.quoteNumber,
        total: total,
        pdfUrl,
        config,
      }),
      // Also notify the provider
      config.contact.whatsapp && sendWhatsAppQuote({
        to: config.contact.whatsapp,
        tenantName: tenant.name,
        quoteNumber: quote.quoteNumber,
        total: total,
        pdfUrl,
        config,
        isProviderNotification: true,
        clientName: body.clientName,
        clientCompany: body.clientCompany,
      }),
      body.clientEmail && sendEmailQuote({
        to: body.clientEmail,
        tenantName: tenant.name,
        quoteNumber: quote.quoteNumber,
        total,
        pdfBuffer,
        config,
      }),
    ]).catch(console.error);

    // 8. Return success
    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      pdfUrl,
      total,
    });
  } catch (error: any) {
    console.error('Quote creation error:', error);
    return NextResponse.json(
      { error: 'Error interno al generar cotización' },
      { status: 500 }
    );
  }
}
