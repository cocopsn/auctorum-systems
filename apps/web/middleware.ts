import { NextRequest, NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'auctorum.com.mx';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

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
    url.pathname = `/${tenant}${url.pathname}`;
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
