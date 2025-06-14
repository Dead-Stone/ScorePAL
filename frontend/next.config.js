/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    emotion: true,
  },
  experimental: {
    // Removing optimizeCss as it requires critters
    // optimizeCss: true,
    // Turning off Fast Refresh can help if it's causing issues
    // fastRefresh: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://scorepal-production.up.railway.app/:path*',
      },
    ]
  },
}

module.exports = nextConfig 