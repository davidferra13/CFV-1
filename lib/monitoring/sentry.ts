// Sentry - error tracking + crash reporting
// https://sentry.io/
// 5,000 errors/month free, no credit card
// Know when your app breaks in production
//
// Uses the lightweight REST API reporter (lib/monitoring/sentry-reporter.ts).
// No @sentry/nextjs SDK dependency required.

import { reportError, reportAppError } from './sentry-reporter'

/**
 * Capture an error with context about the chef/tenant.
 * Use this instead of raw Sentry.captureException for business logic errors.
 */
export function captureChefError(
  error: Error,
  context: {
    chefId?: string
    tenantId?: string
    eventId?: string
    action?: string
  }
): void {
  reportAppError(error, {
    chefId: context.chefId,
    tenantId: context.tenantId,
    eventId: context.eventId,
    action: context.action,
  })

  // Fire developer alert for captured errors (rate-limited per action)
  try {
    const { sendDeveloperAlert } = require('../email/developer-alerts')
    const system = context.action ? `sentry-${context.action}` : 'sentry-general'
    sendDeveloperAlert({
      severity: 'warning' as const,
      system,
      title: `Error: ${error.message.slice(0, 80)}`,
      description: error.stack?.slice(0, 500) || error.message,
      context: {
        ...(context.action ? { action: context.action } : {}),
        ...(context.chefId ? { chefId: context.chefId } : {}),
        ...(context.eventId ? { eventId: context.eventId } : {}),
      },
    })
  } catch {
    // Alert must never affect error capture
  }
}

/**
 * Track a business-critical event (not an error).
 * e.g. "payment_received", "event_completed", "inquiry_submitted"
 *
 * Note: The lightweight reporter only supports error events.
 * Business events are logged to console. For full breadcrumb support,
 * use the @sentry/nextjs SDK.
 */
export function trackBusinessEvent(
  eventName: string,
  data?: Record<string, string | number | boolean>
): void {
  // Lightweight reporter doesn't support breadcrumbs.
  // Log to console for now - these are informational, not errors.
  if (process.env.NODE_ENV === 'development') {
    console.log(`[sentry:business] ${eventName}`, data)
  }
}

/**
 * Set the current user context for error tracking.
 * Call this after authentication.
 *
 * Note: The lightweight reporter attaches user context per-error via tags/extra,
 * not as a global session state. For full user session tracking, use the @sentry/nextjs SDK.
 */
export function setUserContext(_user: { id: string; email?: string; role?: string }): void {
  // Lightweight reporter doesn't maintain global user state.
  // Context is passed per-error via reportAppError() instead.
}

/**
 * Clear user context on logout.
 */
export function clearUserContext(): void {
  // No-op in lightweight mode - user context is per-error, not global.
}

// Re-export the core reporter for direct use
export { reportError, reportAppError }
