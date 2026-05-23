import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FALLBACK_DECISION_TABLE,
  GOLDEN_PRICE_ORACLE_FIXTURES,
  PIE_NATIVE_TRUTH_INVARIANTS,
  PIE_PRICING_IDENTITIES,
  SKU_MATCH_PRIORITY_ORDER,
  SKU_OUTCOME_RULES,
  SUBSTITUTION_TYPE_RULES,
  UNIT_YIELD_TRANSFORM_EXAMPLES,
  classifySkuMatch,
  evaluateFallbackClaim,
  evaluateNativeTruthServingClaim,
  evaluateSubstitutionPricing,
  getOracleCompletionReport,
  getUnitYieldRequirement,
  validateGoldenFixtures,
} from '../../lib/pricing/pie-national-price-oracle-contract.js'

describe('PIE national price oracle completion contract', () => {
  it('covers every mandatory high-risk pricing family with explicit price truth rules', () => {
    const report = getOracleCompletionReport()

    assert.equal(report.missingFamilies.length, 0)
    assert.ok(report.identityCount >= 24)
    assert.ok(report.families.includes('tomato'))
    assert.ok(report.families.includes('seafood'))
    assert.ok(report.families.includes('additive'))
    assert.deepEqual(report.nativeTruthInvariants.sort(), [
      'access_reliability',
      'accuracy_honesty',
      'census_denominator',
      'compound_learning',
      'external_dependency_boundary',
      'instant_precomputed_serving',
      'native_data_ownership',
      'self_repair',
      'user_data_boundary',
    ])

    for (const identity of PIE_PRICING_IDENTITIES) {
      assert.ok(identity.priceFamily)
      assert.ok(identity.buyableEquivalenceGroup.length > 0)
      assert.ok(identity.unitBasis.length > 0)
      assert.ok(identity.proofRequirements.length > 0)
      assert.ok(
        identity.unsafeEquivalence.every(
          (unsafe) => !identity.buyableEquivalenceGroup.includes(unsafe)
        ),
        `${identity.id} must not allow unsafe equivalences to share price truth`
      )
    }
  })

  it('enforces native-only instant serving and forbids user prices as market truth', () => {
    assert.equal(PIE_NATIVE_TRUTH_INVARIANTS.length, 9)
    for (const invariant of PIE_NATIVE_TRUTH_INVARIANTS) {
      assert.ok(invariant.rule.length > 30, `${invariant.id} needs a rule`)
      assert.ok(invariant.blocksFinalCostingWhen.length > 0, `${invariant.id} needs blockers`)
      assert.ok(invariant.proofRequired.length > 0, `${invariant.id} needs proof`)
    }

    const nativeTruth = evaluateNativeTruthServingClaim({
      servingMode: 'precomputed_native_index',
      hasNativeObservation: true,
      precomputedForRegion: true,
      requiresExternalCompanyAtServeTime: false,
      usesUserSubmittedPriceAsMarketTruth: false,
      hasProvenance: true,
      hasFreshness: true,
      hasConfidence: true,
      hasRepairPath: true,
    })
    assert.equal(nativeTruth.finalCostingState, 'allowed')
    assert.equal(nativeTruth.reliability, 'direct_proof')

    const userPrice = evaluateNativeTruthServingClaim({
      servingMode: 'user_supplied_market_price',
      hasNativeObservation: false,
      precomputedForRegion: false,
      requiresExternalCompanyAtServeTime: false,
      usesUserSubmittedPriceAsMarketTruth: true,
      hasProvenance: true,
      hasFreshness: true,
      hasConfidence: true,
      hasRepairPath: true,
    })
    assert.equal(userPrice.finalCostingState, 'blocked')
    assert.ok(userPrice.blockers.includes('user-submitted price cannot become market truth'))

    const externalRuntime = evaluateNativeTruthServingClaim({
      servingMode: 'external_api_fetch',
      hasNativeObservation: true,
      precomputedForRegion: true,
      requiresExternalCompanyAtServeTime: true,
      usesUserSubmittedPriceAsMarketTruth: false,
      hasProvenance: true,
      hasFreshness: true,
      hasConfidence: true,
      hasRepairPath: true,
    })
    assert.equal(externalRuntime.finalCostingState, 'blocked')
    assert.ok(externalRuntime.blockers.includes('external company required at serve time'))

    const incompleteNativeCell = evaluateNativeTruthServingClaim({
      servingMode: 'precomputed_native_index',
      hasNativeObservation: true,
      precomputedForRegion: false,
      requiresExternalCompanyAtServeTime: false,
      usesUserSubmittedPriceAsMarketTruth: false,
      hasProvenance: true,
      hasFreshness: false,
      hasConfidence: true,
      hasRepairPath: false,
    })
    assert.equal(incompleteNativeCell.finalCostingState, 'review_required')
    assert.ok(incompleteNativeCell.blockers.includes('freshness missing'))
    assert.ok(incompleteNativeCell.blockers.includes('repair path missing'))
    assert.ok(incompleteNativeCell.blockers.includes('native regional price cell not precomputed'))
  })

  it('defines fallback decisions that downgrade estimates and block unsafe final costing', () => {
    const steps = FALLBACK_DECISION_TABLE.map((step) => step.step)

    assert.deepEqual(steps, [
      'chef_override',
      'receipt_proof',
      'exact_sku',
      'exact_canonical_buyable',
      'buyable_equivalent',
      'vendor_category_sibling',
      'regional_average',
      'national_baseline',
      'synthetic_model',
      'substitution_price',
    ])

    assert.equal(
      evaluateFallbackClaim({
        step: 'synthetic_model',
        stateReliability: 'estimated',
        hasFreshnessProof: false,
        hasUnitProof: true,
        hasYieldProof: true,
        substitutionApproved: true,
      }).finalCostingState,
      'review_required'
    )

    assert.equal(
      evaluateFallbackClaim({
        step: 'exact_sku',
        stateReliability: 'reliable',
        hasFreshnessProof: true,
        hasUnitProof: false,
        hasYieldProof: true,
        substitutionApproved: true,
      }).finalCostingState,
      'blocked'
    )
  })

  it('keeps SKU truth separate from fuzzy ingredient identity', () => {
    assert.deepEqual(
      SKU_MATCH_PRIORITY_ORDER.map((rule) => rule.field),
      [
        'UPC/GTIN/PLU',
        'vendor SKU',
        'vendor/store',
        'normalized product name',
        'brand/private label',
        'pack and multi-pack',
        'unit and catch weight',
        'form/process',
        'region',
        'recency',
      ]
    )
    assert.deepEqual(
      SKU_OUTCOME_RULES.map((rule) => rule.outcome).sort(),
      [
        'canonical_match',
        'exact_match',
        'fallback_candidate',
        'rejected_non_food',
        'rejected_prepared',
        'review_required',
        'unsafe_equivalence',
      ].sort()
    )

    assert.equal(
      classifySkuMatch({
        upc: '000111222333',
        vendorSku: 'CHEF-42',
        productName: 'Roma Tomatoes 25 lb case',
        canonicalIdentityId: 'plant.tomato.fruit.fresh',
        packSize: '25 lb case',
        unitBasis: 'lb',
        form: 'fresh',
      }).outcome,
      'exact_match'
    )

    assert.equal(
      classifySkuMatch({
        productName: 'Cilantro Lime Chicken Prepared Dinner Kit',
        canonicalIdentityId: 'plant.coriander.leaf.fresh',
        packSize: '18 oz tray',
        unitBasis: 'each',
        form: 'prepared',
      }).outcome,
      'rejected_prepared'
    )

    assert.equal(
      classifySkuMatch({
        productName: 'Whole Shrimp Shell-On Random Weight',
        canonicalIdentityId: 'animal.shrimp.muscle.shell-on',
        packSize: 'random weight',
        unitBasis: 'lb',
        form: 'fresh',
        catchWeight: true,
      }).outcome,
      'review_required'
    )
  })

  it('requires unit and yield proof before converting purchase prices into recipe costs', () => {
    const cilantro = getUnitYieldRequirement('plant.coriander.leaf.fresh', 'bunch', 'cup')
    assert.equal(cilantro.conversionClass, 'requires_each_or_bunch_yield')
    assert.equal(cilantro.finalCostingWithoutProof, 'blocked')
    assert.ok(cilantro.requiredProof.includes('picked-leaf yield'))

    const tomatoPaste = getUnitYieldRequirement('plant.tomato.fruit.paste', 'can', 'tbsp')
    assert.equal(tomatoPaste.conversionClass, 'requires_density_or_pack_size')
    assert.ok(tomatoPaste.requiredProof.includes('can size or net weight'))

    assert.ok(UNIT_YIELD_TRANSFORM_EXAMPLES.length >= 30)
    for (const example of UNIT_YIELD_TRANSFORM_EXAMPLES) {
      assert.ok(example.identityId, `${example.id} needs identity`)
      assert.ok(example.purchaseUnit, `${example.id} needs purchase unit`)
      assert.ok(example.recipeUnit, `${example.id} needs recipe unit`)
      assert.ok(example.requiredConversionProof.length > 0, `${example.id} needs proof`)
      assert.ok(example.yieldBasis, `${example.id} needs yield basis`)
      assert.ok(
        ['allowed', 'allowed_with_estimate', 'review_required', 'blocked'].includes(
          example.reliabilityOutcome
        ),
        `${example.id} needs final costing state`
      )
    }
  })

  it('separates substitution price deltas from original ingredient price truth', () => {
    assert.deepEqual(
      SUBSTITUTION_TYPE_RULES.map((rule) => rule.type).sort(),
      [
        'availability',
        'chef_operational',
        'client_approved',
        'cost_control',
        'culinary_function',
        'dietary_allergen',
        'emergency',
        'vendor',
      ].sort()
    )
    for (const rule of SUBSTITUTION_TYPE_RULES) {
      assert.ok(rule.approvalMode, `${rule.type} needs approval mode`)
      assert.ok(rule.requiredChecks.length > 0, `${rule.type} needs checks`)
      assert.ok(rule.pricingRule.length > 20, `${rule.type} needs pricing rule`)
      assert.ok(rule.auditTrail.includes('replacement identity'))
      assert.ok(rule.example.original)
      assert.ok(rule.example.replacement)
    }

    const approved = evaluateSubstitutionPricing({
      type: 'client_approved',
      originalIdentityId: 'animal.salmon.muscle.fillet',
      replacementIdentityId: 'animal.cod.muscle.fillet',
      hasDietaryCheck: true,
      hasAllergenCheck: true,
      hasUnitYieldProof: true,
      hasPriceProof: true,
      approvedByClient: true,
    })
    assert.equal(approved.finalCostingState, 'allowed_with_estimate')
    assert.equal(approved.canRewriteOriginalPriceTruth, false)

    const shellfish = evaluateSubstitutionPricing({
      type: 'dietary_allergen',
      originalIdentityId: 'animal.shrimp.muscle.shell-on',
      replacementIdentityId: 'animal.cod.muscle.fillet',
      hasDietaryCheck: true,
      hasAllergenCheck: false,
      hasUnitYieldProof: true,
      hasPriceProof: true,
      approvedByClient: false,
    })
    assert.equal(shellfish.finalCostingState, 'blocked')
  })

  it('ships a golden fixture corpus that validates high-risk recipe and SKU strings', () => {
    const validation = validateGoldenFixtures()

    assert.equal(validation.missingRequiredScenarios.length, 0)
    assert.ok(GOLDEN_PRICE_ORACLE_FIXTURES.length >= 50)
    assert.ok(validation.fixtureCount >= 50)
    assert.ok(validation.reliabilityBuckets.includes('review_required'))
    assert.ok(validation.reliabilityBuckets.includes('blocked'))
    assert.ok(validation.fallbackSteps.includes('synthetic_model'))
    assert.ok(validation.fallbackSteps.includes('exact_sku'))

    for (const fixture of GOLDEN_PRICE_ORACLE_FIXTURES) {
      assert.ok(fixture.expectedBuyableGroup.length > 0, `${fixture.id} needs buyable group`)
      assert.ok(
        fixture.expectedUnsafeEquivalences.length > 0,
        `${fixture.id} needs unsafe equivalence`
      )
      assert.ok(fixture.expectedUnitProof.length > 0, `${fixture.id} needs unit proof`)
      assert.ok(fixture.expectedYieldProof, `${fixture.id} needs yield proof`)
      assert.ok(fixture.expectedSubstitutionState, `${fixture.id} needs substitution state`)
      assert.ok(fixture.sourceTransparencyLabel, `${fixture.id} needs source transparency`)
    }
  })
})
