// Sentry client-side configuration
// This file is loaded by the browser (Next.js instrumentation hook).
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/

const sentryClientEnabled =
  process.env.SENTRY_FORCE_ENABLE === 'true' || Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)

type RouterTransitionHandler = (...args: unknown[]) => void

let captureRouterTransitionStart: RouterTransitionHandler | null = null

if (sentryClientEnabled) {
  void import('@sentry/nextjs').then((Sentry) => {
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

      // Attach user context when available; do not send PII by default.
      sendDefaultPii: false,

      beforeSend(event) {
        if (event.request?.cookies) {
          delete event.request.cookies
        }
        return event
      },
    })

    captureRouterTransitionStart = (...args: unknown[]) => {
      ;(Sentry.captureRouterTransitionStart as any)(...args)
    }
  })
}

// Needed for App Router navigation spans in recent @sentry/nextjs.
export const onRouterTransitionStart: RouterTransitionHandler = (...args) => {
  captureRouterTransitionStart?.(...args)
}
