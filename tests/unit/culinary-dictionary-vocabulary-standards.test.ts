import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildChefVocabularyStandards,
  evaluateVocabularyPublicationGate,
} from '@/lib/culinary-dictionary/vocabulary-standards'
import type {
  CulinaryDictionaryReviewItem,
  CulinaryDictionaryTerm,
} from '@/lib/culinary-dictionary/types'

const baseTerm: CulinaryDictionaryTerm = {
  id: 'term-green-onion',
  canonicalSlug: 'green-onion',
  canonicalName: 'Green Onion',
  termType: 'ingredient',
  category: 'produce',
  shortDefinition: null,
  longDefinition: null,
  publicSafe: true,
  source: 'system',
  confidence: 0.95,
  needsReview: false,
  aliases: [
    {
      id: 'alias-scallion',
      termId: 'term-green-onion',
      alias: 'Scallion',
      normalizedAlias: 'scallion',
      aliasKind: 'regional',
      confidence: 0.95,
      source: 'system',
      needsReview: false,
    },
  ],
  safetyFlags: [],
}

function makeTerm(overrides: Partial<CulinaryDictionaryTerm>): CulinaryDictionaryTerm {
  return {
    ...baseTerm,
    aliases: baseTerm.aliases.map((alias) => ({ ...alias })),
    safetyFlags: [],
    ...overrides,
  }
}

function makeReviewItem(
  overrides: Partial<CulinaryDictionaryReviewItem>
): CulinaryDictionaryReviewItem {
  return {
    id: 'review-1',
    sourceSurface: 'dictionary',
    sourceValue: 'Spring Onion',
    normalizedValue: 'spring onion',
    suggestedTermId: 'term-green-onion',
    suggestedAliasId: null,
    suggestedTermName: 'Green Onion',
    confidence: 0.9,
    status: 'pending',
    createdAt: '2026-04-29T00:00:00.000Z',
    ...overrides,
  }
}

test('publication gate allows only public stable terms with reviewed aliases', () => {
  assert.deepEqual(evaluateVocabularyPublicationGate(baseTerm), {
    termId: 'term-green-onion',
    canonicalName: 'Green Onion',
    canonicalSlug: 'green-onion',
    publicSafe: true,
    canPublishPublicly: true,
    reasons: ['public_safe'],
  })

  const privateTerm = makeTerm({
    id: 'term-private-mise',
    canonicalSlug: 'private-mise',
    canonicalName: 'Private Mise',
    publicSafe: false,
  })

  assert.deepEqual(evaluateVocabularyPublicationGate(privateTerm), {
    termId: 'term-private-mise',
    canonicalName: 'Private Mise',
    canonicalSlug: 'private-mise',
    publicSafe: false,
    canPublishPublicly: false,
    reasons: ['chef_only'],
  })

  const unstableTerm = makeTerm({
    id: 'term-review',
    canonicalSlug: 'review',
    canonicalName: 'Review',
    confidence: 0.6,
    needsReview: true,
    aliases: [
      {
        ...baseTerm.aliases[0],
        id: 'alias-review',
        needsReview: true,
      },
    ],
  })

  assert.deepEqual(evaluateVocabularyPublicationGate(unstableTerm).reasons, [
    'term_needs_review',
    'low_confidence',
    'alias_needs_review',
  ])
})

test('builds deterministic vocabulary standards from term and review data', () => {
  const privateTerm = makeTerm({
    id: 'term-staff-code',
    canonicalSlug: 'staff-code',
    canonicalName: 'Staff Code',
    publicSafe: false,
    source: 'chef',
    aliases: [],
  })
  const needsReviewTerm = makeTerm({
    id: 'term-low-confidence',
    canonicalSlug: 'low-confidence',
    canonicalName: 'Low Confidence',
    confidence: 0.65,
    needsReview: true,
    aliases: [
      {
        ...baseTerm.aliases[0],
        id: 'alias-under-review',
        termId: 'term-low-confidence',
        alias: 'Chef Shorthand',
        normalizedAlias: 'chef shorthand',
        confidence: 0.5,
        needsReview: true,
      },
    ],
  })

  const standards = buildChefVocabularyStandards(
    [privateTerm, needsReviewTerm, baseTerm],
    [
      makeReviewItem({
        id: 'review-alias-gap',
        sourceValue: 'Spring Onion',
        normalizedValue: 'spring onion',
        suggestedTermId: 'term-green-onion',
        suggestedTermName: 'Green Onion',
        status: 'approved',
      }),
      makeReviewItem({
        id: 'review-rejected',
        sourceValue: 'Bad Label',
        normalizedValue: 'bad label',
        suggestedTermId: null,
        suggestedTermName: null,
        status: 'rejected',
      }),
      makeReviewItem({
        id: 'review-unmatched',
        sourceValue: 'Mystery Prep',
        normalizedValue: 'mystery prep',
        suggestedTermId: null,
        suggestedTermName: null,
        confidence: null,
        status: 'pending',
      }),
    ]
  )

  assert.deepEqual(
    standards.preferredTerms.map((term) => term.canonicalName),
    ['Green Onion', 'Staff Code']
  )
  assert.deepEqual(
    standards.publicSafeCandidates.map((term) => term.canonicalName),
    ['Green Onion']
  )
  assert.deepEqual(
    standards.chefOnlyTerms.map((term) => term.canonicalName),
    ['Low Confidence', 'Staff Code']
  )
  assert.deepEqual(standards.aliasGaps, [
    {
      value: 'Spring Onion',
      normalizedValue: 'spring onion',
      suggestedTermId: 'term-green-onion',
      suggestedTermName: 'Green Onion',
      reviewItemId: 'review-alias-gap',
      reviewStatus: 'approved',
    },
  ])
  assert.ok(
    standards.needsReviewCandidates.some(
      (candidate) =>
        candidate.value === 'Chef Shorthand' && candidate.reason === 'alias_needs_review'
    )
  )
  assert.ok(
    standards.needsReviewCandidates.some(
      (candidate) =>
        candidate.value === 'Mystery Prep' && candidate.reason === 'unmatched_review_item'
    )
  )
  assert.deepEqual(standards.avoidLabels, [
    {
      value: 'Bad Label',
      normalizedValue: 'bad label',
      reason: 'review_rejected',
      termIds: [],
      reviewItemId: 'review-rejected',
    },
  ])
  assert.ok(
    standards.ambiguousLabels.some(
      (label) => label.value === 'Mystery Prep' && label.reason === 'unmatched_review_item'
    )
  )
})

test('flags duplicate labels across terms as ambiguous without mutating inputs', () => {
  const duplicateTerm = makeTerm({
    id: 'term-scallion',
    canonicalSlug: 'scallion',
    canonicalName: 'Scallion',
    aliases: [],
  })
  const terms = [duplicateTerm, baseTerm]
  const before = JSON.stringify(terms)

  const standards = buildChefVocabularyStandards(terms, [])

  assert.equal(JSON.stringify(terms), before)
  assert.deepEqual(standards.ambiguousLabels, [
    {
      value: 'Scallion',
      normalizedValue: 'scallion',
      reason: 'duplicate_alias',
      termIds: ['term-green-onion', 'term-scallion'],
      reviewItemId: null,
    },
  ])
})
