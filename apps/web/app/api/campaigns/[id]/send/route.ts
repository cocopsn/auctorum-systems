export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';
import { getAuthTenant } from '@/lib/auth';

// STUB — campaign send pipeline lives in Checkpoint 5 (WhatsApp integration).
export async function POST(request: NextRequest, _ctx: { params: { id: string } }) {
  try {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  return apiError(501, 'Campaign send pipeline not implemented yet (Checkpoint 5)');

  } catch (err) {
    console.error('[POST]', err instanceof Error ? err.message : err);
    return apiError(500, 'Internal server error');
  }
}
