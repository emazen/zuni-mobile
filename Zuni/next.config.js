/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor mobile app
  // NOTE: API routes (including NextAuth) won't work with static export.
  // Since you're using Capacitor with server.url pointing to https://zuni.social,
  // the API routes should be hosted separately on that server.
  output: 'export',
  // App directory is now stable in Next.js 14
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client')
    }
    return config
  },
  // Request size limits for Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  // Improve chunk loading reliability
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
