export type DetailCategory =
  | 'micro_interaction'
  | 'loading_polish'
  | 'transition'
  | 'hover_state'
  | 'focus_ring'
  | 'shadow'
  | 'border_radius'
  | 'spacing_rhythm'

export interface PremiumDetailItem {
  id: string
  tenantId: string
  route: string
  component?: string | null
  category: DetailCategory
  description: string
  implemented: boolean
  priority: 'high' | 'medium' | 'low'
  createdAt: Date
  implementedAt?: Date | null
}

export interface PremiumDetailAudit {
  id: string
  tenantId: string
  route: string
  totalDetails: number
  implemented: number
  missing: number
  score: number
  auditedAt: Date
}

export interface PremiumDetailSummary {
  totalItems: number
  implemented: number
  missing: number
  byCategory: Record<DetailCategory, { total: number; implemented: number }>
  avgScore: number
}
