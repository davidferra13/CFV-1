export type UniversalRailRole =
  | 'public'
  | 'guest'
  | 'client'
  | 'chef'
  | 'staff'
  | 'partner'
  | 'admin'

export const UNIVERSAL_RAIL_ROLES = [
  'public',
  'guest',
  'client',
  'chef',
  'staff',
  'partner',
  'admin',
] as const

export type UniversalRailCategory = string

export type UniversalRailPresentation =
  | 'pill'
  | 'card'
  | 'badge'
  | 'story'
  | 'visual_card'
  | 'alert'
  | 'progress'
  | 'banner'
  | 'metric'
  | 'countdown'

export type UniversalRailClickAction =
  | 'navigate'
  | 'toggle_filter'
  | 'expand_inline'
  | 'quick_action'
  | 'open_modal'
  | 'deep_link'

export type UniversalRailHoverAction = 'preview' | 'expand' | 'none'

export type UniversalRailDecayFn = 'deadline' | 'linear' | 'step' | 'inverse' | 'none'

export type UniversalRailPrivacy =
  | 'public'
  | 'account_private'
  | 'tenant_scoped'
  | 'role_scoped'
  | 'system'

export interface UniversalRailRenderHints {
  presentation: UniversalRailPresentation
  icon?: string
  color?: string
  animate?: boolean
  priority?: 'high' | 'normal' | 'low'
}

export interface UniversalRailItemDefinition {
  id: string
  role: UniversalRailRole
  label: string
  labelTemplate: string
  category: string
  subcategory?: string
  baseUrgency: number
  urgencyDecayFn: UniversalRailDecayFn
  relevanceSignals: string[]
  freshnessWindow: string
  pageAffinity: string
  pageAffinityBoost: number
  href: string
  hrefTemplate: string
  dataSources: string[]
  privacy: UniversalRailPrivacy
  dismissable: boolean
  expandable: boolean
  hoverAction: UniversalRailHoverAction
  clickAction: UniversalRailClickAction
  maxImpressions: number
  cooldownMinutes: number
  renderHints: UniversalRailRenderHints
  scoringNotes: string
}

export interface UniversalRailWeightProfile {
  urgency: number
  relevance: number
  freshness: number
  userAffinity: number
  fatigue: number
  boost: number
}

export interface UniversalRailScoreBreakdown {
  urgency: number
  relevance: number
  freshness: number
  userAffinity: number
  fatigue: number
  boost: number
  final: number
  weights: UniversalRailWeightProfile
}

export interface UniversalRailItem {
  definitionId: string
  role: UniversalRailRole
  label: string
  sublabel?: string
  category: string
  presentation: UniversalRailPresentation
  icon?: string
  href: string
  score: number
  baseUrgency: number
  urgencyDecayFn: UniversalRailDecayFn
  privacy: UniversalRailPrivacy
  dismissable: boolean
  expandable: boolean
  hoverAction: UniversalRailHoverAction
  clickAction: UniversalRailClickAction
  maxImpressions: number
  cooldownMinutes: number
  impressionCount: number
  lastSeenAt: string | null
  dismissedAt: string | null
  expiresAt: string | null
  metadata: Record<string, unknown>
  debugScore?: UniversalRailScoreBreakdown
}

export interface UniversalRailAssemblyOptions {
  role: UniversalRailRole
  userId?: string
  tenantId?: string
  pageContext?: string
  now?: Date
  limit?: number
  hiddenIds?: string[]
  dismissedIds?: string[]
  savedIds?: string[]
  pinnedIds?: string[]
  impressions?: Map<string, { count: number; lastSeenAt: Date }>
  filters?: Record<string, string | string[]>
  includeDebugScores?: boolean
}

export interface UniversalRailAssemblyResult {
  items: UniversalRailItem[]
  totalCandidates: number
  filteredOut: number
  role: UniversalRailRole
  assembledAt: string
  pageContext: string | null
}

export interface UniversalRailSlotPolicy {
  maxNonPracticalRatio: number
  maxPromotionalCount: number
  minPracticalCount: number
  maxEditorialCount: number
}

export const DEFAULT_SLOT_POLICY: UniversalRailSlotPolicy = {
  maxNonPracticalRatio: 0.2,
  maxPromotionalCount: 2,
  minPracticalCount: 3,
  maxEditorialCount: 3,
}
