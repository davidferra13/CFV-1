import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPricingEnforcementDecision } from '@/lib/pricing/pricing-enforcement-gate'

test('pricing enforcement allows final quote only when reliability is quote-safe', () => {
  const decision = buildPricingEnforcementDecision({
    totalIngredientCount: 4,
    verdict: 'safe_to_quote',
    safeToQuoteCount: 4,
    verifyFirstCount: 0,
    planningOnlyCount: 0,
    unsupportedCount: 0,
    modeledCount: 0,
    averageConfidence: 0.91,
    missingProof: [],
  })

  assert.equal(decision.status, 'ready')
  assert.equal(decision.canPresentAsFinalQuote, true)
  assert.equal(decision.canSendQuote, true)
  assert.equal(decision.displayMode, 'final_quote')
  assert.equal(decision.repairQueue.length, 0)
})

test('pricing enforcement blocks final quote when planning-only prices exist', () => {
  const decision = buildPricingEnforcementDecision({
    totalIngredientCount: 5,
    verdict: 'planning_only',
    safeToQuoteCount: 2,
    verifyFirstCount: 1,
    planningOnlyCount: 2,
    unsupportedCount: 0,
    modeledCount: 2,
    averageConfidence: 0.42,
    missingProof: ['observed market price', 'local market proof'],
  })

  assert.equal(decision.status, 'blocked')
  assert.equal(decision.canPresentAsFinalQuote, false)
  assert.equal(decision.canSendQuote, false)
  assert.equal(decision.displayMode, 'planning_estimate')
  assert.match(decision.message, /planning-only/i)
  assert.ok(decision.repairQueue.some((item) => item.kind === 'find_observed_price'))
  assert.ok(decision.repairQueue.some((item) => item.kind === 'replace_modeled_fallback'))
})

test('pricing enforcement allows sending verify-first quotes with explicit warning', () => {
  const decision = buildPricingEnforcementDecision({
    totalIngredientCount: 3,
    verdict: 'verify_first',
    safeToQuoteCount: 1,
    verifyFirstCount: 2,
    planningOnlyCount: 0,
    unsupportedCount: 0,
    modeledCount: 0,
    averageConfidence: 0.68,
    missingProof: ['fresh timestamp'],
  })

  assert.equal(decision.status, 'verify_first')
  assert.equal(decision.canPresentAsFinalQuote, false)
  assert.equal(decision.canSendQuote, true)
  assert.equal(decision.displayMode, 'verification_required')
  assert.ok(decision.repairQueue.some((item) => item.kind === 'refresh_stale_price'))
})

test('pricing enforcement stays non-blocking when no event ingredients exist', () => {
  const decision = buildPricingEnforcementDecision({
    totalIngredientCount: 0,
    verdict: 'planning_only',
    safeToQuoteCount: 0,
    verifyFirstCount: 0,
    planningOnlyCount: 0,
    unsupportedCount: 0,
    modeledCount: 0,
    averageConfidence: 0,
    missingProof: [],
  })

  assert.equal(decision.status, 'not_applicable')
  assert.equal(decision.canPresentAsFinalQuote, true)
  assert.equal(decision.canSendQuote, true)
  assert.equal(decision.displayMode, 'manual_quote')
})
