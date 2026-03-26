import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, users } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { createServerClient } from '@/lib/supabase-server';

// TODO: Add rate limiting (e.g., upstash/ratelimit) — max 5 magic links per email per hour
// to prevent abuse. Check IP + email combination before calling Supabase.

const magicLinkSchema = z.object({
  email: z.string().email('Correo electrónico inválido').max(255),
});

// POST /api/auth/magic-link
// Validates the email, checks that a user record exists in the DB,
// and sends a Supabase magic link to the given address.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = magicLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Verify the user exists in our users table before sending a magic link.
    // This prevents login attempts for emails that were never registered.
    const [existingUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser) {
      // Return generic success to avoid leaking whether an email is registered.
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctorum.com.mx'}/api/auth/callback`;

    const { error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });

    if (error) {
      console.error('Magic link send error:', error.message);
      return NextResponse.json(
        { error: 'Error al enviar el enlace de acceso' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Magic link route error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
