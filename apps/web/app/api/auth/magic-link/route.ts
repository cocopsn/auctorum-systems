import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, users } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { createSupabaseServer } from '@/lib/supabase-ssr';
import { rateLimit } from '@/lib/rate-limit';

const magicLinkSchema = z.object({
  email: z.string().email('Correo electronico invalido').max(255),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const { success: rateLimitOk } = rateLimit(`magic-link:${ip}`, 5, 60_000);
    if (!rateLimitOk) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = magicLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const [existingUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ success: true });
    }

    // Use SSR client (with cookie handlers) so the PKCE code_verifier
    // is persisted in a cookie. The callback route will read it back.
    const supabase = createSupabaseServer();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctorum.com.mx'}/api/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    console.log("Supabase OTP response:", JSON.stringify({ error, email }));
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
