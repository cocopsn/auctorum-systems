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
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...withAuthCookieDomain(options ?? {}, host) })
            })
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This can be safely ignored if middleware
            // refreshes the session.
          }
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
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = withAuthCookieDomain(options ?? {}, host)
            request.cookies.set({ name, value, ...opts })
            response.cookies.set({ name, value, ...opts })
          })
        },
      },
    }
  )
}
