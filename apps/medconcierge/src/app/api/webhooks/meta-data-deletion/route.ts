import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { db, dataDeletionRequests } from '@quote-engine/db';

/**
 * Meta Data Deletion Callback — receives a signed deletion request from
 * Meta, verifies the HMAC, persists a `data_deletion_requests` row
 * scheduled 20 calendar days out (LFPDPPP Art. 32 + Meta Platform Policy
 * spec window), and returns Meta the URL+confirmation_code Meta requires.
 *
 * The actual purge is done by scripts/cron-data-deletion.ts on the
 * scheduled date — it deletes:
 *   - messages whose conversation's externalId matches the meta user_id
 *   - the conversations themselves
 *   - patient files / attachments associated with those conversations
 *   - patient row IF orphaned after the above
 *
 * Pre-2026-05-11 this endpoint returned a UUID confirmation_code that
 * resolved to nothing — Meta got a 200 but no purge happened. Violated
 * Meta Platform Policy + LFPDPPP both. Fixed by inserting the row that
 * the cron drains.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const signedRequest = body.signed_request;
    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    // Meta sends: base64url(sig).base64url(payload)
    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid signed_request format' }, { status: 400 });
    }

    const [encodedSig, payload] = [parts[0], parts[1]];

    // Verify HMAC signature
    const expectedSig = createHmac('sha256', process.env.WHATSAPP_APP_SECRET || '')
      .update(payload)
      .digest('base64url');
    if (encodedSig !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    let data: { user_id?: string };
    try {
      data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const userId = data.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id in payload' }, { status: 400 });
    }

    // Schedule the actual purge 20 days out — that's the LFPDPPP Art. 32
    // window for ARCO requests; Meta accepts anything < 90 days. Using
    // a fixed offset means the cron picks it up on the appropriate day.
    const scheduledFor = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

    const [row] = await db
      .insert(dataDeletionRequests)
      .values({
        source: 'meta',
        externalUserId: userId,
        status: 'pending',
        scheduledFor,
        metadata: { received_at: new Date().toISOString() },
      })
      .returning({ id: dataDeletionRequests.id });

    console.log(
      `[Meta Data Deletion] queued user=${userId} request_id=${row.id} scheduled_for=${scheduledFor.toISOString()}`,
    );

    // Meta expects this exact response shape — `url` should lead the user
    // to a status page they can poll, `confirmation_code` is the human-
    // readable handle they can quote when contacting support.
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx';
    return NextResponse.json({
      url: `https://${appDomain}/data-deletion?code=${row.id}`,
      confirmation_code: row.id,
    });
  } catch (err) {
    console.error('[Meta Data Deletion] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
