
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { getPaymentProvider } from '@quote-engine/payments';
import { validateOrigin } from '@/lib/csrf'

export async function POST() {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const provider = getPaymentProvider(auth.tenant);
    if (!provider) {
      return NextResponse.json({
        success: true,
        data: { valid: false, provider: 'manual', error: 'No payment provider configured' },
      });
    }

    const result = await provider.verifyConnection();
    return NextResponse.json({
      success: true,
      data: { ...result, provider: provider.name },
    });
  } catch (err) {
    console.error('[verify-payment]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
