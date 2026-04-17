import { NextRequest, NextResponse } from 'next/server';
import { db, quotes, quoteEvents } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

// ============================================================
// GET /api/t/[token] — Email open tracking pixel
//
// Returns a 1x1 transparent GIF (43 bytes, GIF89a) and records an
// `opened` event for the quote identified by the tracking token.
// Always returns the pixel, even on lookup or DB errors, so email
// clients never render a broken image.
// ============================================================

// 1x1 transparent GIF (43 bytes, GIF89a)
const TRANSPARENT_GIF = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

function pixelResponse() {
  return new NextResponse(new Uint8Array(TRANSPARENT_GIF), {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token?.slice(0, 64);
    if (!token) return pixelResponse();

    // Rate limit by IP: 60/minute per IP
    const ip = _request.headers.get('x-forwarded-for') ?? 'unknown';
    const { success: rlOk } = rateLimit(`tracking-pixel:${ip}`, 60, 60_000);
    if (!rlOk) return pixelResponse();

    const [quote] = await db
      .select({ id: quotes.id, tenantId: quotes.tenantId })
      .from(quotes)
      .where(eq(quotes.trackingToken, token))
      .limit(1);

    if (quote) {
      await db.insert(quoteEvents).values({
        quoteId: quote.id,
        tenantId: quote.tenantId,
        eventType: 'opened',
        metadata: { source: 'email_pixel' },
      });
    }
  } catch (err) {
    console.error('[pixel] tracking insert failed', err);
  }
  return pixelResponse();
}