import type { MatchSuggestion } from './ingredient-matching-utils'

export interface IngredientHealthStats {
  total: number
  confirmed: number
  pending: number
  unmatched: number
  dismissed: number
  coveragePct: number | null
}

export interface PendingMatch {
  ingredientId: string
  ingredientName: string
  category: string | null
  systemIngredientId: string
  systemIngredientName: string
  similarityScore: number
  matchMethod: string
}

export interface UnresolvedIngredient {
  id: string
  name: string
  category: string | null
  suggestions: MatchSuggestion[]
}

export interface CostingRepairIngredient {
  ingredientId: string
  ingredientName: string
  category: string | null
  detail: string
}

export interface CostingRepairGroup {
  count: number
  ingredients: CostingRepairIngredient[]
}

export interface StalePriceRepairGroup extends CostingRepairGroup {
  staleAfterDays: number
}

export interface CostingRepairSummary {
  missingPrices: CostingRepairGroup
  stalePrices: StalePriceRepairGroup
  missingDensity: CostingRepairGroup
  missingDefaultYield: CostingRepairGroup
  totalBlockers: number
}

export interface IngredientHealthSummary {
  stats: IngredientHealthStats
  pendingMatches: PendingMatch[]
  unresolvedIngredients: UnresolvedIngredient[]
  costingRepair: CostingRepairSummary
}
