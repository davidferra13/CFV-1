import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRelatedTermsGraph,
  detectAliasConflicts,
  getDictionaryTermImpact,
  getDictionaryTermImpactMap,
  summarizeDictionaryCoverage,
} from '@/lib/culinary-dictionary/term-intelligence'
import type {
  CulinaryDictionaryAlias,
  CulinaryDictionaryReviewItem,
  CulinaryDictionarySafetyFlag,
  CulinaryDictionaryTerm,
  DictionaryAliasKind,
  DictionaryReviewStatus,
  DictionaryTermType,
} from '@/lib/culinary-dictionary/types'

function alias(
  termId: string,
  aliasValue: string,
  normalizedAlias: string,
  aliasKind: DictionaryAliasKind = 'synonym',
  confidence = 0.95,
  needsReview = false
): CulinaryDictionaryAlias {
  return {
    id: `${termId}-${normalizedAlias}-${aliasKind}`,
    termId,
    alias: aliasValue,
    normalizedAlias,
    aliasKind,
    confidence,
    source: 'system',
    needsReview,
  }
}

function safetyFlag(
  termId: string,
  flagKey: string,
  flagType: CulinaryDictionarySafetyFlag['flagType'] = 'allergen',
  severity: CulinaryDictionarySafetyFlag['severity'] = 'critical'
): CulinaryDictionarySafetyFlag {
  return {
    id: `${termId}-${flagType}-${flagKey}`,
    termId,
    flagType,
    flagKey,
    severity,
    explanation: null,
    source: 'system',
  }
}

function term(
  id: string,
  canonicalName: string,
  termType: DictionaryTermType,
  options: Partial<CulinaryDictionaryTerm> = {}
): CulinaryDictionaryTerm {
  return {
    id,
    canonicalSlug: canonicalName.toLowerCase().replace(/\s+/g, '-'),
    canonicalName,
    termType,
    category: null,
    shortDefinition: null,
    longDefinition: null,
    publicSafe: true,
    source: 'system',
    confidence: 0.95,
    needsReview: false,
    aliases: [],
    safetyFlags: [],
    ...options,
  }
}

function reviewItem(
  id: string,
  sourceSurface: string,
  status: DictionaryReviewStatus = 'pending'
): CulinaryDictionaryReviewItem {
  return {
    id,
    sourceSurface,
    sourceValue: id,
    normalizedValue: id,
    suggestedTermId: null,
    suggestedAliasId: null,
    suggestedTermName: null,
    confidence: null,
    status,
    createdAt: '2026-04-29T00:00:00.000Z',
  }
}

test('term impact maps deterministic surfaces affected by a safety-sensitive ingredient', () => {
  const flour = term('term-flour', 'All Purpose Flour', 'ingredient', {
    category: 'baking',
    aliases: [alias('term-flour', 'AP flour', 'all purpose flour', 'abbreviation')],
    safetyFlags: [
      safetyFlag('term-flour', 'wheat'),
      safetyFlag('term-flour', 'gluten-free', 'dietary_violation'),
    ],
  })

  const impact = getDictionaryTermImpact(flour)

  assert.equal(impact.termId, 'term-flour')
  assert.equal(impact.riskLevel, 'high')
  assert.deepEqual(impact.surfaces, [
    'alias_matching',
    'allergen_safety',
    'dietary_safety',
    'ingredient_costing',
    'menu_language',
    'private_dictionary',
    'public_glossary',
  ])
  assert.ok(impact.reasons.some((reason) => reason.includes('safety flags')))
})

test('term impact map is keyed by term id and includes private review-only terms', () => {
  const privateTechnique = term('term-secret-technique', 'House Fold', 'technique', {
    publicSafe: false,
    needsReview: true,
  })

  const impactMap = getDictionaryTermImpactMap([privateTechnique])

  assert.equal(impactMap['term-secret-technique'].riskLevel, 'medium')
  assert.deepEqual(impactMap['term-secret-technique'].surfaces, [
    'menu_language',
    'private_dictionary',
    'review_queue',
    'staff_training',
  ])
})

test('related terms graph connects aliases, category, type, safety flags, and review posture', () => {
  const flour = term('term-flour', 'All Purpose Flour', 'ingredient', {
    category: 'baking',
    aliases: [alias('term-flour', 'AP flour', 'all purpose flour', 'abbreviation')],
    safetyFlags: [safetyFlag('term-flour', 'wheat')],
  })
  const cakeFlour = term('term-cake-flour', 'Cake Flour', 'ingredient', {
    category: 'baking',
    aliases: [alias('term-cake-flour', 'AP flour', 'all purpose flour', 'abbreviation', 0.6, true)],
    safetyFlags: [safetyFlag('term-cake-flour', 'wheat')],
    needsReview: true,
  })
  const julienne = term('term-julienne', 'Julienne', 'cut', {
    category: 'knife_cut',
  })

  const graph = buildRelatedTermsGraph([julienne, flour, cakeFlour])
  const flourEdge = graph.edges.find(
    (edge) => edge.fromTermId === 'term-flour' && edge.toTermId === 'term-cake-flour'
  )

  assert.deepEqual(
    graph.nodes.map((node) => node.canonicalName),
    ['All Purpose Flour', 'Cake Flour', 'Julienne']
  )
  assert.ok(flourEdge)
  assert.deepEqual(flourEdge.reasons, [
    'public_visibility',
    'shared_alias',
    'shared_category',
    'shared_safety_flag',
    'shared_type',
  ])
  assert.equal(flourEdge.score, 115)
})

test('alias conflicts are reported only when one normalized alias points at multiple terms', () => {
  const flour = term('term-flour', 'All Purpose Flour', 'ingredient', {
    aliases: [
      alias('term-flour', 'AP flour', 'all purpose flour', 'abbreviation'),
      alias('term-flour', 'plain flour', 'plain flour', 'regional'),
    ],
  })
  const cakeFlour = term('term-cake-flour', 'Cake Flour', 'ingredient', {
    aliases: [alias('term-cake-flour', 'AP flour', 'all purpose flour', 'abbreviation', 0.5, true)],
  })

  const conflicts = detectAliasConflicts([cakeFlour, flour])

  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].normalizedAlias, 'all purpose flour')
  assert.equal(conflicts[0].conflictLevel, 'critical')
  assert.deepEqual(
    conflicts[0].aliases.map((conflictAlias) => conflictAlias.termId),
    ['term-flour', 'term-cake-flour']
  )
})

test('coverage summary counts unresolved review items and private public balance', () => {
  const flour = term('term-flour', 'All Purpose Flour', 'ingredient', {
    aliases: [alias('term-flour', 'AP flour', 'all purpose flour', 'abbreviation', 0.7, true)],
    safetyFlags: [
      safetyFlag('term-flour', 'wheat'),
      safetyFlag('term-flour', 'gluten-free', 'dietary_violation', 'caution'),
    ],
  })
  const privateTechnique = term('term-secret-technique', 'House Fold', 'technique', {
    publicSafe: false,
    needsReview: true,
  })
  const reviews = [
    reviewItem('review-menu-1', 'menu_import'),
    reviewItem('review-menu-2', 'menu_import'),
    reviewItem('review-price-1', 'pricing_import'),
    reviewItem('review-done', 'menu_import', 'approved'),
  ]

  const summary = summarizeDictionaryCoverage([flour, privateTechnique], reviews)

  assert.equal(summary.totalTerms, 2)
  assert.equal(summary.unresolvedReviewItems, 3)
  assert.deepEqual(summary.unresolvedReviewItemsBySurface, {
    menu_import: 2,
    pricing_import: 1,
  })
  assert.equal(summary.publicTerms, 1)
  assert.equal(summary.privateTerms, 1)
  assert.equal(summary.publicRatio, 0.5)
  assert.equal(summary.privateRatio, 0.5)
  assert.equal(summary.termsNeedingReview, 1)
  assert.equal(summary.aliasesNeedingReview, 1)
  assert.equal(summary.termsWithSafetyFlags, 1)
  assert.equal(summary.safetyFlagCounts.allergen, 1)
  assert.equal(summary.safetyFlagCounts.dietary_violation, 1)
  assert.equal(summary.safetySeverityCounts.critical, 1)
  assert.equal(summary.safetySeverityCounts.caution, 1)
})
