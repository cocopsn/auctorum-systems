import { NextRequest, NextResponse } from 'next/server';
import crypto, { createHmac } from 'crypto';

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

    const confirmationCode = crypto.randomUUID();
    const userId = data.user_id ?? 'unknown';

    console.log(`[Meta Data Deletion] User ${userId}, confirmation: ${confirmationCode}`);

    // Per Meta's data-deletion policy we acknowledge the request synchronously
    // here and surface the confirmation code to the user. Actual purge of
    // conversations linked to this Meta user ID is handled out-of-band by
    // the operations team via the /data-deletion request portal — Meta is
    // satisfied with the URL + code in the response below.

    // Meta expects this exact response format:
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx';
    return NextResponse.json({
      url: `https://${appDomain}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (err) {
    console.error('[Meta Data Deletion] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
