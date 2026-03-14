/** @type {import('next').NextConfig} */
// PWA: @ducanh2912/next-pwa's dual webpack compilation pass corrupts
// build-manifest.json / pages-manifest.json on Windows. Bypass the wrapper
// entirely — the service worker in public/sw.js is served correctly at runtime.
// To rebuild the SW, temporarily set ENABLE_PWA_BUILD=1 and run `npx next build`.
//
// Sentry: wrapped with withSentryConfig at the bottom for source maps + error tracking.
// Requires NEXT_PUBLIC_SENTRY_DSN (and optionally SENTRY_ORG / SENTRY_PROJECT) in env.
const path = require('path')
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

function parseOrigin(candidate) {
  if (!candidate) return null

  try {
    return new URL(candidate).origin
  } catch {
    return null
  }
}

function buildSupabaseConnectSrc() {
  const sources = ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co']
  const supabaseOrigin = parseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)

  if (!supabaseOrigin) return sources

  const { hostname, protocol } = new URL(supabaseOrigin)
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    return sources
  }

  sources.push(supabaseOrigin)
  sources.push(
    protocol === 'https:'
      ? supabaseOrigin.replace(/^https:/, 'wss:')
      : supabaseOrigin.replace(/^http:/, 'ws:')
  )

  return [...new Set(sources)]
}

const supabaseConnectSrc = buildSupabaseConnectSrc()

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
  env: {
    NEXT_PUBLIC_ENABLE_PWA: process.env.ENABLE_PWA_BUILD === '1' ? '1' : '0',
  },
  // Keep dev artifacts separate from production build output.
  // This prevents `npm run build` from corrupting a running `next dev` session.
  distDir:
    process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  // Allow LAN access in development so internal /_next assets are not
  // rejected as cross-origin. Add hosts via NEXT_ALLOWED_DEV_ORIGINS=host1,host2
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
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
    // Production builds compile through existing repo-wide TS debt.
    // `npm run typecheck` / `npm run build:strict` remain the explicit strict gates.
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // npm can leave an empty nested @react-email namespace folder under
    // @react-email/components on Windows. Force webpack to resolve the render
    // package from the top-level install so App Router builds do not chase a
    // non-existent nested dist/node entrypoint.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-email/render': path.resolve(__dirname, 'node_modules/@react-email/render'),
    }

    return config
  },
  // Use git SHA for build ID (Vercel provides VERCEL_GIT_COMMIT_SHA).
  // When PWA dual-pass build is active, pin to a static ID to prevent
  // _ssgManifest.js ENOENT errors from mismatched build directories.
  generateBuildId: async () => {
    if (process.env.ENABLE_PWA_BUILD === '1') return 'chefflow-build'
    // VERCEL_GIT_COMMIT_SHA is only available on Vercel.
    // On local builds, fall back to git rev-parse or a timestamp.
    if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
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
    const isStaging =
      process.env.APP_ENV === 'staging' || process.env.NEXT_PUBLIC_APP_ENV === 'staging'
    const stagingNoStoreHeaders = isStaging
      ? [
          {
            // Prevent beta HTML from caching stale hashed CSS/JS references across deploys.
            source:
              '/((?!api/|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|webmanifest|css|js|map|woff|woff2)$).*)',
            headers: [
              {
                key: 'Cache-Control',
                value: 'no-store, max-age=0, must-revalidate',
              },
            ],
          },
        ]
      : []
    return [
      ...stagingNoStoreHeaders,
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://luefkpakzvxcsqroxyhz.supabase.co",
              "font-src 'self'",
              `connect-src ${supabaseConnectSrc.join(' ')} https://challenges.cloudflare.com`,
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://api.qrserver.com https://luefkpakzvxcsqroxyhz.supabase.co",
              "font-src 'self'",
              `connect-src ${supabaseConnectSrc.join(' ')}`,
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://us-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://luefkpakzvxcsqroxyhz.supabase.co",
              "font-src 'self'",
              `connect-src ${supabaseConnectSrc.join(' ')} https://api.stripe.com https://hooks.stripe.com https://accounts.google.com https://us.i.posthog.com https://us-assets.i.posthog.com`,
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
  ? withSentryConfig(withNextIntl(withPWA(nextConfig)), sentryConfig)
  : withNextIntl(withPWA(nextConfig))
