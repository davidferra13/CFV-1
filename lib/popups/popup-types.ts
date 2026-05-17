// Pop-Up Operating System - Core Types
// Dedicated chef_popups table types (distinct from circle_config JSON approach)

export type PopupStatus = 'draft' | 'published' | 'soldout' | 'cancelled' | 'completed'

export type Popup = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  venue_name: string | null
  venue_address: string | null
  venue_lat: number | null
  venue_lng: number | null
  event_date: string | null
  doors_open: string | null
  service_start: string | null
  capacity: number | null
  ticket_price_cents: number | null
  menu_id: string | null
  status: PopupStatus
  published_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

export type PopupDashboard = {
  popup: Popup
  ticketsSold: number
  ticketsPending: number
  totalRevenueCents: number
  refundedCents: number
  capacityRemaining: number | null
  guestList: PopupGuest[]
  salesBySource: Record<string, number>
}

export type PopupGuest = {
  id: string
  buyer_name: string
  buyer_email: string
  quantity: number
  total_cents: number
  payment_status: string
  source: string
  created_at: string
}

export type TicketSale = {
  id: string
  popup_id: string
  ticket_type_id: string | null
  ticket_type_name: string | null
  buyer_name: string
  buyer_email: string
  quantity: number
  unit_price_cents: number
  total_cents: number
  payment_status: string
  source: string
  created_at: string
}

export type CreatePopupInput = {
  name: string
  description?: string | null
  venueName?: string | null
  venueAddress?: string | null
  venueLat?: number | null
  venueLng?: number | null
  eventDate?: string | null
  doorsOpen?: string | null
  serviceStart?: string | null
  capacity?: number | null
  ticketPriceCents?: number | null
  menuId?: string | null
}

export type UpdatePopupInput = {
  name?: string
  description?: string | null
  venueName?: string | null
  venueAddress?: string | null
  venueLat?: number | null
  venueLng?: number | null
  eventDate?: string | null
  doorsOpen?: string | null
  serviceStart?: string | null
  capacity?: number | null
  ticketPriceCents?: number | null
  menuId?: string | null
}
