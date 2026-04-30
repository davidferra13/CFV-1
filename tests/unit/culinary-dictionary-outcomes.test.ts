import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analyzeDictionaryTextSurface,
  buildAliasConflictResolutionOptions,
  buildBatchReviewGroups,
  buildMenuPublishPreflight,
  buildPrepSpecificityChecklist,
  buildSafetyCoverageBoard,
  buildSearchMissReviewCandidate,
  buildTermHistoryTimeline,
  guardPublicInternalLanguage,
} from '@/lib/culinary-dictionary/outcomes'
import type {
  CulinaryDictionaryReviewItem,
  CulinaryDictionaryTerm,
} from '@/lib/culinary-dictionary/types'

const terms: CulinaryDictionaryTerm[] = [
  makeTerm('crispy', 'Crispy', 'texture', {
    aliases: ['crisp'],
    publicSafe: true,
    definition: 'Firm and brittle texture.',
  }),
  makeTerm('aioli', 'Aioli', 'sauce', {
    aliases: ['garlic mayo'],
    publicSafe: false,
  }),
  makeTerm('peanut', 'Peanut', 'allergen', {
    aliases: ['groundnut'],
    publicSafe: true,
    definition: 'Peanut ingredient.',
    safetyFlags: [{ flagType: 'allergen', flagKey: 'peanut', severity: 'critical' }],
  }),
  makeTerm('alternate-peanut', 'Groundnut Oil', 'ingredient', {
    aliases: ['groundnut'],
    publicSafe: false,
  }),
]

const reviewItems: CulinaryDictionaryReviewItem[] = [
  makeReview('r1', 'dictionary_search', 'garlic mayo', 'aioli', 0.9),
  makeReview('r2', 'dictionary_search', 'shatta', null, null),
  makeReview('r3', 'menu_copy', 'shatta', null, 0.4),
]

test('analyzes text surfaces with canonical and alias dictionary references', () => {
  const result = analyzeDictionaryTextSurface(
    {
      id: 'menu-1',
      title: 'Menu',
      surface: 'menu_copy',
      text: 'Crispy potatoes with garlic mayo.',
    },
    terms,
  )

  assert.ok(result.matches.some((match) => match.canonicalName === 'Crispy'))
  assert.ok(
    result.matches.some(
      (match) => match.canonicalName === 'Aioli' && match.source === 'alias',
    ),
  )
})

test('builds menu publish preflight with safety blockers and publication warnings', () => {
  const result = buildMenuPublishPreflight({
    text: 'Crispy peanut salad with garlic mayo.',
    terms,
  })

  assert.equal(result.canPublish, false)
  assert.ok(result.blockers.some((blocker) => blocker.includes('Peanut')))
  assert.ok(result.warnings.some((warning) => warning.includes('Aioli')))
})

test('guards public copy from internal language and chef-only terms', () => {
  const result = guardPublicInternalLanguage({
    text: 'Fire crispy potatoes with garlic mayo until pickup.',
    terms,
  })

  assert.ok(result.some((finding) => finding.message.includes('chef-only')))
  assert.ok(result.some((finding) => finding.evidence === 'station shorthand'))
})

test('builds staff prep specificity checklist without drafting copy', () => {
  const result = buildPrepSpecificityChecklist({
    text: 'Cut herbs as needed and cook until done. Hold for pickup.',
    terms,
  })

  assert.ok(result.some((item) => item.field === 'quantity'))
  assert.ok(result.some((item) => item.field === 'cut_size'))
  assert.ok(result.some((item) => item.field === 'doneness'))
  assert.ok(result.every((item) => !item.nextStep.includes('try saying')))
})

test('summarizes safety coverage and term history', () => {
  const safety = buildSafetyCoverageBoard(terms)
  const history = buildTermHistoryTimeline(terms[2], reviewItems)

  assert.equal(safety.criticalTerms, 1)
  assert.ok(safety.flagCounts.allergen >= 1)
  assert.ok(history.some((event) => event.label.includes('safety flag')))
  assert.ok(history.some((event) => event.label.includes('Alias')))
})

test('groups review queue work and captures true search misses', () => {
  const groups = buildBatchReviewGroups(reviewItems)
  const miss = buildSearchMissReviewCandidate({ query: 'shatta', terms })
  const match = buildSearchMissReviewCandidate({ query: 'crispy', terms })

  assert.ok(groups.some((group) => group.action === 'review_unmatched'))
  assert.equal(miss.shouldCapture, true)
  assert.equal(miss.reason, 'new_review_candidate')
  assert.equal(match.shouldCapture, false)
  assert.equal(match.reason, 'already_matched')
})

test('offers alias conflict resolution options', () => {
  const options = buildAliasConflictResolutionOptions(terms)

  assert.ok(options.some((option) => option.normalizedAlias === 'groundnut'))
  assert.ok(options.some((option) => option.option === 'mark_private'))
  assert.ok(options.every((option) => option.affectedTermIds.length > 1))
})

function makeTerm(
  id: string,
  canonicalName: string,
  termType: CulinaryDictionaryTerm['termType'],
  options: {
    aliases?: string[]
    publicSafe?: boolean
    definition?: string | null
    safetyFlags?: Array<{
      flagType: CulinaryDictionaryTerm['safetyFlags'][number]['flagType']
      flagKey: string
      severity: CulinaryDictionaryTerm['safetyFlags'][number]['severity']
    }>
  } = {},
): CulinaryDictionaryTerm {
  return {
    id,
    canonicalSlug: canonicalName.toLowerCase().replace(/\s+/g, '-'),
    canonicalName,
    termType,
    category: null,
    shortDefinition: options.definition ?? null,
    longDefinition: null,
    publicSafe: options.publicSafe ?? true,
    source: 'system',
    confidence: 1,
    needsReview: false,
    aliases: (options.aliases ?? []).map((alias, index) => ({
      id: `${id}-alias-${index}`,
      termId: id,
      alias,
      normalizedAlias: alias.toLowerCase(),
      aliasKind: 'synonym',
      confidence: 1,
      source: 'system',
      needsReview: false,
    })),
    safetyFlags: (options.safetyFlags ?? []).map((flag, index) => ({
      id: `${id}-flag-${index}`,
      termId: id,
      flagType: flag.flagType,
      flagKey: flag.flagKey,
      severity: flag.severity,
      explanation: null,
      source: 'system',
    })),
  }
}

function makeReview(
  id: string,
  sourceSurface: string,
  sourceValue: string,
  suggestedTermId: string | null,
  confidence: number | null,
): CulinaryDictionaryReviewItem {
  return {
    id,
    sourceSurface,
    sourceValue,
    normalizedValue: sourceValue.toLowerCase(),
    suggestedTermId,
    suggestedAliasId: null,
    suggestedTermName: suggestedTermId,
    confidence,
    status: 'pending',
    createdAt: `2026-04-29T00:0${id.slice(1)}:00.000Z`,
  }
}
