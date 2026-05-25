/**
 * Category-aware 4-state freshness model for PIE.
 * Pure functions (no 'use server'), importable from both server and client code.
 */

export type FreshnessState = 'fresh' | 'aging' | 'stale' | 'expired'
export type FreshnessCategory = 'volatile' | 'moderate' | 'stable' | 'specialty'

interface FreshnessThresholds {
  freshMax: number
  agingMax: number
  staleMax: number
}

const THRESHOLDS: Record<FreshnessCategory, FreshnessThresholds> = {
  volatile: { freshMax: 3, agingMax: 7, staleMax: 14 },
  moderate: { freshMax: 7, agingMax: 14, staleMax: 30 },
  stable: { freshMax: 14, agingMax: 30, staleMax: 60 },
  specialty: { freshMax: 7, agingMax: 14, staleMax: 30 },
}

const CATEGORY_MAP: Record<string, FreshnessCategory> = {
  produce: 'volatile',
  dairy: 'volatile',
  meat: 'volatile',
  seafood: 'volatile',
  eggs: 'volatile',
  poultry: 'volatile',
  fish: 'volatile',
  bakery: 'moderate',
  deli: 'moderate',
  frozen: 'moderate',
  prepared: 'moderate',
  'dry goods': 'stable',
  spices: 'stable',
  canned: 'stable',
  oils: 'stable',
  grains: 'stable',
  pantry: 'stable',
  condiments: 'stable',
  pasta: 'stable',
  rice: 'stable',
  flour: 'stable',
  sugar: 'stable',
  imported: 'specialty',
  artisanal: 'specialty',
  seasonal: 'specialty',
  specialty: 'specialty',
}

export function getCategoryFromIngredient(ingredientCategory: string | null): FreshnessCategory {
  if (!ingredientCategory) return 'moderate'
  const key = ingredientCategory.toLowerCase().trim()
  return CATEGORY_MAP[key] || 'moderate'
}

export function computeCategoryFreshness(
  dateStr: string | null,
  category: FreshnessCategory
): FreshnessState {
  if (!dateStr) return 'expired'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'expired'
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 0) return 'fresh'
  const t = THRESHOLDS[category]
  if (daysDiff <= t.freshMax) return 'fresh'
  if (daysDiff <= t.agingMax) return 'aging'
  if (daysDiff <= t.staleMax) return 'stale'
  return 'expired'
}

export function getAgeDays(dateStr: string | null): number {
  if (!dateStr) return 999
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 999
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

export function freshnessColor(state: FreshnessState): string {
  switch (state) {
    case 'fresh':
      return 'text-emerald-400'
    case 'aging':
      return 'text-stone-400'
    case 'stale':
      return 'text-amber-400'
    case 'expired':
      return 'text-red-400'
  }
}

export function freshnessBgColor(state: FreshnessState): string {
  switch (state) {
    case 'fresh':
      return 'bg-emerald-900/30 border-emerald-700/40'
    case 'aging':
      return 'bg-stone-800/50 border-stone-700/40'
    case 'stale':
      return 'bg-amber-900/20 border-amber-700/40'
    case 'expired':
      return 'bg-red-900/20 border-red-700/40'
  }
}

export function freshnessLabel(state: FreshnessState, ageDays: number): string {
  switch (state) {
    case 'fresh':
      return ageDays === 0 ? 'Today' : ageDays === 1 ? '1 day ago' : `${ageDays} days ago`
    case 'aging':
      return `Updated ${ageDays} days ago`
    case 'stale':
      return `Stale (${ageDays} days old)`
    case 'expired':
      return `Expired price (${ageDays} days old)`
  }
}
