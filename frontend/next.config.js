/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    // ✅ Only allow your S3 bucket and YouTube thumbnails
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'site-forge-ai.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
    ],

    // ✅ Modern formats
    formats: ['image/avif', 'image/webp'],

    // ✅ Cache optimized variants aggressively
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days (safe, avoids cold misses)

    /**
     * 🔑 CRITICAL FIX
     * Clamp max image width so Next NEVER generates 1920 / 3840 variants
     */
    deviceSizes: [360, 640, 768, 1024, 1280],
    imageSizes: [256, 384, 480, 640, 800, 900],
  },

  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/sitemap',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
