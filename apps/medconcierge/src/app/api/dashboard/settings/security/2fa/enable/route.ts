export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Base32 encoder (RFC 4648) — no external library
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  // Add padding to make length a multiple of 8
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

// ---------------------------------------------------------------------------
// POST /api/dashboard/settings/security/2fa/enable
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get user email for the otpauth URI
    const userResult = await db.execute(
      sql`SELECT email FROM users WHERE id = ${auth.user.id}`
    );
    const [userRow] = userResult as any[];
    if (!userRow) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const email = userRow.email as string;

    // Generate a random 20-byte hex secret
    const secretHex = crypto.randomBytes(20).toString('hex');
    const secretBuffer = Buffer.from(secretHex, 'hex');
    const base32Secret = base32Encode(secretBuffer);

    // Store the hex secret in the database (NOT yet verified)
    await db.execute(
      sql`UPDATE users SET two_factor_secret = ${secretHex}, updated_at = NOW() WHERE id = ${auth.user.id}`
    );

    // Build the otpauth URI
    const otpauthUri = `otpauth://totp/Auctorum:${encodeURIComponent(email)}?secret=${base32Secret}&issuer=Auctorum`;

    return NextResponse.json({
      secret: base32Secret,
      otpauthUri,
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return NextResponse.json(
      { error: 'Error al activar 2FA' },
      { status: 500 }
    );
  }
}
