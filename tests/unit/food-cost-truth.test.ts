import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildEventFoodCostTruth,
  calculateFoodCostPercent,
  calculateFoodCostVariance,
  sumFoodExpenseCents,
} from '@/lib/finance/food-cost-truth'

describe('Food Cost Truth pure calculations', () => {
  it('computes complete event food cost truth with 0-100 percent values', () => {
    const truth = buildEventFoodCostTruth({
      eventId: 'event-1',
      eventName: 'Spring dinner',
      eventDate: '2026-04-29',
      guestCount: 10,
      projectedFoodCostCents: 12000,
      actualFoodCostCents: 15000,
      revenueCents: 50000,
      revenueBasis: 'collected_revenue',
      sources: ['menu_cost_summary', 'event_expenses', 'ledger_entries'],
    })

    assert.equal(truth.foodCostPercent, 30)
    assert.equal(truth.varianceCents, 3000)
    assert.equal(truth.variancePercent, 25)
    assert.equal(truth.dataState, 'complete')
    assert.deepEqual(truth.missingReasons, [])
  })

  it('returns null percent and missing revenue state instead of fake zero', () => {
    const truth = buildEventFoodCostTruth({
      eventId: 'event-2',
      eventName: 'Unpaid dinner',
      eventDate: null,
      guestCount: null,
      projectedFoodCostCents: 12000,
      actualFoodCostCents: 15000,
      revenueCents: 0,
      revenueBasis: null,
      sources: ['menu_cost_summary', 'event_expenses'],
    })

    assert.equal(truth.foodCostPercent, null)
    assert.equal(truth.dataState, 'missing_revenue')
    assert.deepEqual(truth.missingReasons, ['Missing revenue'])
  })

  it('keeps projected cost visible when actual cost is missing', () => {
    const truth = buildEventFoodCostTruth({
      eventId: 'event-3',
      eventName: 'Planned menu',
      eventDate: null,
      guestCount: 8,
      projectedFoodCostCents: 9000,
      actualFoodCostCents: null,
      revenueCents: 30000,
      revenueBasis: 'quoted_price',
      sources: ['menu_cost_summary'],
    })

    assert.equal(truth.projectedFoodCostCents, 9000)
    assert.equal(truth.actualFoodCostCents, null)
    assert.equal(truth.varianceCents, null)
    assert.equal(truth.variancePercent, null)
    assert.equal(truth.dataState, 'missing_actual_cost')
    assert.deepEqual(truth.missingReasons, ['Missing actual food cost'])
  })

  it('treats negative variance as valid savings', () => {
    const variance = calculateFoodCostVariance(12000, 9000)

    assert.deepEqual(variance, {
      varianceCents: -3000,
      variancePercent: -25,
    })
  })

  it('preserves negative net food cost when leftover credits exceed spend', () => {
    const truth = buildEventFoodCostTruth({
      eventId: 'event-credits',
      eventName: 'Leftover credit event',
      eventDate: null,
      guestCount: 6,
      projectedFoodCostCents: 5000,
      actualFoodCostCents: 3000,
      netFoodCostCents: -1000,
      revenueCents: 20000,
      revenueBasis: 'collected_revenue',
      sources: ['menu_cost_summary', 'event_expenses', 'ledger_entries'],
    })

    assert.equal(truth.netFoodCostCents, -1000)
    assert.equal(truth.foodCostPercent, null)
    assert.equal(truth.dataState, 'complete')
  })

  it('returns null for food cost percent when revenue is missing', () => {
    assert.equal(calculateFoodCostPercent(15000, 0), null)
    assert.equal(calculateFoodCostPercent(15000, null), null)
  })

  it('sums only business food expense categories', () => {
    const total = sumFoodExpenseCents([
      { category: 'groceries', amount_cents: 10000, is_business: true },
      { category: 'alcohol', amount_cents: 2500, is_business: true },
      { category: 'specialty_items', amount_cents: 1200, is_business: true },
      { category: 'labor', amount_cents: 5000, is_business: true },
      { category: 'groceries', amount_cents: 9999, is_business: false },
    ])

    assert.equal(total, 13700)
  })
})
