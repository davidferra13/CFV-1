// Notification Tier Configuration
// Pure static config — no DB calls, safe to import from server and client.
//
// Three tiers define the default delivery channels for every notification action:
//   critical  → SMS + Push + Email  (new inquiry, payment, dispute)
//   alert     → Push + Email        (quote response, event cancelled, new message)
//   info      → Email only          (follow-up due, client signup, review)
//
// The hierarchy is:
//   1. Per-channel override in notification_preferences (category-level, DB)
//   2. Per-action tier from DEFAULT_TIER_MAP (code)
//   3. TIER_CHANNEL_DEFAULTS for that tier (code)
//
// Intent signals (client_viewed_quote, etc.) are alert tier but never email.

import type { NotificationAction } from './types'

export type NotificationTier = 'critical' | 'alert' | 'info'

export type ChannelSet = {
  email: boolean
  push: boolean
  sms: boolean
}

// ─── Default Tier per Action ──────────────────────────────────────────────────

export const DEFAULT_TIER_MAP: Record<NotificationAction, NotificationTier> = {
  // ── Critical ── SMS + Push + Email
  new_inquiry: 'critical',
  wix_submission: 'critical',
  payment_received: 'critical',
  payment_failed: 'critical',
  dispute_created: 'critical',
  system_alert: 'critical',

  // ── Alert ── Push + Email
  quote_accepted: 'alert',
  quote_rejected: 'alert',
  proposal_accepted: 'alert',
  event_paid: 'alert',
  event_cancelled: 'alert',
  new_message: 'alert',
  inquiry_reply: 'alert',

  // ── Info ── Email only
  follow_up_due: 'info',
  client_signup: 'info',
  review_submitted: 'info',
  quote_expiring: 'info',
  inquiry_expired: 'info',
  event_completed: 'info',
  refund_processed: 'info',

  // ── Intent signals ── Alert tier, but email is suppressed (see EMAIL_SUPPRESSED_ACTIONS)
  // These are time-sensitive in-app nudges; email would be noise.
  client_on_payment_page: 'alert',
  client_viewed_quote: 'alert',
  quote_viewed_after_delay: 'alert',
  client_viewed_proposal: 'alert',

  // ── Payments ── Critical
  gift_card_purchased: 'critical',

  // ── Client-facing notifications ── Alert for actionable, Info for reminders
  quote_sent_to_client: 'alert',
  event_proposed_to_client: 'alert',
  event_confirmed_to_client: 'alert',
  event_reminder_7d: 'info',
  event_reminder_2d: 'info',
  event_reminder_1d: 'alert',
  quote_expiring_soon: 'alert',
  photos_ready: 'info',

  // ── Loyalty ── Alert (chef must deliver the reward)
  reward_redeemed_by_client: 'alert',

  // ── Payment reminders ── Alert (balance due / overdue)
  payment_due_approaching: 'alert',
  payment_overdue: 'alert',

  // ── Goals ── Info (nudges & digests, not urgent)
  goal_nudge: 'info',
  goal_milestone: 'alert',
  goal_weekly_digest: 'info',
}

// ─── Default Channels per Tier ───────────────────────────────────────────────

export const TIER_CHANNEL_DEFAULTS: Record<NotificationTier, ChannelSet> = {
  critical: { email: true, push: true, sms: true },
  alert: { email: true, push: true, sms: false },
  info: { email: true, push: false, sms: false },
}

// ─── Email Suppression List ───────────────────────────────────────────────────
// These action types never trigger an email, regardless of tier.
// Intent signals are real-time nudges — an email 2 minutes later is noise.

export const EMAIL_SUPPRESSED_ACTIONS = new Set<NotificationAction>([
  'client_on_payment_page',
  'client_viewed_quote',
  'quote_viewed_after_delay',
  'client_viewed_proposal',
])

// ─── Tier Display Labels ─────────────────────────────────────────────────────

export const TIER_LABELS: Record<NotificationTier, string> = {
  critical: 'Critical',
  alert: 'Alert',
  info: 'Info',
}

export const TIER_DESCRIPTIONS: Record<NotificationTier, string> = {
  critical: 'SMS + Push + Email — new inquiries, payments, disputes',
  alert: 'Push + Email — quote responses, event changes, new messages',
  info: 'Email only — follow-ups, reviews, routine updates',
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Get the default channel set for a given action,
 * before any per-user preference overrides are applied.
 */
export function getDefaultChannels(action: NotificationAction): ChannelSet {
  const tier = DEFAULT_TIER_MAP[action]
  const defaults = { ...TIER_CHANNEL_DEFAULTS[tier] }

  if (EMAIL_SUPPRESSED_ACTIONS.has(action)) {
    defaults.email = false
  }

  return defaults
}
