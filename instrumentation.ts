// Next.js Instrumentation Hook
// Runs once when the server process starts (both dev and production).
// Initializes Sentry for server/edge runtimes and registers background tasks.
//
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // ── Production env validation ──
  // Fail loud if critical keys are missing — better a startup crash than silent payment failures
  if (process.env.NODE_ENV === 'production') {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'RESEND_API_KEY',
      'CRON_SECRET',
    ]
    const missing = required.filter((k) => !process.env[k])
    if (missing.length > 0) {
      throw new Error(
        `[ChefFlow] Missing required env vars for production:\n  ${missing.join('\n  ')}\nSee .env.example for the full list.`
      )
    }
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ── Sentry: Node.js server (API routes, server actions) ──
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLE === 'true',
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

    // ── Background tasks ──
    const { scheduleSimulation } = await import('./lib/simulation/auto-schedule')
    scheduleSimulation()
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // ── Sentry: Edge runtime (middleware, Edge API routes) ──
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLE === 'true',
      sendDefaultPii: false,
    })
  }
}
