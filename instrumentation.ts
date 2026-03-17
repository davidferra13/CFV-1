// Next.js instrumentation hook
// Runs once when the server process starts (both dev and production).
// Initializes Sentry for server and edge runtimes when configured.

import { assertProductionSafetyEnv } from '@/lib/environment/production-safety'

function isSentryEnabled() {
  return (
    process.env.SENTRY_FORCE_ENABLE === 'true' ||
    Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
  )
}

export async function register() {
  // Fail loudly if critical production keys are missing.
  assertProductionSafetyEnv()

  const sentryEnabled = isSentryEnabled()

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (sentryEnabled) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.init({
        dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
        enabled:
          process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLE === 'true',
        sendDefaultPii: false,
        beforeSend(event) {
          if (event.request?.cookies) delete event.request.cookies
          if (event.request?.headers) {
            delete event.request.headers['cookie']
            delete event.request.headers['authorization']
          }
          return event
        },
      })
    }

    const { scheduleSimulation } = await import('./lib/simulation/auto-schedule')
    scheduleSimulation()
  }

  if (process.env.NEXT_RUNTIME === 'edge' && sentryEnabled) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLE === 'true',
      sendDefaultPii: false,
    })
  }
}
