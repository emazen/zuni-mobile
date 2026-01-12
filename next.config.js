/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

module.exports = nextConfig
