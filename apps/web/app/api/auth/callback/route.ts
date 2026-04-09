import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

// GET /api/auth/callback
// Exchanges the one-time code from Supabase magic-link email for a session,
// sets auth cookies, then redirects the user to /dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const response = NextResponse.redirect(`${origin}/dashboard`)
  const host = request.headers.get('host')

  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          const opts = withAuthCookieDomain(options ?? {}, host)
          response.cookies.set({ name, value, ...opts })
        },
        remove(name: string, options: any) {
          const opts = withAuthCookieDomain(options ?? {}, host)
          response.cookies.set({ name, value: '', ...opts })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Auth callback error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=invalid_code`)
  }

  return response
}
