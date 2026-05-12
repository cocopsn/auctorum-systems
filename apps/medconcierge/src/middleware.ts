import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

const DASHBOARD_ROUTES = [
  '/citas', '/pacientes', '/horarios', '/notas', '/settings',
  '/agenda', '/ai-settings', '/portal', '/integrations', '/conversaciones',
  '/recordatorios', '/funnel', '/reports', '/reportes', '/follow-ups', '/budgets',
  '/payments', '/invoices', '/campaigns', '/dashboard', '/admin', '/onboarding',
  '/pagos',
  // Newer dashboard surfaces — without these in the list, on a tenant
  // subdomain (`dr-*.auctorum.com.mx`) the middleware rewrites `/leads`
  // to `/<tenant>/leads`, which 404s and renders the user-facing
  // "Application error" overlay.
  '/leads', '/documentos',
]

function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

const LEGAL_ROUTES = ['/privacy', '/terms', '/ai-policy', '/cookies', '/data-deletion']
// Public marketing/payment pages — never rewritten to subdomain or auth-gated.
const PUBLIC_FLAT_ROUTES = ['/pago-exitoso', '/pago-cancelado', '/api-docs']

function isStaticOrApi(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname === '/api') return true
  // PWA: manifest, service worker, icons must be reachable from any host
  // without auth gating, otherwise the browser silently fails to install.
  if (pathname === '/manifest.json' || pathname === '/sw.js') return true
  if (pathname.startsWith('/icons/') || pathname.startsWith('/screenshots/')) return true
  if (/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|json|woff2?)$/.test(pathname)) return true
  return false
}

/** Clear all Supabase cookies from a response to recover from corruption. */
function clearSupabaseCookies(request: NextRequest, response: NextResponse, host: string) {
  const cookieDomain = host.includes('localhost')
    ? undefined
    : `.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx'}`

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
      response.cookies.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })
    }
  }
}

export async function middleware(request: NextRequest) {
  // Global try/catch — the middleware must NEVER throw. A crash here
  // takes down the entire process and triggers PM2 restart loops.
  try {
    return await handleRequest(request)
  } catch (err) {
    console.error(
      '[middleware] ERROR — fail-closed:',
      err instanceof Error ? err.message : err,
    )
    // H-1: Fail-closed — deny access to private routes on error.
    // Public routes (landing, login, agendar, webhooks, health) still pass through.
    const path = request.nextUrl.pathname
    const isPublicRoute = path === '/' || path === '/login' || path === '/reset-password' || path.startsWith('/signup') || path.startsWith('/agendar')
      || LEGAL_ROUTES.includes(path)
      || path.startsWith('/api/wa/') || path.startsWith('/api/health')
      || path.startsWith('/_next') || /\.(ico|png|jpg|svg|css|js|woff2?)$/.test(path)
    if (isPublicRoute) {
      const response = NextResponse.next()
      const host = request.headers.get('host') ?? ''
      clearSupabaseCookies(request, response, host)
      return response
    }
    // Private routes: redirect to login
    const host = request.headers.get('host') ?? ''
    const realOrigin = host.includes('localhost') ? `http://${host}` : `https://${host || 'auctorum.com.mx'}`
    const loginRedirect = NextResponse.redirect(new URL('/login', realOrigin))
    clearSupabaseCookies(request, loginRedirect, host)
    return loginRedirect
  }
}

async function handleRequest(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const realOrigin = host.includes('localhost')
    ? `http://${host}`
    : `https://${host || 'auctorum.com.mx'}`

  // 1. Skip static assets and API routes
  if (isStaticOrApi(pathname)) return NextResponse.next()

  // 2. (Removed: _portal bypass was a security vulnerability)

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
      if (/^(dr|dra|doc)-/.test(sub)) slug = sub
    }
  }

  // 4. /login always public -- but clear stale auth cookies to prevent
  // client-side auto-refresh loops from corrupted tokens
  if (pathname === '/login' || pathname === '/reset-password' || pathname.startsWith('/signup')) {
    const hasAuthCookies = request.cookies.getAll().some(c =>
      c.name.startsWith('sb-') || c.name.includes('auth-token')
    )
    if (hasAuthCookies) {
      const resp = NextResponse.next({ request })
      clearSupabaseCookies(request, resp, host)
      return resp
    }
    return NextResponse.next()
  }

  // 4b. Legal pages — always public (no auth required)
  if (LEGAL_ROUTES.includes(pathname)) return NextResponse.next()
  if (PUBLIC_FLAT_ROUTES.includes(pathname)) return NextResponse.next()

  // 5. Subdomain root → rewrite to the (portal)/[slug] tree so the
  // Portal Builder content actually renders.
  //
  // Pre-2026-05-12 this was a plain NextResponse.next() that hit
  // apps/medconcierge/src/app/page.tsx — a 'use client' splash that
  // SSR-rendered "Auctorum Systems" because window.location is
  // undefined on the server. Result: every tenant's subdomain root
  // showed our marketing splash instead of their portal. Rewriting to
  // /[slug] makes the server component at (portal)/[slug]/page.tsx
  // load the published portal_pages + tenant.config and render the
  // PortalRenderer with the doctor's actual sections.
  if (slug && pathname === '/') {
    const portalPath = `/${slug}`
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.protocol = 'http:'
    rewriteUrl.pathname = portalPath
    rewriteUrl.searchParams.set('_portal', '1')
    const response = NextResponse.rewrite(rewriteUrl)
    response.headers.set('x-tenant-slug', slug)
    return response
  }

  // 5b. Portal sub-paths (/agendar, /servicios, etc.) → same shape.
  if (slug && !isDashboardRoute(pathname)) {
    const portalPath = `/${slug}${pathname}`
    const rewriteUrl = request.nextUrl.clone()
    // Force http:// for internal rewrites — Next.js serves on plain HTTP
    // behind Caddy. Without this, cloned URLs inherit the https:// protocol
    // from Caddy's forwarded request, causing EPROTO SSL errors.
    rewriteUrl.protocol = 'http:'
    rewriteUrl.pathname = portalPath
    rewriteUrl.searchParams.set('_portal', '1')
    const response = NextResponse.rewrite(rewriteUrl)
    response.headers.set('x-tenant-slug', slug)
    return response
  }

  // 6. /dashboard renders the (dashboard)/dashboard/page.tsx — no redirect.
  // Pre-2026-05-07 this redirected to '/', the landing splash, so clicking
  // the sidebar 'Dashboard' bounced users to the marketing page. The
  // dashboard now lives at the explicit /dashboard URL so '/' can stay
  // as the splash + tenant landing entry point.

  // 7. Dashboard routes - require auth
  const response = NextResponse.next()

  let session = null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // @supabase/ssr@0.10.x prefers getAll/setAll because the auth-token
        // can chunk into multiple cookies (`sb-xxx-auth-token.0`, `.1`, …)
        // when the session payload is large. The old get/set API only saw
        // ONE chunk so the session looked corrupt and the middleware
        // redirected to /login forever (the actual user-visible bug).
        cookies: {
          getAll() {
            try {
              return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
            } catch {
              return []
            }
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              try {
                const opts = withAuthCookieDomain(options ?? {}, host)
                request.cookies.set({ name, value, ...opts })
                response.cookies.set({ name, value, ...opts })
              } catch {
                // Cookie set failures are not fatal
              }
            }
          },
        },
        // Disable automatic token refresh — the middleware does a single
        // getUser() call which refreshes once if needed. Without this flag
        // the Supabase client retries refresh infinitely on corrupt tokens.
        auth: {
          autoRefreshToken: false,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    )
    const { data: { user: authUser } } = await supabase.auth.getUser()
    session = authUser ? true : null
  } catch (err) {
    console.error(
      'Middleware getUser error (clearing cookies):',
      err instanceof Error ? err.message : err,
    )
    const clearResponse = NextResponse.redirect(new URL('/login', realOrigin))
    clearSupabaseCookies(request, clearResponse, host)
    return clearResponse
  }

  if (!session) {
    const clearRedirect = NextResponse.redirect(new URL('/login', realOrigin))
    clearSupabaseCookies(request, clearRedirect, host)
    return clearRedirect
  }
  if (slug) response.headers.set('x-tenant-slug', slug)
  // Surface the pathname so server components can check it (e.g. the
  // dashboard layout's provisioning gate needs to know whether the
  // request is for /settings/subscription before redirecting).
  response.headers.set('x-pathname', pathname)
  // Propagate on the request side too so headers() inside RSC sees it.
  request.headers.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: request.headers } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
