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

const isDev = process.env.NODE_ENV === 'development'

const devConnectSrc = isDev
  ? [
      'http://127.0.0.1:54321',
      'ws://127.0.0.1:54321',
      'http://localhost:54321',
      'ws://localhost:54321',
      'ws://127.0.0.1:3100',
      'ws://localhost:3100',
    ]
  : []

// Next.js dev mode uses eval-based source maps (webpack devtool). Without
// 'unsafe-eval' in CSP, all client-side JS fails to hydrate in development.
const devEval = isDev ? " 'unsafe-eval'" : ''

const nextConfig = {
  // Keep dev artifacts separate from production build output.
  // This prevents `npm run build` from corrupting a running `next dev` session.
  distDir:
    process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  // /chefs directory page hits the database during static generation; give it
  // enough time on resource-constrained build environments (default 60s).
  staticPageGenerationTimeout: 180,
  experimental: {
    // Large shared icon/chart barrels otherwise dominate the module graph during production builds.
    optimizePackageImports: ['@phosphor-icons/react', 'recharts'],
    // Next 14 still uses the experimental flag for keeping server-only SDKs out of the
    // RSC/route-handler bundle graph. These packages are only instantiated on Node.
    serverComponentsExternalPackages: ['resend', 'stripe', 'svix'],
  },
  // Allow LAN access in development so internal /_next assets are not
  // rejected as cross-origin. Extra hosts can be added via NEXT_ALLOWED_DEV_ORIGINS=host1,host2
  allowedDevOrigins: [
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
    // Type checking runs separately via `npm run typecheck` (scripts/run-typecheck.mjs)
    // with its own heap allocation. Running it inside `next build` OOMs on this
    // codebase (~265 pages). Same pattern as eslint.ignoreDuringBuilds above.
    ignoreBuildErrors: true,
    tsconfigPath: process.env.NEXT_TSCONFIG_PATH || 'tsconfig.next.json',
  },
  // Use git SHA for build ID.
  // When PWA dual-pass build is active, pin to a static ID to prevent
  // _ssgManifest.js ENOENT errors from mismatched build directories.
  generateBuildId: async () => {
    if (process.env.ENABLE_PWA_BUILD === '1') return 'chefflow-build'
    try {
      return require('child_process').execSync('git rev-parse --short HEAD').toString().trim()
    } catch {
      return `build-${Date.now()}`
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/api/storage/**',
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
              `script-src 'self' 'unsafe-inline'${devEval} https://challenges.cloudflare.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: ",
              "font-src 'self'",
              `connect-src 'self' https://challenges.cloudflare.com ${devConnectSrc.join(' ')}`.trim(),
              "worker-src 'self'",
              'frame-src https://challenges.cloudflare.com',
              'frame-ancestors *',
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Kiosk pages — strict security, no framing
      {
        source: '/kiosk/:path*',
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
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${devEval}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://api.qrserver.com ",
              "font-src 'self'",
              `connect-src 'self' ${devConnectSrc.join(' ')}`.trim(),
              "worker-src 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // All other pages — strict security headers
      {
        source: '/((?!embed/|kiosk/).*)',
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
              `script-src 'self' 'unsafe-inline'${devEval} https://js.stripe.com https://us-assets.i.posthog.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: ",
              "font-src 'self'",
              `connect-src 'self' https://api.stripe.com https://hooks.stripe.com https://accounts.google.com https://us.i.posthog.com https://us-assets.i.posthog.com ${devConnectSrc.join(' ')}`.trim(),
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
  async redirects() {
    return [
      // Common alternative URL patterns that should reach the correct page
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: true,
      },
    ]
  },
}

// Sentry source-map upload and performance instrumentation.
// withSentryConfig is a no-op if SENTRY_DSN is not set.
// Gracefully skip if @sentry/nextjs is not installed.
let withSentryConfig
try {
  withSentryConfig = require('@sentry/nextjs').withSentryConfig
} catch {
  withSentryConfig = null
}

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

module.exports = withSentryConfig
  ? withSentryConfig(withPWA(nextConfig), sentryConfig)
  : withPWA(nextConfig)
