// Notification Type System
// Defines categories, actions, and display configuration

export type NotificationCategory =
  | 'inquiry'
  | 'quote'
  | 'event'
  | 'payment'
  | 'chat'
  | 'client'
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
  // Chat
  | 'new_message'
  // Clients
  | 'client_signup'
  | 'review_submitted'
  // System
  | 'system_alert'

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

  // Chat - silent by default (has its own unread system)
  new_message: { category: 'chat', icon: 'MessageCircle', toastByDefault: false },

  // Clients
  client_signup: { category: 'client', icon: 'UserPlus', toastByDefault: true },
  review_submitted: { category: 'client', icon: 'Star', toastByDefault: true },

  // System
  system_alert: { category: 'system', icon: 'Bell', toastByDefault: true },
}

// Category display names for preferences UI
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  inquiry: 'Inquiries',
  quote: 'Quotes',
  event: 'Events',
  payment: 'Payments',
  chat: 'Chat Messages',
  client: 'Clients',
  system: 'System',
}
