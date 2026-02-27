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
  // Keep dev artifacts separate from production build output.
  // This prevents `npm run build` from corrupting a running `next dev` session.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Allow LAN access in development (e.g. http://10.0.0.177:3100) so
  // internal /_next assets are not rejected as cross-origin.
  // Extra hosts can be added via NEXT_ALLOWED_DEV_ORIGINS=host1,host2
  allowedDevOrigins: [
    '10.0.0.177',
    ...String(process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ],
  // ESLint: skip during production build — tsc --noEmit is the type-safety gate.
  // Pre-existing admin files have @typescript-eslint disable comments that reference
  // rules not in the base ESLint config, causing ESLint to error on unknown rules.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type-check separately via `tsc --noEmit`; skip during build for speed.
    ignoreBuildErrors: true,
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
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dcyqefyzi/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
  async headers() {
    return [
      // Embed pages — allow framing from any origin (the whole point is external embeds)
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // No X-Frame-Options → allows embedding in iframes
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
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://luefkpakzvxcsqroxyhz.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "worker-src 'self'",
              'frame-ancestors *',
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // All other pages — strict security headers
      {
        source: '/((?!embed/).*)',
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
            value:
              'geolocation=(), microphone=(), camera=(), payment=(self "https://js.stripe.com")',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required by Next.js App Router (inline hydration scripts).
              // NOTE: Do NOT add 'strict-dynamic' — it overrides 'self' and 'unsafe-inline'
              // in CSP3 browsers, requiring nonce-based script loading which Next.js 14
              // does not support. Adding it blocks ALL JS and kills hydration.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://luefkpakzvxcsqroxyhz.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://hooks.stripe.com https://accounts.google.com",
              "worker-src 'self'",
              'frame-src https://js.stripe.com',
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
  // Disable webpack plugins to prevent dual-pass build-manifest corruption on Windows
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
}

module.exports = withSentryConfig(withPWA(nextConfig), sentryConfig)
