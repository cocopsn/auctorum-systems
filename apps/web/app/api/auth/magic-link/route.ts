import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, users } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';
import { buildPortalUrl } from '@/lib/hosts';

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

    // Rate limit by email: 3/minute per email address
    const { success: emailRlOk } = rateLimit(`magic-link-email:${email.toLowerCase()}`, 3, 60_000);
    if (!emailRlOk) {
      return NextResponse.json({ error: 'Demasiados intentos para este correo. Espera un minuto.' }, { status: 429 });
    }

    const [existingUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ success: true });
    }

    // Use plain createClient (implicit flow) — NOT the SSR client which forces
    // PKCE and depends on code_verifier cookies surviving across the email click.
    // The callback route's implicit handler processes #access_token fragments.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const redirectTo = buildPortalUrl('/api/auth/callback');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
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
