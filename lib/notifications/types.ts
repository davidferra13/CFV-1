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
  | 'event_completed'
  | 'event_cancelled'
  // Payments
  | 'payment_received'
  | 'payment_failed'
  | 'refund_processed'
  | 'dispute_created'
  | 'gift_card_purchased'
  | 'payment_due_approaching'
  | 'payment_overdue'
  // Chat
  | 'new_message'
  // Clients
  | 'client_signup'
  | 'review_submitted'
  // Wix
  | 'wix_submission'
  // Client behavior / intent signals
  | 'client_on_payment_page'
  | 'client_viewed_quote'
  | 'quote_viewed_after_delay'
  | 'client_viewed_proposal'
  // System
  | 'system_alert'
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
  event_paid: { category: 'event', icon: 'CreditCard', toastByDefault: true },
  event_completed: { category: 'event', icon: 'PartyPopper', toastByDefault: false },
  event_cancelled: { category: 'event', icon: 'XCircle', toastByDefault: true },

  // Payments - always toast (money matters)
  payment_received: { category: 'payment', icon: 'DollarSign', toastByDefault: true },
  payment_failed: { category: 'payment', icon: 'AlertCircle', toastByDefault: true },
  refund_processed: { category: 'payment', icon: 'RotateCcw', toastByDefault: true },
  dispute_created: { category: 'payment', icon: 'ShieldAlert', toastByDefault: true },
  gift_card_purchased: { category: 'payment', icon: 'Gift', toastByDefault: true },
  payment_due_approaching: { category: 'payment', icon: 'Bell', toastByDefault: false },
  payment_overdue: { category: 'payment', icon: 'AlertCircle', toastByDefault: true },

  // Chat - silent by default (has its own unread system)
  new_message: { category: 'chat', icon: 'MessageCircle', toastByDefault: false },

  // Clients
  client_signup: { category: 'client', icon: 'UserPlus', toastByDefault: true },
  review_submitted: { category: 'client', icon: 'Star', toastByDefault: true },

  // Wix - toast new submissions (time-sensitive leads)
  wix_submission: { category: 'inquiry', icon: 'Globe', toastByDefault: true },

  // Client behavior / intent signals — always toast (time-sensitive, act now)
  client_on_payment_page: { category: 'payment', icon: 'CreditCard', toastByDefault: true },
  client_viewed_quote: { category: 'quote', icon: 'Eye', toastByDefault: true },
  quote_viewed_after_delay: { category: 'quote', icon: 'Clock', toastByDefault: true },
  client_viewed_proposal: { category: 'event', icon: 'Eye', toastByDefault: true },

  // System
  system_alert: { category: 'system', icon: 'Bell', toastByDefault: true },

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
  system: 'System',
}
