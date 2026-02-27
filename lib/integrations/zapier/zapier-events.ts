export const ZAPIER_EVENT_TYPES = [
  'inquiry.created',
  'inquiry.updated',
  'event.created',
  'event.status_changed',
  'event.completed',
  'client.created',
  'client.updated',
  'payment.received',
  'payment.refunded',
  'invoice.created',
  'invoice.sent',
  'quote.sent',
  'quote.accepted',
  'contract.signed',
  'expense.created',
  'review.received',
  'task.completed',
] as const

export type ZapierEventType = (typeof ZAPIER_EVENT_TYPES)[number]
