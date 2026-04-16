export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { runPlayground } from '@quote-engine/ai';
import { getAuthTenant } from '@/lib/auth';

export async function POST(request: NextRequest) {
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
