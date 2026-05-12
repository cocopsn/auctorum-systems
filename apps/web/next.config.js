/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@quote-engine/db', '@quote-engine/payments', '@quote-engine/ui', '@quote-engine/ai'],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co https://images.unsplash.com https://images.pexels.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://static.cloudflareinsights.com",
          },
        ],
      },
    ];
  },
}

// Sentry wrapper — see apps/medconcierge/next.config.js for full
// rationale. Sentry SDK auto-disables at runtime when DSN env vars
// are absent, and the webpack plugin skips source-map upload when
// SENTRY_AUTH_TOKEN is unset (CI builds, local dev).
let withSentryConfig
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  withSentryConfig = require('@sentry/nextjs').withSentryConfig
} catch {
  withSentryConfig = null
}

module.exports = withSentryConfig
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG ?? 'auctorum',
      project: process.env.SENTRY_PROJECT ?? 'web',
      silent: true,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      hideSourceMaps: true,
      disableLogger: true,
      tunnelRoute: '/monitoring',
    })
  : nextConfig
