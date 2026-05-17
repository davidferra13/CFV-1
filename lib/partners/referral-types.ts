// Referral Partner Types
// Canonical type definitions for the referral partner system.
// Aligned with existing DB schema (partner_type and partner_status enums).

export type PartnerType = 'airbnb_host' | 'business' | 'platform' | 'individual' | 'venue' | 'other'
export type PartnerStatus = 'active' | 'inactive'

export interface ReferralPartner {
  id: string
  tenant_id: string
  name: string
  partner_type: PartnerType
  status: PartnerStatus
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  booking_url: string | null
  description: string | null
  cover_image_url: string | null
  is_showcase_visible: boolean
  showcase_order: number | null
  notes: string | null
  commission_notes: string | null
  created_at: string
  updated_at: string
  share_token: string | null
  auth_user_id: string | null
  invite_token: string | null
  invite_sent_at: string | null
  claimed_at: string | null
  origin_client_id: string | null
  origin_event_id: string | null
  acquisition_source: string | null
}

export interface ReferralRecord {
  id: string
  tenant_id: string
  partner_id: string
  client_id: string | null
  event_id: string | null
  revenue_cents: number
  notes: string | null
  referred_at: string
}

export interface PartnerPerformance {
  partnerId: string
  partnerName: string
  totalReferrals: number
  convertedReferrals: number
  conversionRate: number
  totalRevenueCents: number
  avgDealValueCents: number
}
