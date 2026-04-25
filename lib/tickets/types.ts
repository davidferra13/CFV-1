// Event Ticketing System - Type Definitions

export type TicketPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
export type TicketSource = 'chefflow' | 'eventbrite' | 'facebook' | 'groupon' | 'walkin' | 'comp'
export type DistributionPlatform = 'eventbrite' | 'facebook' | 'google' | 'groupon' | 'instagram'
export type DistributionSyncStatus = 'draft' | 'published' | 'synced' | 'failed' | 'archived'

export interface EventTicketType {
  id: string
  event_id: string
  tenant_id: string
  name: string
  description: string | null
  price_cents: number
  capacity: number | null
  sold_count: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed
  remaining?: number | null
}

export interface EventTicket {
  id: string
  event_id: string
  tenant_id: string
  ticket_type_id: string | null
  buyer_name: string
  buyer_email: string
  buyer_phone: string | null
  quantity: number
  unit_price_cents: number
  total_cents: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  payment_status: TicketPaymentStatus
  payment_failure_count: number
  last_payment_error: string | null
  payment_failed_at: string | null
  retry_available_at: string | null
  capacity_released_at: string | null
  guest_token: string
  hub_profile_id: string | null
  event_guest_id: string | null
  dietary_restrictions: string[]
  allergies: string[]
  plus_one_name: string | null
  plus_one_dietary: string[]
  plus_one_allergies: string[]
  notes: string | null
  source: TicketSource
  external_order_id: string | null
  attended: boolean | null
  created_at: string
  cancelled_at: string | null
  // Joined
  ticket_type?: EventTicketType | null
}

export interface EventTicketSummary {
  event_id: string
  tenant_id: string
  tickets_sold: number
  tickets_pending: number
  tickets_refunded: number
  guests_confirmed: number
  revenue_cents: number
  refunded_cents: number
  channel_count: number
  sales_by_source: Record<string, number>
}

export interface EventDistribution {
  id: string
  event_id: string
  tenant_id: string
  platform: DistributionPlatform
  external_event_id: string | null
  external_url: string | null
  sync_status: DistributionSyncStatus
  last_synced_at: string | null
  sync_error: string | null
  link_back_url: string | null
  auto_sync: boolean
  created_at: string
  updated_at: string
}
