// Notification Tier Configuration
// Pure static config, safe to import from server and client.
//
// Three tiers define the default delivery channels for every notification action:
//   critical -> SMS + Push + Email
//   alert -> Push + Email
//   info -> Email only
//
// Resolution hierarchy:
//   1. Per-channel override in notification_preferences (category-level, DB)
//   2. Per-action tier from DEFAULT_TIER_MAP (code)
//   3. TIER_CHANNEL_DEFAULTS for that tier (code)
//
// Intent signals are alert tier but never email.

import type { NotificationAction } from './types'

export type NotificationTier = 'critical' | 'alert' | 'info'

export type ChannelSet = {
  email: boolean
  push: boolean
  sms: boolean
}

// Default Tier per Action
export const DEFAULT_TIER_MAP: Record<NotificationAction, NotificationTier> = {
  // Inquiries
  new_inquiry: 'critical',
  inquiry_reply: 'alert',
  inquiry_expired: 'info',
  follow_up_due: 'info',
  wix_submission: 'critical',
  new_guest_lead: 'alert',

  // Quotes
  quote_accepted: 'alert',
  quote_rejected: 'alert',
  quote_expiring: 'info',
  quote_sent_to_client: 'alert',
  quote_expiring_soon: 'alert',

  // Events
  proposal_accepted: 'alert',
  event_paid: 'alert',
  event_completed: 'info',
  event_cancelled: 'alert',
  event_proposed_to_client: 'alert',
  event_confirmed_to_client: 'alert',
  event_reminder_7d: 'info',
  event_reminder_2d: 'info',
  event_reminder_1d: 'alert',
  photos_ready: 'info',
  menu_preferences_submitted: 'alert',
  meal_request_scheduled_to_client: 'alert',
  meal_request_declined_to_client: 'alert',
  meal_request_fulfilled_to_client: 'alert',
  meal_recommendation_sent_to_client: 'alert',
  meal_recommendation_approved: 'alert',
  meal_recommendation_revision_requested: 'alert',
  client_meal_feedback_submitted: 'alert',
  menu_approved: 'alert',
  menu_revision_requested: 'alert',
  contract_signed: 'alert',
  contract_voided: 'alert',
  inquiry_quoted_to_client: 'alert',
  inquiry_converted_to_client: 'alert',
  inquiry_declined_to_client: 'alert',
  inquiry_expired_to_client: 'info',
  event_cancelled_to_client: 'alert',
  event_completed_to_client: 'info',
  event_in_progress_to_client: 'alert',
  event_paid_to_client: 'alert',

  // Payments
  payment_received: 'critical',
  payment_failed: 'critical',
  refund_processed: 'info',
  dispute_created: 'critical',
  gift_card_purchased: 'critical',
  payment_due_approaching: 'alert',
  payment_overdue: 'alert',
  dispute_funds_withdrawn: 'critical',
  refund_processed_to_client: 'info',

  // Chat
  new_message: 'alert',
  new_chat_message_to_client: 'alert',

  // Clients and intent signals
  client_signup: 'info',
  review_submitted: 'info',
  client_on_payment_page: 'alert',
  client_viewed_quote: 'alert',
  quote_viewed_after_delay: 'alert',
  client_viewed_proposal: 'alert',
  client_portal_visit: 'alert',
  guest_rsvp_received: 'alert',
  guest_dietary_alert: 'critical',
  client_allergy_changed: 'critical',

  // Loyalty
  reward_redeemed_by_client: 'alert',
  points_awarded: 'info',
  tier_upgraded: 'alert',
  gift_card_redeemed: 'alert',
  raffle_entry_earned: 'info',
  raffle_winner: 'alert',
  raffle_new_round: 'info',
  raffle_drawn_chef: 'alert',

  // Goals
  goal_nudge: 'info',
  goal_milestone: 'alert',
  goal_weekly_digest: 'info',

  // Protection and wellbeing
  insurance_expiring_30d: 'info',
  insurance_expiring_7d: 'alert',
  cert_expiring_90d: 'info',
  cert_expiring_30d: 'info',
  cert_expiring_7d: 'alert',
  new_negative_mention: 'alert',
  recall_alert_matched: 'critical',
  capacity_limit_approaching: 'alert',
  relationship_cooling: 'info',
  burnout_risk_high: 'alert',
  no_education_logged_90d: 'info',
  quarterly_checkin_due: 'info',

  // Ops
  staff_assignment: 'alert',
  task_assigned: 'alert',
  schedule_change: 'alert',
  order_status: 'alert',
  low_stock: 'critical',
  guest_comp: 'alert',

  // Marketplace
  marketplace_lead_stale: 'alert',

  // Loyalty
  loyalty_trigger: 'info',
  loyalty_adjustment: 'alert',

  // System
  system_alert: 'critical',
  account_access_alert: 'critical',
}

// Default Channels per Tier
export const TIER_CHANNEL_DEFAULTS: Record<NotificationTier, ChannelSet> = {
  critical: { email: true, push: true, sms: true },
  alert: { email: true, push: true, sms: false },
  info: { email: true, push: false, sms: false },
}

// These action types never trigger an email, regardless of tier.
// Intent signals are real-time nudges where email would be noise.
export const EMAIL_SUPPRESSED_ACTIONS = new Set<NotificationAction>([
  'client_on_payment_page',
  'client_viewed_quote',
  'quote_viewed_after_delay',
  'client_viewed_proposal',
  'client_portal_visit',
])

export const TIER_LABELS: Record<NotificationTier, string> = {
  critical: 'Critical',
  alert: 'Alert',
  info: 'Info',
}

export const TIER_DESCRIPTIONS: Record<NotificationTier, string> = {
  critical: 'SMS + Push + Email - new inquiries, payments, disputes',
  alert: 'Push + Email - quote responses, event changes, new messages',
  info: 'Email only - follow-ups, reviews, routine updates',
}

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
