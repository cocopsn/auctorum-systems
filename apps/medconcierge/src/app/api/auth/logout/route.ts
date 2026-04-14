import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

export async function POST(request: NextRequest) {
  try {
  const host = request.headers.get('host') || 'auctorum.com.mx'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const realOrigin = protocol + '://' + host

  const response = NextResponse.redirect(realOrigin + '/login')
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
  await supabase.auth.signOut()
  return response

  } catch (err) {
    console.error('[POST]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
