export const DICTIONARY_TERM_TYPES = [
  'ingredient',
  'technique',
  'cut',
  'sauce',
  'texture',
  'flavor',
  'dietary',
  'allergen',
  'equipment',
  'service',
  'composition',
  'other',
] as const

export const DICTIONARY_ALIAS_KINDS = [
  'synonym',
  'spelling',
  'abbreviation',
  'plural',
  'regional',
  'brand',
  'misspelling',
  'prep_form',
] as const

export const DICTIONARY_REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'dismissed'] as const

export type DictionaryTermType = (typeof DICTIONARY_TERM_TYPES)[number]
export type DictionaryAliasKind = (typeof DICTIONARY_ALIAS_KINDS)[number]
export type DictionaryReviewStatus = (typeof DICTIONARY_REVIEW_STATUSES)[number]
export type DictionarySource = 'system' | 'chef' | 'import' | 'manual_review'
export type DictionaryFlagSeverity = 'info' | 'caution' | 'critical'
export type DictionarySafetyFlagType =
  | 'allergen'
  | 'dietary_violation'
  | 'dietary_caution'
  | 'cross_contact'

export type CulinaryDictionaryAlias = {
  id: string
  termId: string
  alias: string
  normalizedAlias: string
  aliasKind: DictionaryAliasKind
  confidence: number
  source: DictionarySource
  needsReview: boolean
}

export type CulinaryDictionarySafetyFlag = {
  id: string
  termId: string
  flagType: DictionarySafetyFlagType
  flagKey: string
  severity: DictionaryFlagSeverity
  explanation: string | null
  source: 'system' | 'chef' | 'manual_review'
}

export type CulinaryDictionaryTerm = {
  id: string
  canonicalSlug: string
  canonicalName: string
  termType: DictionaryTermType
  category: string | null
  shortDefinition: string | null
  longDefinition: string | null
  publicSafe: boolean
  source: DictionarySource
  confidence: number
  needsReview: boolean
  aliases: CulinaryDictionaryAlias[]
  safetyFlags: CulinaryDictionarySafetyFlag[]
}

export type CulinaryDictionaryStats = {
  totalTerms: number
  publicTerms: number
  aliasCount: number
  pendingReviews: number
  chefOverrides: number
}

export type CulinaryDictionaryReviewItem = {
  id: string
  sourceSurface: string
  sourceValue: string
  normalizedValue: string
  suggestedTermId: string | null
  suggestedAliasId: string | null
  suggestedTermName: string | null
  confidence: number | null
  status: DictionaryReviewStatus
  createdAt: string
}

export type DictionaryAliasSuggestion = {
  termId: string
  canonicalName: string
  canonicalSlug: string
  alias: string
  normalizedAlias: string
  aliasKind: DictionaryAliasKind
  confidence: number
}
