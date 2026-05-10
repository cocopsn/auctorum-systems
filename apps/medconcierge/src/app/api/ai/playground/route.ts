export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { runPlayground } from '@quote-engine/ai';
import { getAuthTenant } from '@/lib/auth';
import { validateOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // CSRF: parallel /api/dashboard/ai/* surface always validates origin —
  // /api/ai/* shipped without it, so a malicious origin could burn an
  // authenticated doctor's OpenAI quota cross-site. Closed 2026-05-10.
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const message = String(body.message ?? '').trim();
  if (!message) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
  try {
    return NextResponse.json({ success: true, data: await runPlayground({ tenant: auth.tenant, userId: auth.user.id, message }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al consultar AI' }, { status: 500 });
  }
}
