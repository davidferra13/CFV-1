/**
 * Fixed Menu Offerings - Types
 *
 * A menu offering is a published, bookable menu product on a chef's storefront.
 * Clients can browse, select, and book offerings directly.
 */

// -------------------------------------------------------------------
// Core offering type (DB row shape)
// -------------------------------------------------------------------

export interface MenuOffering {
  id: string
  tenant_id: string
  menu_id: string
  price_per_head_cents: number
  min_guests: number
  max_guests: number
  available_seasons: string[]
  available_days_of_week: number[] | null
  booking_lead_time_days: number
  active: boolean
  slug: string
  sort_order: number
  tagline: string | null
  hero_image_url: string | null
  description: string | null
  view_count: number
  booking_count: number
  last_booked_at: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

// -------------------------------------------------------------------
// Public-facing offering (joined with menu data)
// -------------------------------------------------------------------

export interface PublicOffering {
  id: string
  slug: string
  price_per_head_cents: number
  min_guests: number
  max_guests: number
  tagline: string | null
  hero_image_url: string | null
  description: string | null
  available_seasons: string[]
  available_days_of_week: number[] | null
  booking_lead_time_days: number
  booking_count: number
  menu: {
    id: string
    name: string
    cuisine_type: string | null
    service_style: string | null
    dish_count: number
    dietary_tags: string[]
  }
}

// -------------------------------------------------------------------
// Offering availability window
// -------------------------------------------------------------------

export interface OfferingAvailability {
  available_seasons: string[]
  available_days_of_week: number[] | null
  booking_lead_time_days: number
  min_guests: number
  max_guests: number
}

// -------------------------------------------------------------------
// Inputs
// -------------------------------------------------------------------

export interface PublishOfferingInput {
  price_per_head_cents: number
  min_guests?: number
  max_guests?: number
  available_seasons?: string[]
  available_days_of_week?: number[] | null
  booking_lead_time_days?: number
  slug?: string
  tagline?: string | null
  hero_image_url?: string | null
  description?: string | null
}

export interface UpdateOfferingInput {
  price_per_head_cents?: number
  min_guests?: number
  max_guests?: number
  available_seasons?: string[]
  available_days_of_week?: number[] | null
  booking_lead_time_days?: number
  tagline?: string | null
  hero_image_url?: string | null
  description?: string | null
  sort_order?: number
  active?: boolean
}

export interface BookingInput {
  event_date: string
  guest_count: number
  location: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  notes?: string
}

// -------------------------------------------------------------------
// Offering booking record (analytics + "the usual")
// -------------------------------------------------------------------

export interface OfferingBooking {
  id: string
  offering_id: string
  event_id: string
  client_id: string
  booked_at: string
  guest_count: number
  price_per_head_cents: number
  total_cents: number
}
