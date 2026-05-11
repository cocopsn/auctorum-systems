import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddleware } from '@/lib/supabase-ssr';
import { APP_DOMAIN, isMedicalPublicHost, isPortalHost } from '@/lib/hosts';

// Static routes — NOT tenants, skip middleware rewrite
const STATIC_ROUTES = ['/systems', '/platform', '/login', '/signup', '/api', '/_next', '/favicon.ico', '/logo.png', '/logo1.png', '/robots.txt'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  // Public-facing origin for redirects (always https in prod)
  const realOrigin = hostname.includes('localhost') ? `http://${hostname}` : `https://${hostname || 'auctorum.com.mx'}`;

  // Skip static routes
  if (STATIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (isPortalHost(hostname) && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', realOrigin))
  }

  // Protect dashboard routes — require valid Supabase session.
  //
  // Uses getUser() (server-validated against Supabase Auth) not
  // getSession() (cookie-trusted) per CLAUDE.md rule. Pre-2026-05-11
  // this used getSession which accepted forged/replayed access tokens
  // until they expired (Supabase default 1h, refresh 60d).
  if (pathname.startsWith('/dashboard')) {
    const response = NextResponse.next()
    const supabase = createSupabaseMiddleware(request, response)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', realOrigin))
    }

    return response
  }

  const url = request.nextUrl.clone();
  const hostWithoutPort = hostname.split(':')[0];

  if (
    isMedicalPublicHost(hostname) ||
    isPortalHost(hostname) ||
    hostWithoutPort === APP_DOMAIN ||
    hostWithoutPort === `www.${APP_DOMAIN}`
  ) {
    return NextResponse.next();
  }

  // Extract subdomain: toolroom.auctorum.com.mx → toolroom
  // Handle localhost for dev: toolroom.localhost:3000 → toolroom
  let tenant: string | null = null;

  if (hostname.includes(APP_DOMAIN)) {
    const parts = hostname.replace(`.${APP_DOMAIN}`, '').split('.');
    if (parts[0] && parts[0] !== 'www' && parts[0] !== APP_DOMAIN.split('.')[0]) {
      tenant = parts[0];
    }
  } else if (hostname.includes('localhost')) {
    // Dev: toolroom.localhost:3000 → toolroom
    // Strip port first: "localhost:3000" → "localhost"
    const hostWithoutPort = hostname.split(':')[0];
    const parts = hostWithoutPort.split('.');
    // Only set tenant if there's a subdomain before "localhost"
    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
      tenant = parts[0];
    }
  }

  // If we have a tenant subdomain, rewrite to /[tenant] routes
  if (tenant) {
    // Don't rewrite dashboard or api routes
    if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/api')) {
      // Inject tenant header for API/dashboard to use
      const response = NextResponse.next();
      response.headers.set('x-tenant-slug', tenant);
      return response;
    }

    // Rewrite public routes to /[tenant]/...
    // Fix EPROTO: the listener is HTTP-only; without forcing protocol here,
    // Next treats the rewrite as an external proxy to https://localhost:3000
    // and fails the TLS handshake ("wrong version number") on every request.
    url.pathname = `/${tenant}${url.pathname}`;
    url.protocol = 'http:';
    const response = NextResponse.rewrite(url);
    response.headers.set('x-tenant-slug', tenant);
    return response;
  }

  // No subdomain = main site (marketing page or dashboard)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
