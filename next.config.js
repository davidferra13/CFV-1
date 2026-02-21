/** @type {import('next').NextConfig} */
// PWA: @ducanh2912/next-pwa's dual webpack compilation pass corrupts
// build-manifest.json / pages-manifest.json on Windows. Bypass the wrapper
// entirely — the service worker in public/sw.js is served correctly at runtime.
// To rebuild the SW, temporarily set ENABLE_PWA_BUILD=1 and run `npx next build`.
//
// Sentry: wrapped with withSentryConfig at the bottom for source maps + error tracking.
// Requires NEXT_PUBLIC_SENTRY_DSN (and optionally SENTRY_ORG / SENTRY_PROJECT) in env.
let withPWA
if (process.env.ENABLE_PWA_BUILD === '1') {
  try {
    withPWA = require('@ducanh2912/next-pwa').default({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
    })
  } catch {
    console.warn('[next.config] WARNING: @ducanh2912/next-pwa not found — PWA features disabled.')
    withPWA = (config) => config
  }
} else {
  withPWA = (config) => config
}

const nextConfig = {
  // ESLint: skip during production build — tsc --noEmit is the type-safety gate.
  // Pre-existing admin files have @typescript-eslint disable comments that reference
  // rules not in the base ESLint config, causing ESLint to error on unknown rules.
  eslint: {
    ignoreDuringBuilds: true,
  },
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
              // 'unsafe-inline' is required by Next.js App Router (inline hydration scripts).
              // 'strict-dynamic' overrides 'unsafe-inline' in CSP3-compliant browsers, so
              // modern browsers fall back to the more secure dynamic trust model while older
              // browsers still load correctly. This is the recommended pattern until
              // Next.js nonce support is production-ready.
              "script-src 'self' 'unsafe-inline' 'strict-dynamic' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://luefkpakzvxcsqroxyhz.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://hooks.stripe.com https://accounts.google.com",
              "worker-src 'self'",
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

// Sentry source-map upload and performance instrumentation.
// withSentryConfig is a no-op if SENTRY_DSN is not set.
const { withSentryConfig } = require('@sentry/nextjs')

const sentryConfig = {
  // Upload source maps to Sentry during build (requires SENTRY_ORG + SENTRY_PROJECT in env).
  // Disable source map upload in development or when Sentry is not configured.
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps are uploaded but NOT shipped to the browser (better security)
  hideSourceMaps: true,
  // Don't fail the build if Sentry upload fails (graceful degradation)
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
}

module.exports = withSentryConfig(withPWA(nextConfig), sentryConfig)
