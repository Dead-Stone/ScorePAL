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
  async redirects() {
    return [
      // Redirect root to landing page for unauthenticated users
      // This will be handled by the app logic, but we can add a fallback
      {
        source: '/home',
        destination: '/',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      // Rewrite for API routes - preserve the /api prefix
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      // Also handle direct canvas routes for backward compatibility
      {
        source: '/canvas/:path*',
        destination: 'http://localhost:8000/canvas/:path*',
      },
    ];
  },
}

module.exports = nextConfig 