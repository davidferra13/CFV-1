export { normalizeIngredientName } from '@/lib/culinary-dictionary/normalization'

// ============================================
// SHARED TYPES
// ============================================

export interface MatchSuggestion {
  systemIngredientId: string
  name: string
  score: number
  category: string
  source?: 'trigram' | 'dictionary'
  dictionaryTerm?: string
}

export interface SuggestMatchesResult {
  suggestions: MatchSuggestion[]
  currentAlias: { name: string; confirmedAt: string } | null
}

export interface UnmatchedIngredient {
  id: string
  name: string
  category: string | null
  suggestions: MatchSuggestion[]
}
