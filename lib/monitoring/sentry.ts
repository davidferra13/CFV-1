// Sentry — error tracking + crash reporting
// https://sentry.io/
// 5,000 errors/month free, no credit card
// Know when your app breaks in production

/**
 * Sentry integration for Next.js
 *
 * Setup requires the @sentry/nextjs package:
 *   npm install @sentry/nextjs
 *
 * Then run: npx @sentry/wizard@latest -i nextjs
 * This creates sentry.client.config.ts, sentry.server.config.ts,
 * and sentry.edge.config.ts automatically.
 *
 * This file provides helper utilities on top of the SDK.
 */

// Re-export will work once @sentry/nextjs is installed
// import * as Sentry from '@sentry/nextjs'

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
  try {
    // Dynamic import to avoid build errors before SDK is installed
    const Sentry = require('@sentry/nextjs')
    Sentry.captureException(error, {
      tags: {
        action: context.action,
      },
      extra: {
        chefId: context.chefId,
        tenantId: context.tenantId,
        eventId: context.eventId,
      },
    })
  } catch {
    // Sentry not installed yet — just log
    console.error('[sentry] Error capture failed (SDK not installed?):', error.message)
  }
}

/**
 * Track a business-critical event (not an error).
 * e.g. "payment_received", "event_completed", "inquiry_submitted"
 */
export function trackBusinessEvent(
  eventName: string,
  data?: Record<string, string | number | boolean>
): void {
  try {
    const Sentry = require('@sentry/nextjs')
    Sentry.addBreadcrumb({
      category: 'business',
      message: eventName,
      data,
      level: 'info',
    })
  } catch {
    // Sentry not installed yet
  }
}

/**
 * Set the current user context for error tracking.
 * Call this after authentication.
 */
export function setUserContext(user: { id: string; email?: string; role?: string }): void {
  try {
    const Sentry = require('@sentry/nextjs')
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    })
  } catch {
    // Sentry not installed yet
  }
}

/**
 * Clear user context on logout.
 */
export function clearUserContext(): void {
  try {
    const Sentry = require('@sentry/nextjs')
    Sentry.setUser(null)
  } catch {
    // Sentry not installed yet
  }
}
