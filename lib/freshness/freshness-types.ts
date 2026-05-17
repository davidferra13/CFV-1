export type FreshnessLevel = 'fresh' | 'recent' | 'aging' | 'stale' | 'outdated'

export interface FreshnessThresholds {
  fresh: number // days, e.g. 0-7
  recent: number // days, e.g. 8-30
  aging: number // days, e.g. 31-90
  stale: number // days, e.g. 91-180
  // beyond stale = outdated
}

export interface FreshnessResult {
  entityType: string
  entityId: string
  entityName: string
  level: FreshnessLevel
  daysSinceUpdate: number
  lastUpdatedAt: string | null
  recommendation: string | null
}

export interface StalenessSummary {
  fresh: number
  recent: number
  aging: number
  stale: number
  outdated: number
  total: number
  stalestItems: FreshnessResult[]
}

// Default thresholds per entity type
export const FRESHNESS_THRESHOLDS: Record<string, FreshnessThresholds> = {
  recipe: { fresh: 30, recent: 90, aging: 180, stale: 365 },
  client: { fresh: 14, recent: 60, aging: 120, stale: 365 },
  menu: { fresh: 7, recent: 30, aging: 90, stale: 180 },
  venue: { fresh: 60, recent: 180, aging: 365, stale: 730 },
  ingredient_price: { fresh: 3, recent: 14, aging: 30, stale: 60 },
}
