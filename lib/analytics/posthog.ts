// PostHog — product analytics (self-hostable)
// https://posthog.com/
// 1M events/month free, no credit card
// Know which features people use, where they drop off

/**
 * PostHog integration for Next.js
 *
 * Setup requires the posthog-js package:
 *   npm install posthog-js
 *
 * The API key goes in NEXT_PUBLIC_POSTHOG_KEY (client-side).
 * The host is NEXT_PUBLIC_POSTHOG_HOST (default: https://us.i.posthog.com).
 *
 * This file provides typed event helpers for ChefFlow-specific analytics.
 */

// PostHog event names — keep them consistent across the app
export const ANALYTICS_EVENTS = {
  // Marketing & funnel
  CTA_CLICKED: 'cta_clicked',
  SIGNUP_STARTED: 'signup_started',
  BETA_SIGNUP_SUBMITTED: 'beta_signup_submitted',
  CONTACT_FORM_SUBMITTED: 'contact_form_submitted',
  NEWSLETTER_SUBSCRIBED: 'newsletter_subscribed',

  // Inquiries
  INQUIRY_SUBMITTED: 'inquiry_submitted',
  INQUIRY_VIEWED: 'inquiry_viewed',
  INQUIRY_RESPONDED: 'inquiry_responded',

  // Events
  EVENT_CREATED: 'event_created',
  EVENT_TRANSITIONED: 'event_transitioned',
  EVENT_COMPLETED: 'event_completed',

  // Quotes & Payments
  QUOTE_SENT: 'quote_sent',
  QUOTE_ACCEPTED: 'quote_accepted',
  PAYMENT_RECEIVED: 'payment_received',

  // Menus & Recipes
  MENU_CREATED: 'menu_created',
  RECIPE_ADDED: 'recipe_added',
  WINE_PAIRING_VIEWED: 'wine_pairing_viewed',

  // AI Features
  REMY_CHAT_OPENED: 'remy_chat_opened',
  REMY_MESSAGE_SENT: 'remy_message_sent',
  AI_IMPORT_USED: 'ai_import_used',

  // Engagement
  PAGE_VIEWED: 'page_viewed',
  FEATURE_USED: 'feature_used',
  SEARCH_PERFORMED: 'search_performed',
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

/**
 * Track a product analytics event.
 * Safe to call even if PostHog isn't initialized yet.
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>
): void {
  try {
    if (typeof window === 'undefined') return
    const posthog = (window as any).posthog
    if (posthog?.capture) {
      posthog.capture(event, properties)
    }
  } catch {
    // PostHog not loaded — silently skip
  }
}

/**
 * Identify a user for analytics.
 * Call after login.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean>
): void {
  try {
    if (typeof window === 'undefined') return
    const posthog = (window as any).posthog
    if (posthog?.identify) {
      posthog.identify(userId, traits)
    }
  } catch {
    // PostHog not loaded
  }
}

/**
 * Reset analytics identity on logout.
 */
export function resetAnalytics(): void {
  try {
    if (typeof window === 'undefined') return
    const posthog = (window as any).posthog
    if (posthog?.reset) {
      posthog.reset()
    }
  } catch {
    // PostHog not loaded
  }
}

/**
 * Track a page view with custom properties.
 */
export function trackPageView(
  pageName: string,
  properties?: Record<string, string | number | boolean>
): void {
  trackEvent(ANALYTICS_EVENTS.PAGE_VIEWED, {
    page: pageName,
    ...properties,
  })
}
