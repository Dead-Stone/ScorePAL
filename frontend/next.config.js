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
    // Using centralized API config - change in /src/config/api.js for all endpoints
    // const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const apiUrl = 'http://localhost:8000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
    ]
  },
}

module.exports = nextConfig 