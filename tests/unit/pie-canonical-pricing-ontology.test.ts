import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { PIE_FOOD_CATEGORIES } from '../../lib/pricing/pie-categories.js'
import { SUBCATEGORY_FLOOR_CENTS } from '../../lib/pricing/subcategory-floors.js'
import {
  PIE_CANONICAL_ONTOLOGY_COMPLETION_MATRIX,
  PIE_CANONICAL_ONTOLOGY_SCOPE_FAMILIES,
  PIE_ONTOLOGY_CONSUMING_SURFACES,
  PIE_REQUIRED_HIGH_RISK_FAMILIES,
} from '../../lib/pricing/pie-canonical-pricing-ontology.js'

describe('PIE canonical pricing ontology completion matrix', () => {
  it('covers every existing PIE food category', () => {
    const coveredCategories = new Set(
      PIE_CANONICAL_ONTOLOGY_COMPLETION_MATRIX.existingCategories
        .filter((entry) => entry.coverageStatus === 'covered')
        .map((entry) => entry.existingCategory)
    )

    for (const category of PIE_FOOD_CATEGORIES) {
      assert.ok(coveredCategories.has(category), `Missing category mapping for ${category}`)
    }
  })

  it('covers every existing subcategory floor with canonical id and parent ids', () => {
    const matrixBySubcategory = new Map(
      PIE_CANONICAL_ONTOLOGY_COMPLETION_MATRIX.existingSubcategories.map((entry) => [
        entry.existingSubcategory,
        entry,
      ])
    )

    for (const subcategory of Object.keys(SUBCATEGORY_FLOOR_CENTS)) {
      const entry = matrixBySubcategory.get(subcategory)
      assert.ok(entry, `Missing subcategory matrix entry for ${subcategory}`)
      assert.equal(entry.coverageStatus, 'covered', `Subcategory ${subcategory} has a gap`)
      assert.ok(entry.canonicalId.startsWith('pie.price_identity.'))
      assert.ok(entry.parentIds.length > 0, `Subcategory ${subcategory} lacks parent ids`)
      assert.ok(entry.priceFamily.startsWith('pie.price_family.'))
      assert.ok(entry.unitBasis.length > 0, `Subcategory ${subcategory} lacks unit basis`)
      assert.ok(entry.yieldBasis.length > 0, `Subcategory ${subcategory} lacks yield basis`)
      assert.ok(
        entry.proofRequirements.includes('canonical ingredient id'),
        `Subcategory ${subcategory} lacks canonical proof`
      )
    }
  })

  it('explicitly models all required high-risk families with unsafe equivalence and proof', () => {
    const families = new Set(
      PIE_CANONICAL_ONTOLOGY_COMPLETION_MATRIX.highRiskFamilies.map((entry) => entry.family)
    )

    for (const family of PIE_REQUIRED_HIGH_RISK_FAMILIES) {
      assert.ok(families.has(family), `Missing high-risk family ${family}`)
    }

    for (const entry of PIE_CANONICAL_ONTOLOGY_COMPLETION_MATRIX.highRiskFamilies) {
      assert.ok(entry.canonicalBranchIds.length > 0, `${entry.family} lacks canonical branches`)
      assert.ok(entry.directPriceIdentities.length > 0, `${entry.family} lacks direct identities`)
      assert.ok(entry.buyableEquivalenceGroups.length > 0, `${entry.family} lacks buyable groups`)
      assert.ok(entry.unsafeEquivalences.length > 0, `${entry.family} lacks unsafe equivalences`)
      assert.ok(entry.proofRequirements.length > 0, `${entry.family} lacks proof requirements`)
      assert.ok(entry.fallbackOrder.length > 0, `${entry.family} lacks fallback order`)
    }
  })

  it('separates fresh and processed forms for required acceptance examples', () => {
    const matrixText = JSON.stringify(PIE_CANONICAL_ONTOLOGY_COMPLETION_MATRIX.highRiskFamilies)

    for (const token of [
      'fresh tomato',
      'tomato paste',
      'cilantro leaf != coriander seed',
      'fresh chile != dried chile',
      'heavy cream != sour cream',
      'soybean != tofu',
      'wheat berries != flour',
      'whole chicken != chicken breast',
      'whole lemon != lemon juice',
      'white sugar != brown sugar',
      'fresh tuna != canned tuna',
      'fresh herb != dried herb',
      'extra virgin olive oil != olive oil blend',
      'whole spice != ground spice',
      'canned item != fresh item',
      'frozen item != fresh item',
      'fermented good != raw source',
      'extract != raw source',
      'additive != raw source',
    ]) {
      assert.ok(matrixText.includes(token), `Missing explicit fresh/processed separation: ${token}`)
    }
  })

  it('lists all PIE consuming surfaces named by the queue item', () => {
    const surfaces = new Set(PIE_ONTOLOGY_CONSUMING_SURFACES.map((entry) => entry.surface))

    for (const surface of [
      'pricing resolver',
      'buyable price contract',
      'reliability',
      'normalizer',
      'matching utilities',
      'vendor catalog ingestion',
      'recipe costing',
      'substitutions',
    ]) {
      assert.ok(surfaces.has(surface), `Missing consuming surface ${surface}`)
    }
  })

  it('declares the full requested ontology family scope', () => {
    const scopeFamilies = PIE_CANONICAL_ONTOLOGY_SCOPE_FAMILIES as readonly string[]

    for (const family of [
      'produce',
      'proteins',
      'seafood',
      'dairy',
      'dry_goods',
      'spices',
      'oils',
      'prepared_goods',
      'beverages',
      'bakery',
      'frozen',
      'canned',
      'fermented',
      'extracts',
      'additives',
      'sweeteners',
    ]) {
      assert.ok(scopeFamilies.includes(family), `Missing scope family ${family}`)
    }
  })
})
