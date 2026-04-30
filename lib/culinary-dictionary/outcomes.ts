import { auditCulinaryLanguage } from './language-auditor'
import { normalizeCulinaryTerm } from './normalization'
import { detectAliasConflicts, type AliasConflict } from './term-intelligence'
import { evaluateVocabularyPublicationGate } from './vocabulary-standards'
import type {
  CulinaryDictionaryReviewItem,
  CulinaryDictionarySafetyFlag,
  CulinaryDictionaryTerm,
} from './types'

export type DictionarySurfaceKind =
  | 'menu_copy'
  | 'staff_prep'
  | 'ingredient_page'
  | 'costing'
  | 'recipe_note'
  | 'public_page'
  | 'dictionary_search'

export type DictionaryTextSurface = {
  id: string
  title: string
  surface: DictionarySurfaceKind
  text: string
  href?: string
}

export type DictionarySurfaceMatch = {
  termId: string
  canonicalName: string
  canonicalSlug: string
  termType: CulinaryDictionaryTerm['termType']
  matchedValue: string
  source: 'canonical' | 'alias'
  publicSafe: boolean
  safetySeverity: 'none' | CulinaryDictionarySafetyFlag['severity']
  href: string
}

export type DictionarySurfaceAnalysis = DictionaryTextSurface & {
  normalizedText: string
  matches: DictionarySurfaceMatch[]
}

export type MenuPublishPreflight = {
  canPublish: boolean
  blockerCount: number
  warningCount: number
  matchedTerms: DictionarySurfaceMatch[]
  blockers: string[]
  warnings: string[]
  nextSteps: string[]
}

export type PublicInternalLanguageFinding = {
  id: string
  severity: 'info' | 'caution' | 'critical'
  evidence: string
  message: string
  nextStep: string
  href?: string
}

export type PrepSpecificityItem = {
  id: string
  field:
    | 'quantity'
    | 'cut_size'
    | 'doneness'
    | 'temperature'
    | 'holding'
    | 'plating'
    | 'station'
  label: string
  severity: 'info' | 'caution' | 'critical'
  evidence: string
  nextStep: string
}

export type SafetyCoverageBoard = {
  totalSafetyTerms: number
  criticalTerms: number
  missingPublicDefinitions: Array<{
    termId: string
    canonicalName: string
    canonicalSlug: string
    reason: 'not_public_safe' | 'missing_definition'
  }>
  flagCounts: Record<CulinaryDictionarySafetyFlag['flagType'], number>
}

export type TermHistoryEvent = {
  id: string
  occurredAt: string
  label: string
  detail: string
  href?: string
}

export type BatchReviewGroup = {
  id: string
  label: string
  action: 'approve_aliases' | 'review_unmatched' | 'dismiss_low_value' | 'resolve_conflicts'
  itemIds: string[]
  count: number
  nextStep: string
}

export type SearchMissReviewCandidate = {
  sourceSurface: 'dictionary_search'
  sourceValue: string
  normalizedValue: string
  shouldCapture: boolean
  reason: 'empty_query' | 'already_matched' | 'new_review_candidate'
}

export type AliasConflictResolutionOption = {
  normalizedAlias: string
  conflictLevel: AliasConflict['conflictLevel']
  option: 'keep_separate' | 'map_alias' | 'mark_private' | 'reject_alias'
  label: string
  affectedTermIds: string[]
}

const SAFETY_FLAG_TYPES: CulinaryDictionarySafetyFlag['flagType'][] = [
  'allergen',
  'dietary_violation',
  'dietary_caution',
  'cross_contact',
]

const INTERNAL_LANGUAGE_PATTERNS: Array<{
  pattern: RegExp
  evidence: string
  severity: PublicInternalLanguageFinding['severity']
  message: string
  nextStep: string
}> = [
  {
    pattern: /\b(fire|pickup|pickup time|station|mise|batch|par|hold|walk in|lowboy)\b/i,
    evidence: 'station shorthand',
    severity: 'caution',
    message: 'Client-facing copy appears to include station or service shorthand.',
    nextStep: 'Move operational language to staff prep or link it to a chef-only dictionary term.',
  },
  {
    pattern: /\b(vendor|case price|invoice|yield|trim loss|food cost)\b/i,
    evidence: 'costing language',
    severity: 'caution',
    message: 'Client-facing copy appears to include costing or vendor language.',
    nextStep: 'Keep costing language in internal prep or costing notes.',
  },
  {
    pattern: /\b(as needed|until done|to taste|some|a little)\b/i,
    evidence: 'ambiguous service instruction',
    severity: 'info',
    message: 'The copy includes an instruction that is hard to verify.',
    nextStep: 'Turn the instruction into a reviewed prep standard before using it operationally.',
  },
]

export function analyzeDictionaryTextSurface(
  surface: DictionaryTextSurface,
  terms: CulinaryDictionaryTerm[],
): DictionarySurfaceAnalysis {
  const normalizedText = normalizeCulinaryTerm(surface.text)

  return {
    ...surface,
    normalizedText,
    matches: findDictionarySurfaceMatches(normalizedText, terms),
  }
}

export function findDictionarySurfaceMatches(
  normalizedText: string,
  terms: CulinaryDictionaryTerm[],
): DictionarySurfaceMatch[] {
  if (!normalizedText) return []

  const matches = new Map<string, DictionarySurfaceMatch>()

  for (const term of terms) {
    const canonicalValue = normalizeCulinaryTerm(term.canonicalName)
    if (containsNormalizedPhrase(normalizedText, canonicalValue)) {
      matches.set(`${term.id}:canonical:${canonicalValue}`, toSurfaceMatch(term, term.canonicalName, 'canonical'))
    }

    for (const alias of term.aliases) {
      const aliasValue = alias.normalizedAlias || normalizeCulinaryTerm(alias.alias)
      if (!containsNormalizedPhrase(normalizedText, aliasValue)) continue
      matches.set(`${term.id}:alias:${aliasValue}`, toSurfaceMatch(term, alias.alias, 'alias'))
    }
  }

  return [...matches.values()].sort(compareSurfaceMatches)
}

export function buildDictionarySurfaceImpactDrilldown(
  surfaces: DictionaryTextSurface[],
  terms: CulinaryDictionaryTerm[],
): DictionarySurfaceAnalysis[] {
  return surfaces
    .map((surface) => analyzeDictionaryTextSurface(surface, terms))
    .filter((surface) => surface.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length || a.title.localeCompare(b.title))
}

export function buildMenuPublishPreflight(input: {
  text: string
  terms: CulinaryDictionaryTerm[]
}): MenuPublishPreflight {
  const audit = auditCulinaryLanguage({
    text: input.text,
    dictionaryTerms: input.terms,
    surface: 'menu',
  })
  const surface = analyzeDictionaryTextSurface(
    {
      id: 'menu-publish-preflight',
      title: 'Menu publish preflight',
      surface: 'menu_copy',
      text: input.text,
    },
    input.terms,
  )
  const matchedTermIds = new Set(surface.matches.map((match) => match.termId))
  const matchedTerms = input.terms.filter((term) => matchedTermIds.has(term.id))
  const blockers: string[] = []
  const warnings: string[] = []

  for (const term of matchedTerms) {
    const hasCriticalSafety = term.safetyFlags.some((flag) => flag.severity === 'critical')
    if (hasCriticalSafety) {
      blockers.push(`${term.canonicalName} carries a critical safety flag.`)
    }

    const gate = evaluateVocabularyPublicationGate(term)
    if (!gate.canPublishPublicly) {
      warnings.push(`${term.canonicalName} is not clean for public publication.`)
    }
  }

  for (const finding of audit.findings) {
    if (finding.severity === 'critical') {
      blockers.push(finding.message)
    } else {
      warnings.push(finding.message)
    }
  }

  const uniqueBlockers = uniqueSorted(blockers)
  const uniqueWarnings = uniqueSorted(warnings)

  return {
    canPublish: uniqueBlockers.length === 0,
    blockerCount: uniqueBlockers.length,
    warningCount: uniqueWarnings.length,
    matchedTerms: surface.matches,
    blockers: uniqueBlockers,
    warnings: uniqueWarnings,
    nextSteps: buildPreflightNextSteps(uniqueBlockers, uniqueWarnings),
  }
}

export function guardPublicInternalLanguage(input: {
  text: string
  terms: CulinaryDictionaryTerm[]
}): PublicInternalLanguageFinding[] {
  const findings: PublicInternalLanguageFinding[] = []
  const surface = analyzeDictionaryTextSurface(
    {
      id: 'public-internal-language',
      title: 'Public copy',
      surface: 'public_page',
      text: input.text,
    },
    input.terms,
  )

  for (const match of surface.matches) {
    if (match.publicSafe) continue
    findings.push({
      id: `private-term-${match.termId}`,
      severity: 'caution',
      evidence: match.matchedValue,
      message: `${match.canonicalName} is chef-only vocabulary.`,
      nextStep: 'Keep the term internal or clear its publication gate before using it publicly.',
      href: match.href,
    })
  }

  for (const pattern of INTERNAL_LANGUAGE_PATTERNS) {
    if (!pattern.pattern.test(input.text)) continue
    findings.push({
      id: `internal-${normalizeCulinaryTerm(pattern.evidence).replace(/\s+/g, '-')}`,
      severity: pattern.severity,
      evidence: pattern.evidence,
      message: pattern.message,
      nextStep: pattern.nextStep,
    })
  }

  return dedupeFindings(findings)
}

export function buildPrepSpecificityChecklist(input: {
  text: string
  terms: CulinaryDictionaryTerm[]
}): PrepSpecificityItem[] {
  const audit = auditCulinaryLanguage({
    text: input.text,
    dictionaryTerms: input.terms,
    surface: 'staff_prep',
  })
  const normalizedText = normalizeCulinaryTerm(input.text)
  const items: PrepSpecificityItem[] = []

  if (/\b(as needed|as desired|to taste|some|a little|a few)\b/i.test(input.text)) {
    items.push(makePrepItem('quantity', 'Quantity or range', 'critical', 'open quantity'))
  }

  if (/\b(cut|slice|chop|dice)\b/i.test(input.text) && !/\b(inch|brunoise|julienne|batonnet|small dice|large dice)\b/i.test(input.text)) {
    items.push(makePrepItem('cut_size', 'Cut size', 'critical', 'unspecified knife cut'))
  }

  if (/\b(until done|cook through|finish cooking|properly cooked)\b/i.test(input.text)) {
    items.push(makePrepItem('doneness', 'Doneness cue', 'critical', 'unclear doneness'))
  }

  if (!containsAny(normalizedText, ['hot', 'warm', 'cold', 'chilled', 'room temperature', 'ambient'])) {
    items.push(makePrepItem('temperature', 'Service temperature', 'caution', 'missing temperature'))
  }

  if (/\b(hold|store|reserve)\b/i.test(input.text) && !/\b(chilled|hot|covered|sealed|label|dated)\b/i.test(input.text)) {
    items.push(makePrepItem('holding', 'Holding standard', 'caution', 'unclear holding'))
  }

  if (/\b(garnish|plate|portion)\b/i.test(input.text) && !/\b(each|per plate|per guest|count|grams|ounces|oz)\b/i.test(input.text)) {
    items.push(makePrepItem('plating', 'Plating or portion standard', 'caution', 'unclear plating'))
  }

  if (!/\b(station|garde manger|hot line|pastry|expo|prep cook)\b/i.test(input.text)) {
    items.push(makePrepItem('station', 'Owner or station', 'info', 'missing station'))
  }

  for (const finding of audit.findings.filter((finding) => finding.type === 'staff_prep_ambiguity')) {
    items.push({
      id: `audit-${normalizeCulinaryTerm(finding.evidence).replace(/\s+/g, '-')}`,
      field: mapPrepField(finding.evidence),
      label: finding.evidence,
      severity: finding.severity,
      evidence: finding.evidence,
      nextStep: finding.hint,
    })
  }

  return dedupePrepItems(items)
}

export function buildSafetyCoverageBoard(terms: CulinaryDictionaryTerm[]): SafetyCoverageBoard {
  const flagCounts = Object.fromEntries(SAFETY_FLAG_TYPES.map((type) => [type, 0])) as Record<
    CulinaryDictionarySafetyFlag['flagType'],
    number
  >
  const missingPublicDefinitions: SafetyCoverageBoard['missingPublicDefinitions'] = []
  let criticalTerms = 0

  for (const term of [...terms].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))) {
    if (term.safetyFlags.length === 0) continue
    if (term.safetyFlags.some((flag) => flag.severity === 'critical')) criticalTerms += 1

    for (const flag of term.safetyFlags) {
      flagCounts[flag.flagType] += 1
    }

    if (!term.publicSafe) {
      missingPublicDefinitions.push({
        termId: term.id,
        canonicalName: term.canonicalName,
        canonicalSlug: term.canonicalSlug,
        reason: 'not_public_safe',
      })
    } else if (!term.shortDefinition && !term.longDefinition) {
      missingPublicDefinitions.push({
        termId: term.id,
        canonicalName: term.canonicalName,
        canonicalSlug: term.canonicalSlug,
        reason: 'missing_definition',
      })
    }
  }

  return {
    totalSafetyTerms: terms.filter((term) => term.safetyFlags.length > 0).length,
    criticalTerms,
    missingPublicDefinitions,
    flagCounts,
  }
}

export function buildTermHistoryTimeline(
  term: CulinaryDictionaryTerm,
  reviewItems: CulinaryDictionaryReviewItem[],
): TermHistoryEvent[] {
  const events: TermHistoryEvent[] = [
    {
      id: `${term.id}-created`,
      occurredAt: 'source',
      label: 'Term available',
      detail: `${term.canonicalName} entered the dictionary from ${term.source}.`,
      href: `/culinary/dictionary?term=${term.canonicalSlug}`,
    },
  ]

  for (const alias of term.aliases) {
    events.push({
      id: `${alias.id}-alias`,
      occurredAt: 'source',
      label: alias.needsReview ? 'Alias pending review' : 'Alias available',
      detail: `${alias.alias} maps to ${term.canonicalName} as ${alias.aliasKind}.`,
      href: `/culinary/dictionary?q=${encodeURIComponent(alias.alias)}`,
    })
  }

  for (const flag of term.safetyFlags) {
    events.push({
      id: `${flag.id}-safety`,
      occurredAt: 'source',
      label: `${flag.severity} safety flag`,
      detail: `${flag.flagType.replace(/_/g, ' ')}: ${flag.flagKey}`,
      href: `/culinary/dictionary?term=${term.canonicalSlug}`,
    })
  }

  for (const item of reviewItems) {
    if (item.suggestedTermId !== term.id) continue
    events.push({
      id: `${item.id}-review`,
      occurredAt: item.createdAt,
      label: `Review ${item.status}`,
      detail: `${item.sourceValue} came from ${item.sourceSurface}.`,
      href: `/culinary/dictionary?q=${encodeURIComponent(item.sourceValue)}`,
    })
  }

  return events.sort(compareHistoryEvents)
}

export function buildBatchReviewGroups(
  reviewItems: CulinaryDictionaryReviewItem[],
): BatchReviewGroup[] {
  const pending = reviewItems.filter((item) => item.status === 'pending')
  const suggestedAliases = pending.filter((item) => item.suggestedTermId && (item.confidence ?? 0) >= 0.8)
  const unmatched = pending.filter((item) => !item.suggestedTermId)
  const lowConfidence = pending.filter((item) => (item.confidence ?? 1) < 0.5)
  const duplicateValues = findDuplicateReviewValues(pending)
  const groups: BatchReviewGroup[] = []

  if (suggestedAliases.length > 1) {
    groups.push({
      id: 'approve-suggested-aliases',
      label: 'High-confidence aliases',
      action: 'approve_aliases',
      itemIds: suggestedAliases.map((item) => item.id),
      count: suggestedAliases.length,
      nextStep: 'Review together, then approve each as an alias to its suggested term.',
    })
  }

  if (unmatched.length > 0) {
    groups.push({
      id: 'review-unmatched',
      label: 'Unmatched vocabulary',
      action: 'review_unmatched',
      itemIds: unmatched.map((item) => item.id),
      count: unmatched.length,
      nextStep: 'Create private terms only for vocabulary the chef actually uses.',
    })
  }

  if (lowConfidence.length > 1) {
    groups.push({
      id: 'dismiss-low-confidence',
      label: 'Low-confidence intake',
      action: 'dismiss_low_value',
      itemIds: lowConfidence.map((item) => item.id),
      count: lowConfidence.length,
      nextStep: 'Dismiss noise or keep the few phrases that represent real kitchen language.',
    })
  }

  if (duplicateValues.length > 0) {
    groups.push({
      id: 'resolve-duplicate-review-values',
      label: 'Duplicate review values',
      action: 'resolve_conflicts',
      itemIds: duplicateValues,
      count: duplicateValues.length,
      nextStep: 'Resolve duplicates before approving aliases so the queue does not split one word.',
    })
  }

  return groups
}

export function buildSearchMissReviewCandidate(input: {
  query: string
  terms: CulinaryDictionaryTerm[]
}): SearchMissReviewCandidate {
  const sourceValue = input.query.trim()
  const normalizedValue = normalizeCulinaryTerm(sourceValue)

  if (!normalizedValue) {
    return {
      sourceSurface: 'dictionary_search',
      sourceValue,
      normalizedValue,
      shouldCapture: false,
      reason: 'empty_query',
    }
  }

  const matches = findDictionarySurfaceMatches(normalizedValue, input.terms)

  return {
    sourceSurface: 'dictionary_search',
    sourceValue,
    normalizedValue,
    shouldCapture: matches.length === 0,
    reason: matches.length === 0 ? 'new_review_candidate' : 'already_matched',
  }
}

export function buildAliasConflictResolutionOptions(
  terms: CulinaryDictionaryTerm[],
): AliasConflictResolutionOption[] {
  return detectAliasConflicts(terms).flatMap((conflict) => {
    const affectedTermIds = [...new Set(conflict.aliases.map((alias) => alias.termId))].sort()
    return [
      {
        normalizedAlias: conflict.normalizedAlias,
        conflictLevel: conflict.conflictLevel,
        option: 'keep_separate',
        label: 'Keep separate and document why both meanings are valid.',
        affectedTermIds,
      },
      {
        normalizedAlias: conflict.normalizedAlias,
        conflictLevel: conflict.conflictLevel,
        option: 'map_alias',
        label: 'Map the alias to the canonical term the chef actually means.',
        affectedTermIds,
      },
      {
        normalizedAlias: conflict.normalizedAlias,
        conflictLevel: conflict.conflictLevel,
        option: 'mark_private',
        label: 'Keep the ambiguous label chef-only until it is resolved.',
        affectedTermIds,
      },
      {
        normalizedAlias: conflict.normalizedAlias,
        conflictLevel: conflict.conflictLevel,
        option: 'reject_alias',
        label: 'Reject the alias if it came from noisy intake.',
        affectedTermIds,
      },
    ]
  })
}

function toSurfaceMatch(
  term: CulinaryDictionaryTerm,
  matchedValue: string,
  source: DictionarySurfaceMatch['source'],
): DictionarySurfaceMatch {
  return {
    termId: term.id,
    canonicalName: term.canonicalName,
    canonicalSlug: term.canonicalSlug,
    termType: term.termType,
    matchedValue,
    source,
    publicSafe: term.publicSafe,
    safetySeverity: getHighestSafetySeverity(term.safetyFlags),
    href: `/culinary/dictionary?term=${term.canonicalSlug}`,
  }
}

function getHighestSafetySeverity(
  flags: CulinaryDictionarySafetyFlag[],
): DictionarySurfaceMatch['safetySeverity'] {
  if (flags.some((flag) => flag.severity === 'critical')) return 'critical'
  if (flags.some((flag) => flag.severity === 'caution')) return 'caution'
  if (flags.some((flag) => flag.severity === 'info')) return 'info'
  return 'none'
}

function containsNormalizedPhrase(normalizedText: string, normalizedPhrase: string): boolean {
  if (!normalizedText || !normalizedPhrase) return false
  const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(normalizedText)
}

function compareSurfaceMatches(
  a: DictionarySurfaceMatch,
  b: DictionarySurfaceMatch,
): number {
  return (
    a.canonicalName.localeCompare(b.canonicalName) ||
    a.source.localeCompare(b.source) ||
    a.matchedValue.localeCompare(b.matchedValue)
  )
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function buildPreflightNextSteps(blockers: string[], warnings: string[]): string[] {
  if (blockers.length > 0) {
    return ['Resolve critical safety findings before publishing.']
  }

  if (warnings.length > 0) {
    return [
      'Review warnings before publishing.',
      'Send unresolved vocabulary to dictionary review when it represents real chef language.',
    ]
  }

  return ['No dictionary blockers found for this copy.']
}

function dedupeFindings(
  findings: PublicInternalLanguageFinding[],
): PublicInternalLanguageFinding[] {
  const byId = new Map<string, PublicInternalLanguageFinding>()
  for (const finding of findings) byId.set(finding.id, finding)
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function makePrepItem(
  field: PrepSpecificityItem['field'],
  label: string,
  severity: PrepSpecificityItem['severity'],
  evidence: string,
): PrepSpecificityItem {
  return {
    id: `${field}-${normalizeCulinaryTerm(evidence).replace(/\s+/g, '-')}`,
    field,
    label,
    severity,
    evidence,
    nextStep: `Add a chef-approved ${label.toLowerCase()} before this reaches staff prep.`,
  }
}

function mapPrepField(evidence: string): PrepSpecificityItem['field'] {
  if (evidence.includes('quantity')) return 'quantity'
  if (evidence.includes('cut')) return 'cut_size'
  if (evidence.includes('doneness')) return 'doneness'
  if (evidence.includes('service')) return 'plating'
  return 'station'
}

function dedupePrepItems(items: PrepSpecificityItem[]): PrepSpecificityItem[] {
  const byField = new Map<string, PrepSpecificityItem>()
  for (const item of items) {
    const existing = byField.get(item.field)
    if (!existing || severityRank(item.severity) > severityRank(existing.severity)) {
      byField.set(item.field, item)
    }
  }
  return [...byField.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.field.localeCompare(b.field))
}

function severityRank(severity: 'info' | 'caution' | 'critical'): number {
  if (severity === 'critical') return 3
  if (severity === 'caution') return 2
  return 1
}

function containsAny(normalizedText: string, phrases: string[]): boolean {
  return phrases.some((phrase) => containsNormalizedPhrase(normalizedText, phrase))
}

function compareHistoryEvents(a: TermHistoryEvent, b: TermHistoryEvent): number {
  return (
    normalizeHistoryDate(a.occurredAt).localeCompare(normalizeHistoryDate(b.occurredAt)) ||
    a.label.localeCompare(b.label) ||
    a.id.localeCompare(b.id)
  )
}

function normalizeHistoryDate(value: string): string {
  return value === 'source' ? '0000-00-00T00:00:00.000Z' : value
}

function findDuplicateReviewValues(items: CulinaryDictionaryReviewItem[]): string[] {
  const idsByValue = new Map<string, string[]>()

  for (const item of items) {
    const key = item.normalizedValue || normalizeCulinaryTerm(item.sourceValue)
    if (!key) continue
    idsByValue.set(key, [...(idsByValue.get(key) ?? []), item.id])
  }

  return [...idsByValue.values()]
    .filter((ids) => ids.length > 1)
    .flat()
    .sort((a, b) => a.localeCompare(b))
}
