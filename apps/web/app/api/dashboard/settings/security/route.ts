export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, users } from '@quote-engine/db';
import { eq } from 'drizzle-orm';

// GET /api/dashboard/settings/security
export async function GET() {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [row] = await db
      .select({
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorVerifiedAt: users.twoFactorVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);

    return NextResponse.json({
      twoFactorEnabled: row?.twoFactorEnabled ?? false,
      verifiedAt: row?.twoFactorVerifiedAt ?? null,
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuracion de seguridad' },
      { status: 500 }
    );
  }
}
