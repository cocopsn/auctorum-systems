import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

// Public paths that do NOT require authentication
const PUBLIC_PATHS = new Set(['/login', '/', '/api'])

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/_next')) return true
  if (/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/.test(pathname)) return true
  return false
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const url = request.nextUrl.clone()
  const realOrigin = host.includes('localhost') ? `http://${host}` : `https://${host || 'auctorum.com.mx'}`

  // Skip static/public/api routes
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Extract subdomain
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

  // Redirect /dashboard to /agenda
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL('/agenda', realOrigin))
  }

  // ALL non-public paths require auth — create Supabase client to check session
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
          const opts = withAuthCookieDomain(options ?? {}, host)
          request.cookies.set({ name, value, ...opts })
          response.cookies.set({ name, value, ...opts })
        },
        remove(name: string, options: Record<string, unknown>) {
          const opts = withAuthCookieDomain(options ?? {}, host)
          request.cookies.set({ name, value: '', ...opts })
          response.cookies.set({ name, value: '', ...opts })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/login', realOrigin))
  }

  // Portal routes — rewrite to [slug] dynamic route
  if (slug) {
    response.headers.set('x-tenant-slug', slug)

    // Check if this is a portal public route (not a dashboard route)
    // Dashboard routes are handled normally; portal routes need rewrite
    const dashboardRoutes = ['/citas', '/pacientes', '/horarios', '/notas', '/settings',
      '/agenda', '/ai-settings', '/portal', '/integrations', '/conversaciones',
      '/recordatorios', '/funnel', '/reports', '/follow-ups', '/budgets',
      '/payments', '/invoices', '/campaigns', '/notas']
    const isDashboard = dashboardRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))

    if (!isDashboard) {
      url.pathname = `/${slug}${pathname}`
      const internalUrl = url.toString().replace(/^https:/, 'http:')
      const rewriteResponse = NextResponse.rewrite(internalUrl)
      rewriteResponse.headers.set('x-tenant-slug', slug)
      return rewriteResponse
    }
  }

  if (slug) response.headers.set('x-tenant-slug', slug)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
