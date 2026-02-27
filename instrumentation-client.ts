// Sentry client-side configuration
// This file is loaded by the browser (Next.js instrumentation hook).
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Reduce in production if volume is high (e.g. 0.1 = 10%).
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Capture replay sessions for 10% of all sessions, 100% when an error occurs.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and inputs by default (PII protection)
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Only report errors in production by default
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLE === 'true',

  // Attach user context when available — set via Sentry.setUser() after login
  // Do NOT log PII (email/name) unless explicitly opted in
  sendDefaultPii: false,

  beforeSend(event) {
    // Strip any accidental PII from error messages
    if (event.request?.cookies) {
      delete event.request.cookies
    }
    return event
  },
})

// Needed for App Router navigation spans in recent @sentry/nextjs.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
