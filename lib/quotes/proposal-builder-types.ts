export type AddOnCategory =
  | 'course'
  | 'beverage'
  | 'equipment'
  | 'service'
  | 'dietary'
  | 'experience'
export type TradeoffDirection = 'upgrade' | 'downgrade' | 'swap'

export interface ProposalAddOn {
  id: string
  name: string
  description: string
  category: AddOnCategory
  price_delta_cents: number
  is_percentage: boolean
  percentage_delta: number | null
}

export interface ProposalTradeoff {
  id: string
  from_option: string
  to_option: string
  direction: TradeoffDirection
  price_delta_cents: number
  description: string
}

export interface ProposalTier {
  id: string
  name: string
  description: string
  base_price_cents: number
  included_items: string[]
  recommended: boolean
}

export interface ProposalExperience {
  id: string
  event_id: string
  tenant_id: string
  tiers: ProposalTier[]
  add_ons: ProposalAddOn[]
  tradeoffs: ProposalTradeoff[]
  selected_tier_id: string | null
  selected_add_on_ids: string[]
  selected_tradeoff_ids: string[]
  total_cents: number
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired'
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  created_at: string
}
