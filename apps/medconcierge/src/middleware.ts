import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

const DASHBOARD_ROUTES = [
  '/citas', '/pacientes', '/horarios', '/notas', '/settings',
  '/agenda', '/ai-settings', '/portal', '/integrations', '/conversaciones',
  '/recordatorios', '/funnel', '/reports', '/follow-ups', '/budgets',
  '/payments', '/invoices', '/campaigns', '/dashboard',
]

function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

function isStaticOrApi(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname === '/api') return true
  if (/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff2?)$/.test(pathname)) return true
  return false
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const realOrigin = host.includes('localhost')
    ? `http://${host}`
    : `https://${host || 'auctorum.com.mx'}`

  // 1. Skip static assets and API routes
  if (isStaticOrApi(pathname)) return NextResponse.next()

  // 2. Portal rewrite pass-through: if this is an internal rewritten request, let it through
  if (request.nextUrl.searchParams.get('_portal') === '1') {
    const response = NextResponse.next()
    const slugFromPath = pathname.split('/')[1]
    if (slugFromPath) response.headers.set('x-tenant-slug', slugFromPath)
    return response
  }

  // 3. Extract subdomain slug
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
      if (sub && sub !== 'www') slug = sub
    }
  }

  // 4. /login always public
  if (pathname === '/login') return NextResponse.next()

  // 5. Portal routes: subdomain + non-dashboard path -> rewrite with marker
  if (slug && !isDashboardRoute(pathname)) {
    const portalPath = pathname === '/' ? `/${slug}` : `/${slug}${pathname}`
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = portalPath
    rewriteUrl.searchParams.set('_portal', '1')
    const response = NextResponse.rewrite(rewriteUrl)
    response.headers.set('x-tenant-slug', slug)
    return response
  }

  // 6. /dashboard redirect
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL('/agenda', realOrigin))
  }

  // 7. Dashboard routes - require auth
  const response = NextResponse.next()

  let session = null
  try {
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
    const { data } = await supabase.auth.getSession()
    session = data?.session
  } catch (err) {
    console.error('Middleware getSession error (clearing cookies):', err instanceof Error ? err.message : err)
    const clearResponse = NextResponse.redirect(new URL('/login', realOrigin))
    const cookieDomain = host.includes('localhost') ? undefined : `.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx'}`
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.includes('auth-token')) {
        clearResponse.cookies.set({
          name: cookie.name,
          value: '',
          maxAge: 0,
          path: '/',
          ...(cookieDomain ? { domain: cookieDomain } : {}),
        })
      }
    }
    return clearResponse
  }

  if (!session) return NextResponse.redirect(new URL('/login', realOrigin))
  if (slug) response.headers.set('x-tenant-slug', slug)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
