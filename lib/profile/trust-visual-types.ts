// Trust Visual Types - Public Profile & Marketplace Trust Visual Upgrade (UI SYSTEM #40)

export type TrustTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type TrustSignal =
  | 'verified_identity'
  | 'background_check'
  | 'food_safety_cert'
  | 'insurance_verified'
  | 'response_rate'
  | 'repeat_clients'
  | 'years_experience'
  | 'reviews_count'

export interface TrustBadge {
  id: string
  name: string
  icon: string
  tier: TrustTier
  description: string
  earnedAt: string
}

export interface TrustSignalEntry {
  signal: TrustSignal
  verified: boolean
  value?: number | string
  verifiedAt?: string
  expiresAt?: string
}

export interface TrustDisplayConfig {
  showScore: boolean
  showBadges: boolean
  showSignals: boolean
  highlightedBadges: string[]
  customOrder: string[]
}

export interface TrustProfile {
  id: string
  tenantId: string
  chefId: string
  badges: TrustBadge[]
  signals: TrustSignalEntry[]
  trustScore: number
  verifiedAt: string | null
  displayConfig: TrustDisplayConfig
}

export interface TrustProfileSummary {
  chefId: string
  trustScore: number
  badgeCount: number
  topBadge?: TrustBadge
  verifiedSignals: number
  lastUpdated: string
}

// Scoring weights per signal type
export const TRUST_SIGNAL_WEIGHTS: Record<TrustSignal, number> = {
  verified_identity: 20,
  background_check: 15,
  food_safety_cert: 15,
  insurance_verified: 10,
  response_rate: 10,
  repeat_clients: 10,
  years_experience: 10,
  reviews_count: 10,
}

export const DEFAULT_DISPLAY_CONFIG: TrustDisplayConfig = {
  showScore: true,
  showBadges: true,
  showSignals: true,
  highlightedBadges: [],
  customOrder: [],
}
