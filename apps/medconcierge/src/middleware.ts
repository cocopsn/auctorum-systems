import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const url = request.nextUrl.clone()

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

  // Dashboard and API routes — pass tenant header through
  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/api')) {
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
