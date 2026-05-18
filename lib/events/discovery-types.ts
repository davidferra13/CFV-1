// Discovery Fields Types
// Interfaces for event discovery/atmosphere fields and vendor coordination.

export interface SurpriseDetails {
  isSurprise: boolean
  honoree: string
  coordinationNotes: string
}

export type SocialMediaConsent = 'full' | 'restricted' | 'none' | 'undiscussed'

export type VendorType =
  | 'florist'
  | 'photographer'
  | 'dj'
  | 'rental'
  | 'linen'
  | 'av'
  | 'decor'
  | 'entertainment'
  | 'transport'
  | 'other'

export interface DiscoveryFields {
  dress_code: string | null
  table_presentation: string | null
  surprise_details: SurpriseDetails | null
  social_media_consent: SocialMediaConsent | null
  vibe_atmosphere: string | null
  vendor_coordination_notes: string | null
  confidentiality_required: boolean
}

export interface VendorInput {
  vendor_type: VendorType
  vendor_name: string
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  arrival_time?: string | null
  departure_time?: string | null
  cost_cents?: number | null
  notes?: string | null
}

export interface EventVendor {
  id: string
  event_id: string
  tenant_id: string
  vendor_type: VendorType
  vendor_name: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  arrival_time: string | null
  departure_time: string | null
  cost_cents: number | null
  notes: string | null
  confirmed: boolean
  confirmed_at: string | null
  created_at: string
  updated_at: string
}
