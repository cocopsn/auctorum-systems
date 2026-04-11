export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// TOTP verification — same implementation as verify endpoint
// ---------------------------------------------------------------------------

function generateTOTP(secretHex: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const secretBuffer = Buffer.from(secretHex, 'hex');
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1_000_000;
  return otp.toString().padStart(6, '0');
}

function verifyTOTP(secretHex: string, code: string): boolean {
  const timeStep = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  for (let window = -1; window <= 1; window++) {
    const expected = generateTOTP(secretHex, currentCounter + window);
    if (expected === code) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// POST /api/dashboard/settings/security/2fa/disable
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'Debe ser un codigo de 6 digitos'),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Codigo invalido', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { code } = parsed.data;

    // Get the stored secret
    const result = await db.execute(
      sql`SELECT two_factor_secret FROM users WHERE id = ${auth.user.id}`
    );

    const [row] = result as any[];
    if (!row?.two_factor_secret) {
      return NextResponse.json(
        { error: '2FA no esta activo' },
        { status: 400 }
      );
    }

    const secretHex = row.two_factor_secret as string;

    // Verify the TOTP code
    if (!verifyTOTP(secretHex, code)) {
      return NextResponse.json(
        { error: 'Codigo invalido o expirado' },
        { status: 400 }
      );
    }

    // Disable 2FA: clear secret and flags
    await db.execute(
      sql`UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, two_factor_verified_at = NULL, updated_at = NOW() WHERE id = ${auth.user.id}`
    );

    return NextResponse.json({ success: true, message: '2FA desactivado exitosamente' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { error: 'Error al desactivar 2FA' },
      { status: 500 }
    );
  }
}
