import { normalizeCulinaryTerm } from './normalization'
import type {
  CulinaryDictionaryAlias,
  CulinaryDictionaryReviewItem,
  CulinaryDictionaryTerm,
  DictionaryReviewStatus,
} from './types'

const PUBLIC_CONFIDENCE_FLOOR = 0.8
const REVIEW_CONFIDENCE_FLOOR = 0.7

type TermPublicationReason =
  | 'public_safe'
  | 'chef_only'
  | 'term_needs_review'
  | 'low_confidence'
  | 'alias_needs_review'

export type VocabularyPublicationGate = {
  termId: string
  canonicalName: string
  canonicalSlug: string
  publicSafe: boolean
  canPublishPublicly: boolean
  reasons: TermPublicationReason[]
}

export type VocabularyStandardTerm = {
  termId: string
  canonicalName: string
  canonicalSlug: string
  termType: CulinaryDictionaryTerm['termType']
  normalizedName: string
  aliases: string[]
  publicSafe: boolean
  source: CulinaryDictionaryTerm['source']
  confidence: number
}

export type VocabularyReviewCandidate = {
  value: string
  normalizedValue: string
  reason:
    | 'term_needs_review'
    | 'alias_needs_review'
    | 'review_pending'
    | 'low_confidence'
    | 'unmatched_review_item'
  termId: string | null
  reviewItemId: string | null
  confidence: number | null
}

export type VocabularyAliasGap = {
  value: string
  normalizedValue: string
  suggestedTermId: string
  suggestedTermName: string | null
  reviewItemId: string
  reviewStatus: Extract<DictionaryReviewStatus, 'pending' | 'approved'>
}

export type VocabularyLabelFinding = {
  value: string
  normalizedValue: string
  reason:
    | 'review_rejected'
    | 'review_dismissed'
    | 'duplicate_alias'
    | 'low_confidence_review'
    | 'unmatched_review_item'
  termIds: string[]
  reviewItemId: string | null
}

export type ChefVocabularyStandards = {
  preferredTerms: VocabularyStandardTerm[]
  chefOnlyTerms: VocabularyStandardTerm[]
  publicSafeCandidates: VocabularyStandardTerm[]
  needsReviewCandidates: VocabularyReviewCandidate[]
  aliasGaps: VocabularyAliasGap[]
  avoidLabels: VocabularyLabelFinding[]
  ambiguousLabels: VocabularyLabelFinding[]
  publicationGates: VocabularyPublicationGate[]
}

type TermAliasIndex = Map<string, Map<string, CulinaryDictionaryAlias>>

export function evaluateVocabularyPublicationGate(
  term: CulinaryDictionaryTerm
): VocabularyPublicationGate {
  const reasons: TermPublicationReason[] = []

  if (!term.publicSafe) reasons.push('chef_only')
  if (term.needsReview) reasons.push('term_needs_review')
  if (term.confidence < PUBLIC_CONFIDENCE_FLOOR) reasons.push('low_confidence')
  if (term.aliases.some((alias) => alias.needsReview)) reasons.push('alias_needs_review')
  if (reasons.length === 0) reasons.push('public_safe')

  return {
    termId: term.id,
    canonicalName: term.canonicalName,
    canonicalSlug: term.canonicalSlug,
    publicSafe: term.publicSafe,
    canPublishPublicly: reasons.length === 1 && reasons[0] === 'public_safe',
    reasons,
  }
}

export function buildChefVocabularyStandards(
  terms: CulinaryDictionaryTerm[],
  reviewItems: CulinaryDictionaryReviewItem[]
): ChefVocabularyStandards {
  const sortedTerms = [...terms].sort(compareTerms)
  const sortedReviewItems = [...reviewItems].sort(compareReviewItems)
  const termById = new Map(sortedTerms.map((term) => [term.id, term]))
  const aliasesByTermId = buildAliasIndex(sortedTerms)
  const duplicateAliasFindings = findDuplicateAliasLabels(sortedTerms)

  const publicationGates = sortedTerms.map(evaluateVocabularyPublicationGate)
  const gateByTermId = new Map(publicationGates.map((gate) => [gate.termId, gate]))

  const preferredTerms = sortedTerms
    .filter((term) => !term.needsReview && term.confidence >= REVIEW_CONFIDENCE_FLOOR)
    .map(toStandardTerm)

  const chefOnlyTerms = sortedTerms
    .filter((term) => gateByTermId.get(term.id)?.canPublishPublicly !== true)
    .map(toStandardTerm)

  const publicSafeCandidates = sortedTerms
    .filter((term) => gateByTermId.get(term.id)?.canPublishPublicly === true)
    .map(toStandardTerm)

  const needsReviewCandidates = [
    ...findTermReviewCandidates(sortedTerms),
    ...findReviewItemReviewCandidates(sortedReviewItems),
  ].sort(compareReviewCandidates)

  const aliasGaps = sortedReviewItems
    .filter((item) => isAliasGap(item, termById, aliasesByTermId))
    .map((item) => ({
      value: item.sourceValue,
      normalizedValue: normalizedReviewValue(item),
      suggestedTermId: item.suggestedTermId!,
      suggestedTermName: item.suggestedTermName,
      reviewItemId: item.id,
      reviewStatus: item.status as Extract<DictionaryReviewStatus, 'pending' | 'approved'>,
    }))
    .sort(compareAliasGaps)

  const avoidLabels: VocabularyLabelFinding[] = sortedReviewItems
    .filter((item) => item.status === 'rejected' || item.status === 'dismissed')
    .map((item) => {
      const reason: VocabularyLabelFinding['reason'] =
        item.status === 'rejected' ? 'review_rejected' : 'review_dismissed'

      return {
        value: item.sourceValue,
        normalizedValue: normalizedReviewValue(item),
        reason,
        termIds: item.suggestedTermId ? [item.suggestedTermId] : [],
        reviewItemId: item.id,
      }
    })
    .sort(compareLabelFindings)

  const ambiguousReviewLabels: VocabularyLabelFinding[] = sortedReviewItems
    .filter(isAmbiguousReviewItem)
    .map((item) => {
      const reason: VocabularyLabelFinding['reason'] = item.suggestedTermId
        ? 'low_confidence_review'
        : 'unmatched_review_item'

      return {
        value: item.sourceValue,
        normalizedValue: normalizedReviewValue(item),
        reason,
        termIds: item.suggestedTermId ? [item.suggestedTermId] : [],
        reviewItemId: item.id,
      }
    })

  const ambiguousLabels = [...duplicateAliasFindings, ...ambiguousReviewLabels].sort(
    compareLabelFindings
  )

  return {
    preferredTerms,
    chefOnlyTerms,
    publicSafeCandidates,
    needsReviewCandidates,
    aliasGaps,
    avoidLabels,
    ambiguousLabels,
    publicationGates,
  }
}

function toStandardTerm(term: CulinaryDictionaryTerm): VocabularyStandardTerm {
  return {
    termId: term.id,
    canonicalName: term.canonicalName,
    canonicalSlug: term.canonicalSlug,
    termType: term.termType,
    normalizedName: normalizeCulinaryTerm(term.canonicalName),
    aliases: [...term.aliases]
      .filter((alias) => !alias.needsReview)
      .map((alias) => alias.alias)
      .sort(compareStrings),
    publicSafe: term.publicSafe,
    source: term.source,
    confidence: term.confidence,
  }
}

function findTermReviewCandidates(terms: CulinaryDictionaryTerm[]): VocabularyReviewCandidate[] {
  const candidates: VocabularyReviewCandidate[] = []

  for (const term of terms) {
    if (term.needsReview) {
      candidates.push({
        value: term.canonicalName,
        normalizedValue: normalizeCulinaryTerm(term.canonicalName),
        reason: 'term_needs_review',
        termId: term.id,
        reviewItemId: null,
        confidence: term.confidence,
      })
    }

    if (term.confidence < REVIEW_CONFIDENCE_FLOOR) {
      candidates.push({
        value: term.canonicalName,
        normalizedValue: normalizeCulinaryTerm(term.canonicalName),
        reason: 'low_confidence',
        termId: term.id,
        reviewItemId: null,
        confidence: term.confidence,
      })
    }

    for (const alias of term.aliases) {
      if (!alias.needsReview) continue

      candidates.push({
        value: alias.alias,
        normalizedValue: alias.normalizedAlias || normalizeCulinaryTerm(alias.alias),
        reason: 'alias_needs_review',
        termId: term.id,
        reviewItemId: null,
        confidence: alias.confidence,
      })
    }
  }

  return candidates
}

function findReviewItemReviewCandidates(
  reviewItems: CulinaryDictionaryReviewItem[]
): VocabularyReviewCandidate[] {
  return reviewItems
    .filter((item) => item.status === 'pending')
    .map((item) => ({
      value: item.sourceValue,
      normalizedValue: normalizedReviewValue(item),
      reason: item.suggestedTermId ? 'review_pending' : 'unmatched_review_item',
      termId: item.suggestedTermId,
      reviewItemId: item.id,
      confidence: item.confidence,
    }))
}

function isAliasGap(
  item: CulinaryDictionaryReviewItem,
  termById: Map<string, CulinaryDictionaryTerm>,
  aliasesByTermId: TermAliasIndex
): boolean {
  if (!item.suggestedTermId) return false
  if (item.status !== 'pending' && item.status !== 'approved') return false

  const term = termById.get(item.suggestedTermId)
  if (!term) return false

  const normalizedValue = normalizedReviewValue(item)
  if (!normalizedValue) return false
  if (normalizeCulinaryTerm(term.canonicalName) === normalizedValue) return false

  return aliasesByTermId.get(term.id)?.has(normalizedValue) !== true
}

function findDuplicateAliasLabels(terms: CulinaryDictionaryTerm[]): VocabularyLabelFinding[] {
  const termIdsByLabel = new Map<string, Set<string>>()
  const displayValueByLabel = new Map<string, string>()

  for (const term of terms) {
    const labels = [term.canonicalName, ...term.aliases.map((alias) => alias.alias)]

    for (const label of labels) {
      const normalizedLabel = normalizeCulinaryTerm(label)
      if (!normalizedLabel) continue

      displayValueByLabel.set(normalizedLabel, displayValueByLabel.get(normalizedLabel) || label)

      const termIds = termIdsByLabel.get(normalizedLabel) || new Set<string>()
      termIds.add(term.id)
      termIdsByLabel.set(normalizedLabel, termIds)
    }
  }

  return [...termIdsByLabel.entries()]
    .filter(([, termIds]) => termIds.size > 1)
    .map(([normalizedValue, termIds]) => ({
      value: displayValueByLabel.get(normalizedValue) || normalizedValue,
      normalizedValue,
      reason: 'duplicate_alias',
      termIds: [...termIds].sort(compareStrings),
      reviewItemId: null,
    }))
}

function isAmbiguousReviewItem(item: CulinaryDictionaryReviewItem): boolean {
  if (item.status !== 'pending') return false
  if (!item.suggestedTermId) return true
  return item.confidence !== null && item.confidence < REVIEW_CONFIDENCE_FLOOR
}

function buildAliasIndex(terms: CulinaryDictionaryTerm[]): TermAliasIndex {
  const index: TermAliasIndex = new Map()

  for (const term of terms) {
    const aliasesByNormalizedValue = new Map<string, CulinaryDictionaryAlias>()

    for (const alias of term.aliases) {
      const normalizedAlias = alias.normalizedAlias || normalizeCulinaryTerm(alias.alias)
      if (!normalizedAlias) continue
      aliasesByNormalizedValue.set(normalizedAlias, alias)
    }

    index.set(term.id, aliasesByNormalizedValue)
  }

  return index
}

function normalizedReviewValue(item: CulinaryDictionaryReviewItem): string {
  return item.normalizedValue || normalizeCulinaryTerm(item.sourceValue)
}

function compareTerms(a: CulinaryDictionaryTerm, b: CulinaryDictionaryTerm): number {
  return (
    compareStrings(a.canonicalName, b.canonicalName) ||
    compareStrings(a.canonicalSlug, b.canonicalSlug) ||
    compareStrings(a.id, b.id)
  )
}

function compareReviewItems(
  a: CulinaryDictionaryReviewItem,
  b: CulinaryDictionaryReviewItem
): number {
  return (
    compareStrings(a.sourceValue, b.sourceValue) ||
    compareStrings(a.createdAt, b.createdAt) ||
    compareStrings(a.id, b.id)
  )
}

function compareReviewCandidates(
  a: VocabularyReviewCandidate,
  b: VocabularyReviewCandidate
): number {
  return (
    compareStrings(a.normalizedValue, b.normalizedValue) ||
    compareStrings(a.reason, b.reason) ||
    compareStrings(a.reviewItemId || '', b.reviewItemId || '') ||
    compareStrings(a.termId || '', b.termId || '')
  )
}

function compareAliasGaps(a: VocabularyAliasGap, b: VocabularyAliasGap): number {
  return (
    compareStrings(a.normalizedValue, b.normalizedValue) ||
    compareStrings(a.suggestedTermId, b.suggestedTermId) ||
    compareStrings(a.reviewItemId, b.reviewItemId)
  )
}

function compareLabelFindings(a: VocabularyLabelFinding, b: VocabularyLabelFinding): number {
  return (
    compareStrings(a.normalizedValue, b.normalizedValue) ||
    compareStrings(a.reason, b.reason) ||
    compareStrings(a.reviewItemId || '', b.reviewItemId || '') ||
    compareStrings(a.termIds.join(','), b.termIds.join(','))
  )
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b)
}
