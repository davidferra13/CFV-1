// Outbound Webhook Types
// Defines event types, subscription shape, and delivery log entries
// for the chef-facing webhook system.

export type WebhookEventType =
  // Events
  | 'event.created'
  | 'event.updated'
  | 'event.transitioned'
  | 'event.deleted'
  // Clients
  | 'client.created'
  | 'client.updated'
  // Quotes
  | 'quote.created'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.rejected'
  // Inquiries
  | 'inquiry.received'
  | 'inquiry.updated'
  // Payments
  | 'payment.received'
  | 'payment.failed'
  // Expenses
  | 'expense.logged'
  // Menus
  | 'menu.created'
  | 'menu.updated'
  // Documents
  | 'document.generated'

/** All supported webhook event types as a flat array (for UI checkboxes). */
export const ALL_WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'event.created',
  'event.updated',
  'event.transitioned',
  'event.deleted',
  'client.created',
  'client.updated',
  'quote.created',
  'quote.sent',
  'quote.accepted',
  'quote.rejected',
  'inquiry.received',
  'inquiry.updated',
  'payment.received',
  'payment.failed',
  'expense.logged',
  'menu.created',
  'menu.updated',
  'document.generated',
]

/** Human-readable labels keyed by event type. */
export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  'event.created': 'Event Created',
  'event.updated': 'Event Updated',
  'event.transitioned': 'Event Status Changed',
  'event.deleted': 'Event Deleted',
  'client.created': 'Client Created',
  'client.updated': 'Client Updated',
  'quote.created': 'Quote Created',
  'quote.sent': 'Quote Sent',
  'quote.accepted': 'Quote Accepted',
  'quote.rejected': 'Quote Rejected',
  'inquiry.received': 'Inquiry Received',
  'inquiry.updated': 'Inquiry Updated',
  'payment.received': 'Payment Received',
  'payment.failed': 'Payment Failed',
  'expense.logged': 'Expense Logged',
  'menu.created': 'Menu Created',
  'menu.updated': 'Menu Updated',
  'document.generated': 'Document Generated',
}

export interface WebhookSubscription {
  id: string
  tenant_id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  description: string | null
  last_triggered_at: string | null
  failure_count: number
  created_at: string
  updated_at: string
}

export interface DeliveryLogEntry {
  id: string
  endpoint_id: string
  tenant_id: string
  event_type: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  duration_ms: number | null
  success: boolean
  status: string
  created_at: string
}
