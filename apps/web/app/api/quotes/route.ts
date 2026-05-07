import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, tenants, products, quotes, quoteItems, quoteEvents, clients, users, type Product } from '@quote-engine/db';
import { eq, inArray, and, isNull, sql, asc } from 'drizzle-orm';
import type { TenantConfig } from '@quote-engine/db';
import { generateQuotePDF } from '@quote-engine/pdf';
import { sendWhatsAppQuote } from '@quote-engine/notifications/whatsapp';
import { sendEmailQuote, sendNewQuoteAlert } from '@quote-engine/notifications/email';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { apiError } from '@/lib/api-helpers';

// ============================================================
// POST /api/quotes — CORE ENDPOINT
// Validar → Calcular → Insert → PDF → Notify → Upsert Client
//
// SEC-06 AUTH AUDIT: This route is intentionally public — it serves
// the portal quote-generation flow where unauthenticated visitors
// submit quote requests. No auth required. Input is validated via Zod,
// and products are verified against the tenant. This is correct behavior.
// ============================================================

const quoteRequestSchema = z.object({
  tenantSlug: z.string().min(1, 'Tenant requerido').max(63),
  clientName: z.string().min(2, 'Nombre requerido (mín. 2 caracteres)').max(255),
  clientEmail: z.string().email('Correo inválido').max(255).optional().or(z.literal('')),
  clientPhone: z.string().min(7, 'Teléfono requerido (mín. 7 dígitos)').max(20),
  clientCompany: z.string().min(2, 'Empresa requerida').max(255),
  items: z.array(z.object({
    id: z.string().uuid('ID de producto inválido'),
    qty: z.number().positive('Cantidad debe ser positiva').max(99999),
  })).min(1, 'Debe incluir al menos un producto').max(50),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 req/min per IP
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const { success: rateLimitOk } = await rateLimit(`quotes:${ip}`, 10, 60_000);
    if (!rateLimitOk) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 1. Validate input with zod
    const body = sanitizeObject(await request.json());
    const parsed = quoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 2. Validate tenant
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant || !tenant.isActive) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const config = tenant.config as TenantConfig;

    // 3. Fetch and validate products belong to this tenant
    const productIds = data.items.map(i => i.id);
    const tenantProducts: Product[] = await db
      .select()
      .from(products)
      .where(and(
        inArray(products.id, productIds),
        eq(products.tenantId, tenant.id),
        eq(products.isActive, true),
        isNull(products.deletedAt)
      ));

    if (tenantProducts.length === 0) {
      return NextResponse.json({ error: 'No se encontraron productos válidos' }, { status: 400 });
    }

    // 4. Build quote items — SERVER-SIDE calculation (NEVER trust frontend)
    interface QuoteItemCalc {
      productId: string;
      productName: string;
      productSku: string | null;
      quantity: string;
      unitPrice: string;
      unitType: string | null;
      lineTotal: string;
    }

    const itemsWithTotals: QuoteItemCalc[] = data.items
      .map(item => {
        const product = tenantProducts.find(p => p.id === item.id);
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
      })
      .filter((item): item is QuoteItemCalc => item !== null);

    // 5. Calculate totals (safe defaults if quote_settings missing)
    const subtotal = itemsWithTotals.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
    const taxRate = config.quote_settings?.tax_rate ?? 0.16;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // 6. Generate tracking token and expiration
    const trackingToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (config.quote_settings?.validity_days ?? 15));

    // 7. Insert quote + items (wrapped in transaction)
    const quote = await db.transaction(async (tx) => {
      // Atomically increment the tenant's per-tenant quote counter.
      // UPDATE ... RETURNING is race-safe: concurrent transactions see
      // distinct returned values.
      const [seqRow] = await tx
        .update(tenants)
        .set({ quoteSequence: sql`${tenants.quoteSequence} + 1` })
        .where(eq(tenants.id, tenant.id))
        .returning({ seq: tenants.quoteSequence });

      const [newQuote] = await tx.insert(quotes).values({
        tenantId: tenant.id,
        tenantSeq: seqRow.seq,
        trackingToken,
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone,
        clientCompany: data.clientCompany,
        subtotal: subtotal.toFixed(2),
        taxRate: taxRate.toFixed(4),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        status: 'generated',
        expiresAt,
      }).returning();

      for (const item of itemsWithTotals) {
        await tx.insert(quoteItems).values({
          quoteId: newQuote.id,
          ...item,
        });
      }

      // 8. Record quote_event: created
      await tx.insert(quoteEvents).values({
        quoteId: newQuote.id,
        tenantId: tenant.id,
        eventType: 'created',
        metadata: { itemCount: itemsWithTotals.length, total },
      });

      return newQuote;
    });

    // 9. Upsert client (CRM involuntario — Paso 13)
    const cleanPhone = data.clientPhone.replace(/\D/g, '');
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.tenantId, tenant.id),
        eq(clients.phone, cleanPhone),
        isNull(clients.deletedAt)
      ))
      .limit(1);

    if (existingClient) {
      await db.update(clients)
        .set({
          name: data.clientName,
          email: data.clientEmail || existingClient.email,
          company: data.clientCompany,
          totalQuotes: (existingClient.totalQuotes || 0) + 1,
          totalQuotedAmount: ((parseFloat(existingClient.totalQuotedAmount || '0')) + total).toFixed(2),
          lastQuoteAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clients.id, existingClient.id));
    } else {
      await db.insert(clients).values({
        tenantId: tenant.id,
        name: data.clientName,
        email: data.clientEmail || null,
        phone: cleanPhone,
        company: data.clientCompany,
        totalQuotes: 1,
        totalQuotedAmount: total.toFixed(2),
        lastQuoteAt: new Date(),
      });
    }

    // 10. Generate PDF
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateQuotePDF({
        tenant,
        config,
        quote,
        items: itemsWithTotals,
      });
    } catch (pdfErr) {
      console.error('PDF generation error (non-blocking):', pdfErr);
    }

    // The PDF is rendered on-demand by the signed /api/quotes/[id]/pdf route
    // (HMAC-gated by PDF_SIGNING_SECRET) so we don't pre-upload it to Storage.
    // Email + WhatsApp share the signed URL directly.
    const baseUrl = process.env.NEXT_PUBLIC_APP_DOMAIN
      ? `https://${data.tenantSlug}.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : '';
    const trackingUrl = `${baseUrl}/q/${trackingToken}`;
    const pdfUrl = `/api/quotes/${quote.id}/pdf`;
    // Pixel URL for email open tracking (only when APP_DOMAIN is set,
    // otherwise the pixel img tag is omitted from the email).
    const pixelUrl = baseUrl ? `${baseUrl}/api/t/${trackingToken}` : null;
    // Dashboard CTA for the owner alert email.
    const dashboardUrl = baseUrl ? `${baseUrl}/dashboard/quotes` : '/dashboard/quotes';

    // Resolve tenant owner email: prefer first admin user, fall back to
    // tenant contact email. Skip the alert silently if neither exists.
    const [adminUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.tenantId, tenant.id), eq(users.role, 'admin')))
      .orderBy(asc(users.createdAt))
      .limit(1);
    const ownerEmail = adminUser?.email || config.contact.email || null;

    // Folio for the alert email (matches the PDF route pattern).
    const alertPrefix = config.quote_settings?.auto_number_prefix?.trim() || 'COT';
    const alertFolio = `${alertPrefix}-${String(quote.tenantSeq ?? quote.quoteNumber ?? 0).padStart(4, '0')}`;

    // Update quote with PDF URL and mark as sent
    await db.update(quotes)
      .set({ pdfUrl, status: 'sent', sentAt: new Date() })
      .where(eq(quotes.id, quote.id));

    // Record sent event
    await db.insert(quoteEvents).values({
      quoteId: quote.id,
      tenantId: tenant.id,
      eventType: 'sent',
      metadata: { pdfUrl, trackingUrl },
    });

    // 11. Send notifications (fire and forget)
    Promise.allSettled([
      sendWhatsAppQuote({
        to: data.clientPhone,
        tenantName: tenant.name,
        quoteNumber: quote.quoteNumber,
        total,
        pdfUrl: trackingUrl || pdfUrl,
        config,
      }),
      config.contact.whatsapp && sendWhatsAppQuote({
        to: config.contact.whatsapp,
        tenantName: tenant.name,
        quoteNumber: quote.quoteNumber,
        total,
        pdfUrl: trackingUrl || pdfUrl,
        config,
        isProviderNotification: true,
        clientName: data.clientName,
        clientCompany: data.clientCompany,
      }),
      data.clientEmail && pdfBuffer && sendEmailQuote({
        to: data.clientEmail,
        tenantName: tenant.name,
        quoteNumber: quote.quoteNumber,
        total,
        pdfBuffer,
        config,
        pixelUrl,
      }),
      ownerEmail && sendNewQuoteAlert({
        to: ownerEmail,
        tenantName: tenant.name,
        quoteFolio: alertFolio,
        clientName: data.clientName,
        clientCompany: data.clientCompany,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail || null,
        total,
        dashboardUrl,
        config,
      }),
    ]).catch(console.error);

    // 12. Return success
    return NextResponse.json({
      success: true,
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        trackingToken: quote.trackingToken,
        pdfUrl,
        trackingUrl,
        total,
      },
    });
  } catch (error) {
    console.error('Quote creation error:', error);
    return apiError(500, 'Error interno al generar cotización');
  }
}
