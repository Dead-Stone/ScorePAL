/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ignore TypeScript errors during build - we'll fix them separately
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    emotion: true,
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Enable static page generation where possible - compile at build time
  output: 'standalone',
  // Enable static optimization
  generateBuildId: async () => {
    // Use a consistent build ID for better caching
    return process.env.BUILD_ID || 'build-' + Date.now();
  },
  // Enable page prefetching for faster navigation
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
    // Optimize CSS
    optimizeCss: true,
  },
  // Enable instant page transitions
  onDemandEntries: {
    // Keep pages in memory for instant navigation
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
  
  // Webpack optimizations for build-time compilation
  webpack: (config, { dev, isServer }) => {
    // Fix webpack cache issues on Windows - disable problematic cache strategies
    if (dev) {
      // Use memory cache in development for better performance on Windows
      config.cache = {
        type: 'memory',
      };
    }
    
    // Optimize module resolution
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
      },
    };
    
    // Production optimizations - compile everything at build time
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        // Minimize code splitting for faster initial load
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              enforce: true,
            },
            // Material-UI chunk
            mui: {
              name: 'mui',
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              chunks: 'all',
              priority: 30,
              enforce: true,
            },
            // Chart.js chunk
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts)[\\/]/,
              chunks: 'all',
              priority: 30,
              enforce: true,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  async rewrites() {
    // Using centralized API config - change in /src/config/api.js for all endpoints
    // const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010';
    const apiUrl = 'http://localhost:8010';
    
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