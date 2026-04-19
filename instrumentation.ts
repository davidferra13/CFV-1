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

function areBackgroundJobsDisabled() {
  return process.env.DISABLE_BACKGROUND_JOBS_FOR_E2E === 'true'
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

    if (areBackgroundJobsDisabled()) {
      console.log('[instrumentation] Background job startup disabled for E2E.')
    } else {
      const { scheduleSimulation } = await import('./lib/simulation/auto-schedule')
      scheduleSimulation()

      // Self-hosted cron ticker: fires all scheduled API routes at their defined cadences.
      // Replaces the need for an external scheduler (Vercel cron, Windows Task Scheduler, etc.)
      const { startCronTicker } = await import('./lib/cron/ticker')
      startCronTicker()
    }

    // Warm up critical pages so the first real user doesn't hit cold-start latency.
    // Each dynamic page requires loading its server-side module graph on first hit.
    // This takes 5-15s cold but <0.5s warm. We pay the cost once at startup.
    if (process.env.NODE_ENV === 'production') {
      setTimeout(async () => {
        const port = process.env.PORT || '3100'
        const base = `http://127.0.0.1:${port}`
        const routes = [
          '/auth/signin',
          '/privacy',
          '/terms',
          '/chefs',
          '/trust',
          '/dashboard',
          '/api/health',
        ]
        console.log('[warmup] Pre-warming critical pages...')
        // Warm sequentially to avoid stampeding the server on startup
        for (const route of routes) {
          try {
            await fetch(`${base}${route}`, { signal: AbortSignal.timeout(60000) })
          } catch {
            // Best-effort warmup
          }
        }
        console.log('[warmup] Done - all critical pages warmed')
      }, 3000)
    }
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
