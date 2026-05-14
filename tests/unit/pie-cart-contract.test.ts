import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPieCartPlan } from '@/lib/chef-ops/pie-cart'

describe('PIE Cart contract', () => {
  it('creates ready-to-shop plans from reliable priced lines', () => {
    const plan = buildPieCartPlan(
      [
        {
          ingredientName: 'Prime rib',
          requiredQuantity: 10,
          unit: 'lb',
          unitPriceCents: 1800,
          confidence: 0.9,
          resolutionTier: 'chef_receipt',
          freshness: 'current',
          packSize: { quantity: 5, unit: 'lb', priceCents: 9000 },
        },
        {
          ingredientName: 'Potatoes',
          requiredQuantity: 8,
          unit: 'lb',
          unitPriceCents: 150,
          confidence: 0.8,
          resolutionTier: 'regional',
          freshness: 'recent',
          lastSavedUnitPriceCents: 140,
        },
      ],
      'snapshot_plan',
      { quoteTotalCents: 100000, targetMarginPercent: 50 }
    )

    assert.equal(plan.totalCents, 19200)
    assert.equal(plan.readiness, 'ready_to_shop')
    assert.equal(plan.nextActions.includes('create_procurement_brief'), true)
    assert.equal(plan.intelligence.confidenceSla, 'green')
    assert.equal(plan.economics.marginProtected, true)
    assert.equal(
      plan.procurement.taskBoard.some((task) => task.kind === 'create_procurement_brief'),
      true
    )
    assert.equal(plan.lines[0].purchasePlan.packLabel, '2 x 5 lb')
    assert.equal(plan.lines[0].purchasePlan.leftoverQuantity, 0)
  })

  it('never leaves prices blank and flags synthetic review work', () => {
    const plan = buildPieCartPlan(
      [{ ingredientName: 'Fresh herbs', requiredQuantity: 3, unit: 'bunch', category: 'produce' }],
      'saved_cart'
    )

    assert.equal(plan.lines[0].unitPriceCents > 0, true)
    assert.equal(plan.lines[0].fallbackUsed, true)
    assert.equal(plan.readiness, 'low_confidence')
    assert.equal(plan.nextActions.includes('review_synthetic_prices'), true)
    assert.deepEqual(plan.lines[0].riskFlags, ['synthetic_price', 'low_confidence'])
    assert.equal(plan.procurement.reviewCount, 1)
    assert.equal(plan.intelligence.sourceTransparency[0].label, 'Synthetic PIE fallback')
    assert.equal(
      plan.procurement.commandCenter.some((metric) => metric.metric === 'Leftover value'),
      true
    )
  })

  it('detects drift, actual variance, and margin rescue work', () => {
    const plan = buildPieCartPlan(
      [
        {
          ingredientName: 'Wild salmon',
          requiredQuantity: 10,
          unit: 'lb',
          unitPriceCents: 1299,
          lastSavedUnitPriceCents: 999,
          actualUnitPriceCents: 1399,
          confidence: 0.86,
          resolutionTier: 'zip_local',
          freshness: 'current',
          volatility: 'high',
          substitutionAllowed: true,
        },
      ],
      'logged_estimate',
      { quoteTotalCents: 20000, targetMarginPercent: 45, budgetCeilingCents: 10000 }
    )

    assert.equal(plan.readiness, 'margin_risk')
    assert.equal(plan.intelligence.driftPct, 30)
    assert.equal(plan.actualTotalCents, 13990)
    assert.equal(plan.lines[0].actualVarianceCents, 1000)
    assert.equal(plan.lines[0].riskFlags.includes('price_spike'), true)
    assert.equal(
      plan.economics.rescueActions.includes('reduce_or_substitute_high_cost_lines'),
      true
    )
  })
})
