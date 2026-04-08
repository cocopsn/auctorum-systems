import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_ROUTES = ['/citas', '/pacientes', '/horarios', '/notas', '/settings', '/agenda', '/ai-settings']

// Check if pathname matches a protected route (exact segment match, not just prefix)
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const url = request.nextUrl.clone()

  // Skip static/public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/login' ||
    pathname.match(/\.(ico|png|jpg|svg)$/)
  ) {
    return NextResponse.next()
  }

  // Extract subdomain
  // Production: dra-martinez.auctorum.com.mx
  // Dev: dra-martinez.localhost:3000
  let slug: string | null = null

  if (host.includes('localhost')) {
    const parts = host.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      slug = parts[0]
    }
  } else {
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx'
    if (host.endsWith(appDomain)) {
      const sub = host.replace(`.${appDomain}`, '')
      if (sub && sub !== 'www') {
        slug = sub
      }
    }
  }

  // Protect dashboard routes — require auth session
  if (isProtectedRoute(pathname)) {
    const response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value: '', ...options })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (slug) response.headers.set('x-tenant-slug', slug)
    return response
  }

  // Redirect /dashboard to /agenda (med app uses route group, not /dashboard prefix)
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL('/agenda', request.url))
  }

  // API routes — pass tenant header through
  if (url.pathname.startsWith('/api')) {
    const response = NextResponse.next()
    if (slug) {
      response.headers.set('x-tenant-slug', slug)
    }
    return response
  }

  // Portal routes — rewrite to [slug] dynamic route
  if (slug) {
    const response = NextResponse.rewrite(
      new URL(`/${slug}${url.pathname}`, request.url)
    )
    response.headers.set('x-tenant-slug', slug)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
