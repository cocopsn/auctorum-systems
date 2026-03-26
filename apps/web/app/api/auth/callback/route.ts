import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase-server';

// GET /api/auth/callback
// Exchanges the one-time code from Supabase magic-link email for a session,
// then redirects the user to /dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const supabase = createAnonClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=invalid_code`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error) {
    console.error('Auth callback unexpected error:', error);
    return NextResponse.redirect(`${origin}/login?error=server_error`);
  }
}
