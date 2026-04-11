export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';

// GET /api/dashboard/settings/security
// Returns 2FA status for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await db.execute(
      sql`SELECT two_factor_enabled, two_factor_verified_at FROM users WHERE id = ${auth.user.id}`
    );

    const [row] = result as any[];

    if (!row) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      twoFactorEnabled: row.two_factor_enabled ?? false,
      verifiedAt: row.two_factor_verified_at ?? null,
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuracion de seguridad' },
      { status: 500 }
    );
  }
}
