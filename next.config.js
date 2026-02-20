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
          // Force HTTPS for 1 year (preload-ready)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Block MIME-type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking via iframe embedding
          // Note: frame-ancestors in CSP below also covers modern browsers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Don't leak full URL in the Referer header to third parties
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Legacy XSS filter (belt + suspenders for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Restrict browser API access the app doesn't need
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(self "https://js.stripe.com")',
          },
          // Content Security Policy
          // unsafe-inline is required for Next.js 14 RSC hydration scripts.
          // To remove it, switch to a nonce-based CSP (larger refactor).
          // Key protections: object-src none, base-uri self, frame-ancestors none,
          // connect-src locked to known origins, frame-src locked to Stripe.
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
