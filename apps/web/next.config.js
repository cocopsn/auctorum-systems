/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile internal workspace packages
  transpilePackages: ['@quote-engine/db', '@quote-engine/pdf', '@quote-engine/notifications'],

  // Enable server actions for form handling
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For PDF uploads
    },
  },

  // Allow images from Supabase storage and external sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Note: 'standalone' output removed — use 'next start' with PM2
};

module.exports = nextConfig;
