import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const host = request.headers.get('host') || 'auctorum.com.mx'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const realOrigin = protocol + '://' + host

  if (!code) {
    return NextResponse.redirect(realOrigin + '/login?error=missing_code')
  }

  const response = NextResponse.redirect(realOrigin + '/dashboard')
  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...withAuthCookieDomain(options ?? {}, host) })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...withAuthCookieDomain(options ?? {}, host) })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Auth callback error:', error.message)
    return NextResponse.redirect(realOrigin + '/login?error=invalid_code')
  }

  return response
}
