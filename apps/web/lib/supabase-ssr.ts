import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { withAuthCookieDomain } from './auth-cookie'

// For use in Server Components, Server Actions, Route Handlers
export function createSupabaseServer() {
  const cookieStore = cookies()
  const host = headers().get('host')
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            const opts = withAuthCookieDomain(options ?? {}, host)
            cookieStore.set({ name, value, ...opts })
          } catch {}
        },
        remove(name: string, options: any) {
          try {
            const opts = withAuthCookieDomain(options ?? {}, host)
            cookieStore.set({ name, value: '', ...opts })
          } catch {}
        },
      },
    }
  )
}

// For use in middleware
export function createSupabaseMiddleware(request: NextRequest, response: NextResponse) {
  const host = request.headers.get('host')
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          const opts = withAuthCookieDomain(options ?? {}, host)
          request.cookies.set({ name, value, ...opts })
          response.cookies.set({ name, value, ...opts })
        },
        remove(name: string, options: any) {
          const opts = withAuthCookieDomain(options ?? {}, host)
          request.cookies.set({ name, value: '', ...opts })
          response.cookies.set({ name, value: '', ...opts })
        },
      },
    }
  )
}
