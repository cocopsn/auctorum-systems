import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, quotes, quoteEvents } from '@quote-engine/db';
import { eq } from 'drizzle-orm';

const VALID_EVENT_TYPES = [
  'opened',
  'pdf_downloaded',
  'time_on_page',
  'accepted',
  'rejected',
] as const;

type TrackingEventType = typeof VALID_EVENT_TYPES[number];

const trackingSchema = z.object({
  token: z.string().min(1).max(64),
  eventType: z.enum(VALID_EVENT_TYPES),
  quoteId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// POST /api/tracking
// Records tracking events for a quote identified by its tracking token.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = trackingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, eventType, quoteId: bodyQuoteId, metadata = {} } = parsed.data;

    // Resolve quote — use provided quoteId if available, else look up by token
    let quoteRecord: { id: string; tenantId: string; status: string | null; trackingToken: string | null } | null = null;

    if (bodyQuoteId) {
      const [q] = await db
        .select({ id: quotes.id, tenantId: quotes.tenantId, status: quotes.status, trackingToken: quotes.trackingToken })
        .from(quotes)
        .where(eq(quotes.id, bodyQuoteId))
        .limit(1);
      quoteRecord = q ?? null;
    } else {
      const [q] = await db
        .select({ id: quotes.id, tenantId: quotes.tenantId, status: quotes.status, trackingToken: quotes.trackingToken })
        .from(quotes)
        .where(eq(quotes.trackingToken, token))
        .limit(1);
      quoteRecord = q ?? null;
    }

    // Security: verify the provided token matches the quote's tracking token
    if (quoteRecord && quoteRecord.trackingToken !== token) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 403 });
    }

    if (!quoteRecord) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Insert event
    await db.insert(quoteEvents).values({
      quoteId: quoteRecord.id,
      tenantId: quoteRecord.tenantId,
      eventType,
      metadata: { token, ...metadata },
    });

    // Update quote status on accept/reject
    if (eventType === 'accepted') {
      await db
        .update(quotes)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(eq(quotes.id, quoteRecord.id));
    } else if (eventType === 'rejected') {
      await db
        .update(quotes)
        .set({ status: 'rejected' })
        .where(eq(quotes.id, quoteRecord.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/tracking error:', error);
    return NextResponse.json({ error: 'Error al registrar evento' }, { status: 500 });
  }
}
