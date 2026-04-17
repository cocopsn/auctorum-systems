export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-helpers';
import { getAuthTenant } from '@/lib/auth';

// STUB — PDF report generation lives in Checkpoint 4 (Dashboard UI).
export async function GET() {
  try {
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');
    return apiError(501, 'PDF report generation not implemented yet (Checkpoint 4)');


  } catch (error) {
    console.error('/api/reports/pdf GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
