import type {
  CulinaryDictionaryReviewItem,
  CulinaryDictionaryTerm,
  DictionaryAliasKind,
  DictionaryFlagSeverity,
  DictionarySafetyFlagType,
  DictionaryTermType,
} from './types'

export type TermImpactSurface =
  | 'public_glossary'
  | 'private_dictionary'
  | 'alias_matching'
  | 'ingredient_costing'
  | 'menu_language'
  | 'dietary_safety'
  | 'allergen_safety'
  | 'staff_training'
  | 'review_queue'

export type DictionaryTermImpact = {
  termId: string
  canonicalName: string
  surfaces: TermImpactSurface[]
  reasons: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

export type RelatedTermReason =
  | 'shared_alias'
  | 'shared_category'
  | 'shared_type'
  | 'shared_safety_flag'
  | 'public_visibility'
  | 'review_status'

export type RelatedTermEdge = {
  fromTermId: string
  toTermId: string
  score: number
  reasons: RelatedTermReason[]
}

export type RelatedTermsGraph = {
  nodes: {
    termId: string
    canonicalName: string
    canonicalSlug: string
    termType: DictionaryTermType
    category: string | null
    publicSafe: boolean
    needsReview: boolean
  }[]
  edges: RelatedTermEdge[]
}

export type AliasConflict = {
  normalizedAlias: string
  aliases: {
    termId: string
    canonicalName: string
    aliasId: string
    alias: string
    aliasKind: DictionaryAliasKind
    confidence: number
    needsReview: boolean
  }[]
  conflictLevel: 'review' | 'warning' | 'critical'
}

export type DictionaryCoverageSummary = {
  totalTerms: number
  unresolvedReviewItems: number
  unresolvedReviewItemsBySurface: Record<string, number>
  publicTerms: number
  privateTerms: number
  publicRatio: number
  privateRatio: number
  termsNeedingReview: number
  aliasesNeedingReview: number
  termsWithSafetyFlags: number
  safetyFlagCounts: Record<DictionarySafetyFlagType, number>
  safetySeverityCounts: Record<DictionaryFlagSeverity, number>
}

const INGREDIENT_COSTING_TYPES = new Set<DictionaryTermType>([
  'ingredient',
  'allergen',
  'dietary',
])

const MENU_LANGUAGE_TYPES = new Set<DictionaryTermType>([
  'ingredient',
  'technique',
  'cut',
  'sauce',
  'texture',
  'flavor',
  'dietary',
  'composition',
])

const STAFF_TRAINING_TYPES = new Set<DictionaryTermType>([
  'technique',
  'cut',
  'sauce',
  'texture',
  'equipment',
  'service',
  'composition',
])

const SAFETY_FLAG_TYPES: DictionarySafetyFlagType[] = [
  'allergen',
  'dietary_violation',
  'dietary_caution',
  'cross_contact',
]

const SAFETY_SEVERITIES: DictionaryFlagSeverity[] = ['info', 'caution', 'critical']

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function stableTermSort<T extends { canonicalName: string; termId?: string; id?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const nameCompare = a.canonicalName.localeCompare(b.canonicalName)
    if (nameCompare !== 0) return nameCompare
    return (a.termId ?? a.id ?? '').localeCompare(b.termId ?? b.id ?? '')
  })
}

function addImpact(
  surfaces: Set<TermImpactSurface>,
  reasons: string[],
  surface: TermImpactSurface,
  reason: string
) {
  surfaces.add(surface)
  reasons.push(reason)
}

export function getDictionaryTermImpact(
  term: CulinaryDictionaryTerm
): DictionaryTermImpact {
  const surfaces = new Set<TermImpactSurface>()
  const reasons: string[] = []

  addImpact(surfaces, reasons, 'private_dictionary', 'The term is available in the chef dictionary.')

  if (term.publicSafe) {
    addImpact(surfaces, reasons, 'public_glossary', 'The term is marked safe for public display.')
  }

  if (term.aliases.length > 0) {
    addImpact(surfaces, reasons, 'alias_matching', 'The term has aliases that can affect matching.')
  }

  if (INGREDIENT_COSTING_TYPES.has(term.termType)) {
    addImpact(surfaces, reasons, 'ingredient_costing', 'The term type can affect ingredient matching and costing.')
  }

  if (MENU_LANGUAGE_TYPES.has(term.termType)) {
    addImpact(surfaces, reasons, 'menu_language', 'The term type can affect menu and client-facing language.')
  }

  if (STAFF_TRAINING_TYPES.has(term.termType)) {
    addImpact(surfaces, reasons, 'staff_training', 'The term type can affect staff vocabulary and prep clarity.')
  }

  if (term.safetyFlags.some((flag) => flag.flagType === 'allergen' || flag.flagType === 'cross_contact')) {
    addImpact(surfaces, reasons, 'allergen_safety', 'The term has allergen or cross-contact safety flags.')
  }

  if (
    term.termType === 'dietary' ||
    term.safetyFlags.some((flag) => flag.flagType === 'dietary_violation' || flag.flagType === 'dietary_caution')
  ) {
    addImpact(surfaces, reasons, 'dietary_safety', 'The term can affect dietary safety decisions.')
  }

  if (term.needsReview || term.aliases.some((alias) => alias.needsReview)) {
    addImpact(surfaces, reasons, 'review_queue', 'The term or one of its aliases needs review.')
  }

  const hasCriticalSafetyFlag = term.safetyFlags.some((flag) => flag.severity === 'critical')
  const riskLevel = hasCriticalSafetyFlag ? 'high' : term.needsReview || term.safetyFlags.length > 0 ? 'medium' : 'low'

  return {
    termId: term.id,
    canonicalName: term.canonicalName,
    surfaces: sortStrings([...surfaces]) as TermImpactSurface[],
    reasons: sortStrings(reasons),
    riskLevel,
  }
}

export function getDictionaryTermImpactMap(
  terms: CulinaryDictionaryTerm[]
): Record<string, DictionaryTermImpact> {
  const entries = stableTermSort(terms).map((term) => [term.id, getDictionaryTermImpact(term)] as const)
  return Object.fromEntries(entries)
}

function getAliasKeys(term: CulinaryDictionaryTerm): Set<string> {
  return new Set(term.aliases.map((alias) => alias.normalizedAlias).filter(Boolean))
}

function getSafetyKeys(term: CulinaryDictionaryTerm): Set<string> {
  return new Set(term.safetyFlags.map((flag) => `${flag.flagType}:${flag.flagKey}`).filter(Boolean))
}

function sharedValues(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => right.has(value)).sort((a, b) => a.localeCompare(b))
}

function buildRelatedEdge(
  left: CulinaryDictionaryTerm,
  right: CulinaryDictionaryTerm
): RelatedTermEdge | null {
  const reasons: RelatedTermReason[] = []
  let score = 0

  if (sharedValues(getAliasKeys(left), getAliasKeys(right)).length > 0) {
    reasons.push('shared_alias')
    score += 50
  }

  if (left.category && left.category === right.category) {
    reasons.push('shared_category')
    score += 20
  }

  if (left.termType === right.termType) {
    reasons.push('shared_type')
    score += 10
  }

  if (sharedValues(getSafetyKeys(left), getSafetyKeys(right)).length > 0) {
    reasons.push('shared_safety_flag')
    score += 30
  }

  if (left.publicSafe === right.publicSafe) {
    reasons.push('public_visibility')
    score += 5
  }

  if (left.needsReview === right.needsReview) {
    reasons.push('review_status')
    score += 5
  }

  if (reasons.length === 0) return null

  return {
    fromTermId: left.id,
    toTermId: right.id,
    score,
    reasons: reasons.sort((a, b) => a.localeCompare(b)),
  }
}

export function buildRelatedTermsGraph(terms: CulinaryDictionaryTerm[]): RelatedTermsGraph {
  const sortedTerms = stableTermSort(terms.map((term) => ({ ...term, termId: term.id })))
  const edges: RelatedTermEdge[] = []

  for (let leftIndex = 0; leftIndex < sortedTerms.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sortedTerms.length; rightIndex += 1) {
      const edge = buildRelatedEdge(sortedTerms[leftIndex], sortedTerms[rightIndex])
      if (edge) edges.push(edge)
    }
  }

  return {
    nodes: sortedTerms.map((term) => ({
      termId: term.id,
      canonicalName: term.canonicalName,
      canonicalSlug: term.canonicalSlug,
      termType: term.termType,
      category: term.category,
      publicSafe: term.publicSafe,
      needsReview: term.needsReview,
    })),
    edges: edges.sort((a, b) => {
      const fromCompare = a.fromTermId.localeCompare(b.fromTermId)
      if (fromCompare !== 0) return fromCompare
      return a.toTermId.localeCompare(b.toTermId)
    }),
  }
}

export function detectAliasConflicts(terms: CulinaryDictionaryTerm[]): AliasConflict[] {
  const aliasesByNormalizedValue = new Map<string, AliasConflict['aliases']>()

  for (const term of stableTermSort(terms)) {
    for (const alias of [...term.aliases].sort((a, b) => a.alias.localeCompare(b.alias))) {
      if (!alias.normalizedAlias) continue

      const aliases = aliasesByNormalizedValue.get(alias.normalizedAlias) ?? []
      aliases.push({
        termId: term.id,
        canonicalName: term.canonicalName,
        aliasId: alias.id,
        alias: alias.alias,
        aliasKind: alias.aliasKind,
        confidence: alias.confidence,
        needsReview: alias.needsReview,
      })
      aliasesByNormalizedValue.set(alias.normalizedAlias, aliases)
    }
  }

  return [...aliasesByNormalizedValue.entries()]
    .filter(([, aliases]) => new Set(aliases.map((alias) => alias.termId)).size > 1)
    .map(([normalizedAlias, aliases]) => {
      const sortedAliases = aliases.sort((a, b) => {
        const termCompare = a.canonicalName.localeCompare(b.canonicalName)
        if (termCompare !== 0) return termCompare
        return a.alias.localeCompare(b.alias)
      })
      const hasHighConfidenceConflict = sortedAliases.some((alias) => alias.confidence >= 0.9)
      const hasReviewAlias = sortedAliases.some((alias) => alias.needsReview)
      const conflictLevel: AliasConflict['conflictLevel'] = hasHighConfidenceConflict
        ? 'critical'
        : hasReviewAlias
          ? 'review'
          : 'warning'

      return {
        normalizedAlias,
        aliases: sortedAliases,
        conflictLevel,
      }
    })
    .sort((a, b) => a.normalizedAlias.localeCompare(b.normalizedAlias))
}

function countBySurface(reviewItems: CulinaryDictionaryReviewItem[]): Record<string, number> {
  const counts = new Map<string, number>()

  for (const item of reviewItems) {
    if (item.status !== 'pending') continue
    counts.set(item.sourceSurface, (counts.get(item.sourceSurface) ?? 0) + 1)
  }

  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

function countSafetyFlags(terms: CulinaryDictionaryTerm[]): {
  flagTypes: Record<DictionarySafetyFlagType, number>
  severities: Record<DictionaryFlagSeverity, number>
} {
  const flagTypes = Object.fromEntries(SAFETY_FLAG_TYPES.map((type) => [type, 0])) as Record<
    DictionarySafetyFlagType,
    number
  >
  const severities = Object.fromEntries(SAFETY_SEVERITIES.map((severity) => [severity, 0])) as Record<
    DictionaryFlagSeverity,
    number
  >

  for (const term of terms) {
    for (const flag of term.safetyFlags) {
      flagTypes[flag.flagType] += 1
      severities[flag.severity] += 1
    }
  }

  return { flagTypes, severities }
}

export function summarizeDictionaryCoverage(
  terms: CulinaryDictionaryTerm[],
  reviewItems: CulinaryDictionaryReviewItem[]
): DictionaryCoverageSummary {
  const publicTerms = terms.filter((term) => term.publicSafe).length
  const privateTerms = terms.length - publicTerms
  const unresolvedReviewItems = reviewItems.filter((item) => item.status === 'pending').length
  const safetyCounts = countSafetyFlags(terms)

  return {
    totalTerms: terms.length,
    unresolvedReviewItems,
    unresolvedReviewItemsBySurface: countBySurface(reviewItems),
    publicTerms,
    privateTerms,
    publicRatio: terms.length === 0 ? 0 : publicTerms / terms.length,
    privateRatio: terms.length === 0 ? 0 : privateTerms / terms.length,
    termsNeedingReview: terms.filter((term) => term.needsReview).length,
    aliasesNeedingReview: terms.reduce(
      (count, term) => count + term.aliases.filter((alias) => alias.needsReview).length,
      0
    ),
    termsWithSafetyFlags: terms.filter((term) => term.safetyFlags.length > 0).length,
    safetyFlagCounts: safetyCounts.flagTypes,
    safetySeverityCounts: safetyCounts.severities,
  }
}
