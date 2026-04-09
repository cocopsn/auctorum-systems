import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // Redirect to /citas as the default dashboard view after login
  const response = NextResponse.redirect(`${origin}/citas`)
  const host = request.headers.get('host')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          const opts = withAuthCookieDomain(options ?? {}, host)
          response.cookies.set({ name, value, ...opts })
        },
        remove(name: string, options: Record<string, unknown>) {
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
