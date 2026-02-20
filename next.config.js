/** @type {import('next').NextConfig} */
// Use @ducanh2912/next-pwa (App Router-compatible fork) if available,
// otherwise fall back to no-op wrapper (avoids pages-manifest.json crash with next-pwa v5)
let withPWA
try {
  withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    fallbacks: { document: '/offline.html' },
  })
} catch {
  // @ducanh2912/next-pwa not installed — disable PWA wrapper
  withPWA = (config) => config
}

const nextConfig = {
  // Pin the build ID so the PWA wrapper's separate webpack pass uses the same
  // directory as the main Next.js build. Without this, the two passes generate
  // different IDs and the _ssgManifest.js write fails with ENOENT.
  generateBuildId: async () => 'chefflow-build',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'luefkpakzvxcsqroxyhz.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(self "https://js.stripe.com")',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://luefkpakzvxcsqroxyhz.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://hooks.stripe.com https://accounts.google.com",
              "frame-src https://js.stripe.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
