// Commerce Engine V1 - Constants & Labels
// NOT a server action file - no 'use server'.

// ─── Sale Status ──────────────────────────────────────────────────

export const SALE_STATUSES = [
  'draft',
  'pending_payment',
  'authorized',
  'captured',
  'settled',
  'partially_refunded',
  'fully_refunded',
  'voided',
] as const

export type SaleStatus = (typeof SALE_STATUSES)[number]

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  draft: 'Draft',
  pending_payment: 'Pending Payment',
  authorized: 'Authorized',
  captured: 'Captured',
  settled: 'Settled',
  partially_refunded: 'Partially Refunded',
  fully_refunded: 'Fully Refunded',
  voided: 'Voided',
}

export const SALE_STATUS_COLORS: Record<SaleStatus, string> = {
  draft: 'default',
  pending_payment: 'warning',
  authorized: 'info',
  captured: 'success',
  settled: 'success',
  partially_refunded: 'warning',
  fully_refunded: 'error',
  voided: 'error',
}

// Terminal states - no further transitions allowed
export const TERMINAL_SALE_STATUSES: SaleStatus[] = ['fully_refunded', 'voided']

// ─── Sale Channels ────────────────────────────────────────────────

export const SALE_CHANNELS = ['counter', 'order_ahead', 'invoice', 'online', 'phone'] as const

export type SaleChannel = (typeof SALE_CHANNELS)[number]

export const SALE_CHANNEL_LABELS: Record<SaleChannel, string> = {
  counter: 'Counter (POS)',
  order_ahead: 'Order Ahead',
  invoice: 'Invoice',
  online: 'Online',
  phone: 'Phone Order',
}

// ─── Commerce Payment Status ─────────────────────────────────────

export const COMMERCE_PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'captured',
  'settled',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
  'disputed',
] as const

export type CommercePaymentStatus = (typeof COMMERCE_PAYMENT_STATUSES)[number]

export const COMMERCE_PAYMENT_STATUS_LABELS: Record<CommercePaymentStatus, string> = {
  pending: 'Pending',
  authorized: 'Authorized',
  captured: 'Captured',
  settled: 'Settled',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
  disputed: 'Disputed',
}

// ─── Tax Classes ──────────────────────────────────────────────────

export const TAX_CLASSES = [
  'standard',
  'reduced',
  'exempt',
  'alcohol',
  'cannabis',
  'prepared_food',
  'zero',
] as const

export type TaxClass = (typeof TAX_CLASSES)[number]

export const TAX_CLASS_LABELS: Record<TaxClass, string> = {
  standard: 'Standard',
  reduced: 'Reduced Rate',
  exempt: 'Tax Exempt',
  alcohol: 'Alcohol',
  cannabis: 'Cannabis',
  prepared_food: 'Prepared Food',
  zero: 'Zero-Rated',
}

// ─── Refund Status ────────────────────────────────────────────────

export const REFUND_STATUSES = ['pending', 'processed', 'failed'] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

// ─── Product Categories ───────────────────────────────────────────

export const PRODUCT_CATEGORIES = [
  'appetizer',
  'entree',
  'dessert',
  'beverage',
  'side',
  'bread',
  'soup',
  'salad',
  'snack',
  'merchandise',
  'other',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  appetizer: 'Appetizer',
  entree: 'Entrée',
  dessert: 'Dessert',
  beverage: 'Beverage',
  side: 'Side',
  bread: 'Bread',
  soup: 'Soup',
  salad: 'Salad',
  snack: 'Snack',
  merchandise: 'Merchandise',
  other: 'Other',
}

// ─── Schedule Status ──────────────────────────────────────────────

export const SCHEDULE_STATUSES = ['pending', 'paid', 'overdue', 'waived'] as const
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

// ─── Register Session Status ─────────────────────────────────────

export const REGISTER_SESSION_STATUSES = ['open', 'suspended', 'closed'] as const
export type RegisterSessionStatus = (typeof REGISTER_SESSION_STATUSES)[number]

export const REGISTER_SESSION_STATUS_LABELS: Record<RegisterSessionStatus, string> = {
  open: 'Open',
  suspended: 'Suspended',
  closed: 'Closed',
}

export const REGISTER_SESSION_STATUS_COLORS: Record<RegisterSessionStatus, string> = {
  open: 'success',
  suspended: 'warning',
  closed: 'default',
}

// ─── Order Queue Status ──────────────────────────────────────────

export const ORDER_QUEUE_STATUSES = [
  'received',
  'preparing',
  'ready',
  'picked_up',
  'cancelled',
] as const
export type OrderQueueStatus = (typeof ORDER_QUEUE_STATUSES)[number]

export const ORDER_QUEUE_STATUS_LABELS: Record<OrderQueueStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
}

export const ORDER_QUEUE_STATUS_COLORS: Record<OrderQueueStatus, string> = {
  received: 'info',
  preparing: 'warning',
  ready: 'success',
  picked_up: 'default',
  cancelled: 'error',
}
