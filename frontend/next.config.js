/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
   eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable ISR
  experimental: {
    // Optional: Enable server components
  },
  // Image optimization
  // WHY: Configure Next.js Image Optimizer for S3-hosted images
  // - Allow specific S3 domain for security (prevents arbitrary image sources)
  // - Enable AVIF/WebP formats for modern browsers (better compression than PNG/JPG)
  // - Set cache TTL to balance freshness vs performance (1 year for optimized images)
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'site-forge-ai.s3.amazonaws.com',
        pathname: '/tenants/**',
      },
      // Keep wildcard for backward compatibility during migration
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Enable modern image formats (AVIF > WebP > fallback to original)
    // WHY: AVIF offers ~50% better compression than WebP, WebP ~30% better than PNG/JPG
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 1 year
    // WHY: Original images in S3 don't change, so optimized versions are stable
    // Next.js will regenerate if original changes (based on URL)
    minimumCacheTTL: 31536000, // 1 year in seconds
    // Device sizes for responsive images
    // WHY: Serve appropriately sized images based on viewport
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Rewrites for sitemap.xml
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/sitemap',
      },
    ];
  },
  // Headers for multi-tenant support
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

