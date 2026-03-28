import pluralize from 'pluralize'

// ============================================
// NAME NORMALIZATION (deterministic, no AI)
// ============================================

const ABBREVIATIONS: Record<string, string> = {
  evoo: 'extra virgin olive oil',
  'ap flour': 'all purpose flour',
  'a.p. flour': 'all purpose flour',
  ap: 'all purpose',
  tbsp: 'tablespoon',
  tsp: 'teaspoon',
  pkg: 'package',
  pkt: 'packet',
  lg: 'large',
  sm: 'small',
  med: 'medium',
  oz: 'ounce',
  lb: 'pound',
  lbs: 'pound',
  qt: 'quart',
  pt: 'pint',
  gal: 'gallon',
}

const ARTICLES = new Set(['a', 'an', 'the', 'of'])

/**
 * Normalize an ingredient name for matching.
 * Deterministic, no AI. Formula > AI.
 */
export function normalizeIngredientName(name: string): string {
  let result = name.trim().toLowerCase()

  // Remove parentheses but keep contents as separate tokens
  result = result.replace(/[()]/g, ' ')

  // Remove common punctuation
  result = result.replace(/[,.'"/]/g, ' ')

  // Collapse hyphens to spaces
  result = result.replace(/-/g, ' ')

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim()

  // Expand abbreviations (check multi-word first, then single-word)
  for (const [abbr, expanded] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\b`, 'gi')
    result = result.replace(regex, expanded)
  }

  // Strip articles
  const tokens = result.split(' ').filter((t) => !ARTICLES.has(t))

  // Depluralize each token using the pluralize library
  const singularTokens = tokens.map((t) => {
    // Skip very short words and words that are already abbreviations
    if (t.length <= 2) return t
    return pluralize.singular(t)
  })

  return singularTokens.join(' ').replace(/\s+/g, ' ').trim()
}

// ============================================
// SHARED TYPES
// ============================================

export interface MatchSuggestion {
  systemIngredientId: string
  name: string
  score: number
  category: string
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
