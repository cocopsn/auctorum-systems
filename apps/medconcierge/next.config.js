/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },

  poweredByHeader: false,

  transpilePackages: ['@quote-engine/db', '@quote-engine/payments', '@quote-engine/pdf', '@quote-engine/notifications', '@quote-engine/ui', '@quote-engine/ai', '@quote-engine/queue'],

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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://images.pexels.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://static.cloudflareinsights.com; worker-src 'self' blob:; manifest-src 'self'",
          },
        ],
      },
    ];
  },
};

// Bundle analyzer — activates when `ANALYZE=true pnpm build:med`. The
// require is wrapped in try/catch so the package being absent (in
// production deploys where we don't need the dev tool) doesn't break
// the build. Install only when you actually want to use it:
//   corepack pnpm add -D @next/bundle-analyzer --filter medconcierge
//
// P2-5 of the 2026-05-12 audit. Run periodically to catch heavy
// regressions (moment, lodash-full, etc.) before they ship.
if (process.env.ANALYZE === 'true') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
    module.exports = withBundleAnalyzer(nextConfig);
  } catch {
    console.warn(
      "[next.config] ANALYZE=true but @next/bundle-analyzer isn't installed. Skipping. Run:\n" +
        '  corepack pnpm add -D @next/bundle-analyzer --filter medconcierge'
    );
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}
