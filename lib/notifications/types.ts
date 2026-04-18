// Notification Type System
// Defines categories, actions, and display configuration

export type NotificationCategory =
  | 'inquiry'
  | 'quote'
  | 'event'
  | 'payment'
  | 'chat'
  | 'client'
  | 'loyalty'
  | 'goals'
  | 'lead'
  | 'protection'
  | 'wellbeing'
  | 'review'
  | 'ops'
  | 'system'

export type NotificationAction =
  // Inquiries
  | 'new_inquiry'
  | 'inquiry_reply'
  | 'inquiry_expired'
  | 'follow_up_due'
  // Quotes
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_expiring'
  // Events
  | 'proposal_accepted'
  | 'event_paid'
  | 'event_confirmed'
  | 'event_in_progress'
  | 'event_completed'
  | 'event_cancelled'
  // Payments
  | 'payment_received'
  | 'payment_failed'
  | 'refund_processed'
  | 'dispute_created'
  | 'gift_card_purchased'
  | 'ticket_purchased'
  | 'payment_amount_mismatch'
  | 'payment_due_approaching'
  | 'payment_overdue'
  | 'cancellation_pending_refund'
  | 'full_refund_active_event'
  // Chat
  | 'new_message'
  // Clients
  | 'client_signup'
  | 'review_submitted'
  | 'new_guest_lead'
  // Wix
  | 'wix_submission'
  // Client behavior / intent signals
  | 'client_on_payment_page'
  | 'client_viewed_quote'
  | 'quote_viewed_after_delay'
  | 'client_viewed_proposal'
  // System
  | 'system_alert'
  | 'account_access_alert'
  // Client-facing notifications (recipient_role = 'client')
  | 'quote_sent_to_client'
  | 'event_proposed_to_client'
  | 'event_confirmed_to_client'
  | 'event_reminder_7d'
  | 'event_reminder_2d'
  | 'event_reminder_1d'
  | 'quote_expiring_soon'
  | 'photos_ready'
  // Loyalty
  | 'reward_redeemed_by_client'
  // Goals
  | 'goal_nudge'
  | 'goal_milestone'
  | 'goal_weekly_digest'
  // Protection - insurance & certifications
  | 'insurance_expiring_30d'
  | 'insurance_expiring_7d'
  | 'cert_expiring_90d'
  | 'cert_expiring_30d'
  | 'cert_expiring_7d'
  // Reputation
  | 'new_negative_mention'
  | 'recall_alert_matched'
  // Wellbeing & capacity
  | 'capacity_limit_approaching'
  | 'relationship_cooling'
  | 'burnout_risk_high'
  // Professional momentum
  | 'no_education_logged_90d'
  | 'quarterly_checkin_due'
  // Client portal visit (real-time visitor alert)
  | 'client_portal_visit'
  // Restaurant Ops - Phase 7
  | 'staff_assignment'
  | 'task_assigned'
  | 'schedule_change'
  | 'order_status'
  | 'low_stock'
  | 'guest_comp'
  // Menu preferences
  | 'menu_preferences_submitted'
  | 'meal_request_scheduled_to_client'
  | 'meal_request_declined_to_client'
  | 'meal_request_fulfilled_to_client'
  | 'meal_recommendation_sent_to_client'
  | 'meal_recommendation_approved'
  | 'meal_recommendation_revision_requested'
  | 'client_meal_feedback_submitted'
  // Cross-boundary gap closure
  | 'menu_approved'
  | 'menu_revision_requested'
  | 'contract_signed'
  | 'contract_voided'
  | 'inquiry_quoted_to_client'
  | 'inquiry_converted_to_client'
  | 'inquiry_declined_to_client'
  | 'inquiry_expired_to_client'
  | 'event_cancelled_to_client'
  | 'event_completed_to_client'
  | 'event_in_progress_to_client'
  | 'event_paid_to_client'
  | 'points_awarded'
  | 'tier_upgraded'
  | 'guest_rsvp_received'
  | 'guest_dietary_alert'
  | 'client_allergy_changed'
  | 'guest_count_changed'
  | 'gift_card_redeemed'
  | 'new_chat_message_to_client'
  | 'dispute_funds_withdrawn'
  | 'refund_processed_to_client'
  // Raffle
  | 'raffle_entry_earned'
  | 'raffle_winner'
  | 'raffle_new_round'
  | 'raffle_drawn_chef'
  // Loyalty triggers
  | 'loyalty_trigger'
  | 'loyalty_adjustment'
  // Marketplace
  | 'marketplace_lead_stale'
  | 'proposal_declined'
  // Client follow-up rules
  | 'followup_rule_triggered'
  // Dietary safety
  | 'dietary_menu_conflict'
  // Partner referrals
  | 'referral_booking_converted'
  // Collaboration
  | 'event_collaboration_invite'

export type Notification = {
  id: string
  tenant_id: string
  recipient_id: string
  category: NotificationCategory
  action: NotificationAction
  title: string
  body: string | null
  action_url: string | null
  event_id: string | null
  inquiry_id: string | null
  client_id: string | null
  read_at: string | null
  archived_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Display config: maps actions to their visual properties
// icon = lucide-react icon name, toastByDefault = show toast on creation
export const NOTIFICATION_CONFIG: Record<
  NotificationAction,
  { category: NotificationCategory; icon: string; toastByDefault: boolean }
> = {
  // Inquiries - toast new ones (time-sensitive)
  new_inquiry: { category: 'inquiry', icon: 'Inbox', toastByDefault: true },
  inquiry_reply: { category: 'inquiry', icon: 'MessageSquare', toastByDefault: true },
  inquiry_expired: { category: 'inquiry', icon: 'Clock', toastByDefault: false },
  follow_up_due: { category: 'inquiry', icon: 'Bell', toastByDefault: true },

  // Quotes
  quote_accepted: { category: 'quote', icon: 'FileCheck', toastByDefault: true },
  quote_rejected: { category: 'quote', icon: 'FileX', toastByDefault: true },
  quote_expiring: { category: 'quote', icon: 'AlertTriangle', toastByDefault: false },

  // Events
  proposal_accepted: { category: 'event', icon: 'CheckCircle', toastByDefault: true },
  proposal_declined: { category: 'event', icon: 'XCircle', toastByDefault: true },
  event_paid: { category: 'event', icon: 'CreditCard', toastByDefault: true },
  event_confirmed: { category: 'event', icon: 'CheckCircle', toastByDefault: true },
  event_in_progress: { category: 'event', icon: 'ChefHat', toastByDefault: false },
  event_completed: { category: 'event', icon: 'PartyPopper', toastByDefault: false },
  event_cancelled: { category: 'event', icon: 'XCircle', toastByDefault: true },

  // Payments - always toast (money matters)
  payment_received: { category: 'payment', icon: 'DollarSign', toastByDefault: true },
  payment_failed: { category: 'payment', icon: 'AlertCircle', toastByDefault: true },
  refund_processed: { category: 'payment', icon: 'RotateCcw', toastByDefault: true },
  dispute_created: { category: 'payment', icon: 'ShieldAlert', toastByDefault: true },
  gift_card_purchased: { category: 'payment', icon: 'Gift', toastByDefault: true },
  ticket_purchased: { category: 'payment', icon: 'Ticket', toastByDefault: true },
  payment_due_approaching: { category: 'payment', icon: 'Bell', toastByDefault: false },
  payment_overdue: { category: 'payment', icon: 'AlertCircle', toastByDefault: true },
  payment_amount_mismatch: { category: 'payment', icon: 'AlertTriangle', toastByDefault: true },
  cancellation_pending_refund: { category: 'payment', icon: 'RotateCcw', toastByDefault: true },
  full_refund_active_event: { category: 'payment', icon: 'AlertCircle', toastByDefault: true },

  // Chat - silent by default (has its own unread system)
  new_message: { category: 'chat', icon: 'MessageCircle', toastByDefault: false },

  // Clients
  client_signup: { category: 'client', icon: 'UserPlus', toastByDefault: true },
  review_submitted: { category: 'client', icon: 'Star', toastByDefault: true },
  new_guest_lead: { category: 'lead', icon: 'UserPlus', toastByDefault: true },

  // Wix - toast new submissions (time-sensitive leads)
  wix_submission: { category: 'inquiry', icon: 'Globe', toastByDefault: true },

  // Client behavior / intent signals - always toast (time-sensitive, act now)
  client_on_payment_page: { category: 'payment', icon: 'CreditCard', toastByDefault: true },
  client_viewed_quote: { category: 'quote', icon: 'Eye', toastByDefault: true },
  quote_viewed_after_delay: { category: 'quote', icon: 'Clock', toastByDefault: true },
  client_viewed_proposal: { category: 'event', icon: 'Eye', toastByDefault: true },

  // System
  system_alert: { category: 'system', icon: 'Bell', toastByDefault: true },
  account_access_alert: { category: 'system', icon: 'ShieldAlert', toastByDefault: true },

  // Client-facing notifications (recipient_role = 'client')
  quote_sent_to_client: { category: 'quote', icon: 'FileText', toastByDefault: true },
  event_proposed_to_client: { category: 'event', icon: 'CalendarCheck', toastByDefault: true },
  event_confirmed_to_client: { category: 'event', icon: 'CheckCircle', toastByDefault: true },
  event_reminder_7d: { category: 'event', icon: 'Calendar', toastByDefault: false },
  event_reminder_2d: { category: 'event', icon: 'Calendar', toastByDefault: false },
  event_reminder_1d: { category: 'event', icon: 'Bell', toastByDefault: true },
  quote_expiring_soon: { category: 'quote', icon: 'AlertTriangle', toastByDefault: true },
  photos_ready: { category: 'event', icon: 'Camera', toastByDefault: true },

  // Loyalty
  reward_redeemed_by_client: { category: 'loyalty', icon: 'Gift', toastByDefault: true },

  // Goals
  goal_nudge: { category: 'goals', icon: 'Target', toastByDefault: false },
  goal_milestone: { category: 'goals', icon: 'Trophy', toastByDefault: true },
  goal_weekly_digest: { category: 'goals', icon: 'BarChart2', toastByDefault: false },

  // Protection - insurance expiry
  insurance_expiring_30d: { category: 'protection', icon: 'ShieldAlert', toastByDefault: false },
  insurance_expiring_7d: { category: 'protection', icon: 'ShieldAlert', toastByDefault: true },

  // Protection - certification expiry
  cert_expiring_90d: { category: 'protection', icon: 'Award', toastByDefault: false },
  cert_expiring_30d: { category: 'protection', icon: 'Award', toastByDefault: false },
  cert_expiring_7d: { category: 'protection', icon: 'Award', toastByDefault: true },

  // Reputation
  new_negative_mention: { category: 'protection', icon: 'AlertTriangle', toastByDefault: true },
  recall_alert_matched: { category: 'protection', icon: 'ShieldAlert', toastByDefault: true },

  // Wellbeing & capacity
  capacity_limit_approaching: { category: 'wellbeing', icon: 'Battery', toastByDefault: true },
  relationship_cooling: { category: 'client', icon: 'UserMinus', toastByDefault: false },
  burnout_risk_high: { category: 'wellbeing', icon: 'Flame', toastByDefault: true },

  // Professional momentum
  no_education_logged_90d: { category: 'wellbeing', icon: 'BookOpen', toastByDefault: false },
  quarterly_checkin_due: { category: 'wellbeing', icon: 'ClipboardCheck', toastByDefault: false },

  // Client portal visit - real-time visitor alert
  client_portal_visit: { category: 'client', icon: 'Eye', toastByDefault: true },

  // Restaurant Ops - Phase 7
  staff_assignment: { category: 'ops', icon: 'UserCheck', toastByDefault: true },
  task_assigned: { category: 'ops', icon: 'ClipboardList', toastByDefault: true },
  schedule_change: { category: 'ops', icon: 'CalendarClock', toastByDefault: true },
  order_status: { category: 'ops', icon: 'Package', toastByDefault: true },
  low_stock: { category: 'ops', icon: 'AlertTriangle', toastByDefault: true },
  guest_comp: { category: 'ops', icon: 'Gift', toastByDefault: true },

  // Cross-boundary gap closure
  menu_preferences_submitted: { category: 'event', icon: 'ClipboardCheck', toastByDefault: true },
  meal_request_scheduled_to_client: {
    category: 'event',
    icon: 'CalendarCheck',
    toastByDefault: true,
  },
  meal_request_declined_to_client: {
    category: 'event',
    icon: 'XCircle',
    toastByDefault: true,
  },
  meal_request_fulfilled_to_client: {
    category: 'event',
    icon: 'ChefHat',
    toastByDefault: true,
  },
  meal_recommendation_sent_to_client: {
    category: 'event',
    icon: 'FileText',
    toastByDefault: true,
  },
  meal_recommendation_approved: {
    category: 'event',
    icon: 'CheckCircle',
    toastByDefault: true,
  },
  meal_recommendation_revision_requested: {
    category: 'event',
    icon: 'Edit',
    toastByDefault: true,
  },
  client_meal_feedback_submitted: {
    category: 'client',
    icon: 'MessageSquare',
    toastByDefault: true,
  },
  menu_approved: { category: 'event', icon: 'CheckCircle', toastByDefault: true },
  menu_revision_requested: { category: 'event', icon: 'Edit', toastByDefault: true },
  contract_signed: { category: 'event', icon: 'FileCheck', toastByDefault: true },
  contract_voided: { category: 'event', icon: 'FileX', toastByDefault: true },
  inquiry_quoted_to_client: { category: 'inquiry', icon: 'FileText', toastByDefault: true },
  inquiry_converted_to_client: { category: 'event', icon: 'CalendarPlus', toastByDefault: true },
  inquiry_declined_to_client: { category: 'inquiry', icon: 'XCircle', toastByDefault: true },
  inquiry_expired_to_client: { category: 'inquiry', icon: 'Clock', toastByDefault: false },
  event_cancelled_to_client: { category: 'event', icon: 'XCircle', toastByDefault: true },
  event_completed_to_client: { category: 'event', icon: 'PartyPopper', toastByDefault: true },
  event_in_progress_to_client: { category: 'event', icon: 'ChefHat', toastByDefault: true },
  event_paid_to_client: { category: 'payment', icon: 'CreditCard', toastByDefault: true },
  points_awarded: { category: 'loyalty', icon: 'Star', toastByDefault: true },
  tier_upgraded: { category: 'loyalty', icon: 'Trophy', toastByDefault: true },
  guest_rsvp_received: { category: 'client', icon: 'UserCheck', toastByDefault: true },
  guest_dietary_alert: { category: 'client', icon: 'AlertTriangle', toastByDefault: true },
  client_allergy_changed: { category: 'client', icon: 'AlertTriangle', toastByDefault: true },
  guest_count_changed: { category: 'event', icon: 'Users', toastByDefault: true },
  gift_card_redeemed: { category: 'loyalty', icon: 'Gift', toastByDefault: true },
  new_chat_message_to_client: { category: 'chat', icon: 'MessageCircle', toastByDefault: false },
  dispute_funds_withdrawn: { category: 'payment', icon: 'ShieldAlert', toastByDefault: true },
  refund_processed_to_client: { category: 'payment', icon: 'RotateCcw', toastByDefault: true },

  // Raffle
  raffle_entry_earned: { category: 'loyalty', icon: 'Ticket', toastByDefault: false },
  raffle_winner: { category: 'loyalty', icon: 'Trophy', toastByDefault: true },
  raffle_new_round: { category: 'loyalty', icon: 'Gift', toastByDefault: true },
  raffle_drawn_chef: { category: 'loyalty', icon: 'Trophy', toastByDefault: true },

  // Loyalty triggers
  loyalty_trigger: { category: 'loyalty', icon: 'Star', toastByDefault: true },
  loyalty_adjustment: { category: 'loyalty', icon: 'AlertCircle', toastByDefault: true },

  // Marketplace
  marketplace_lead_stale: { category: 'lead', icon: 'AlertTriangle', toastByDefault: true },

  // Client follow-up rules
  followup_rule_triggered: { category: 'client', icon: 'Bell', toastByDefault: false },

  // Dietary safety
  dietary_menu_conflict: { category: 'event', icon: 'AlertTriangle', toastByDefault: true },

  // Partner referrals
  referral_booking_converted: { category: 'event', icon: 'CalendarPlus', toastByDefault: true },

  // Collaboration
  event_collaboration_invite: { category: 'event', icon: 'Users', toastByDefault: true },
}

// Category display names for preferences UI
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  inquiry: 'Inquiries',
  quote: 'Quotes',
  event: 'Events',
  payment: 'Payments',
  chat: 'Chat Messages',
  client: 'Clients',
  loyalty: 'Loyalty & Rewards',
  goals: 'Goals & Growth',
  lead: 'Leads',
  protection: 'Business Protection',
  wellbeing: 'Wellbeing & Momentum',
  review: 'Reviews & Testimonials',
  ops: 'Restaurant Ops',
  system: 'System',
}
