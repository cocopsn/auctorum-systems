/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@quote-engine/db'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
