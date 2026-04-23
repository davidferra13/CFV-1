import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildStockCoverageMap,
  consolidateIngredientRows,
  estimateIngredientCostCents,
  getIngredientPlanningKey,
  type IngredientPlanningMeta,
} from '@/lib/inventory/planning-support'

function createMetaMap(...items: IngredientPlanningMeta[]) {
  return new Map(items.map((item) => [item.ingredientId, item]))
}

test('consolidateIngredientRows normalizes mixed compatible units into the ingredient default unit', () => {
  const meta = createMetaMap({
    ingredientId: 'flour-1',
    ingredientName: 'All-Purpose Flour',
    defaultUnit: 'lb',
    densityGPerMl: 0.53,
    lastPriceCents: 300,
    priceUnit: 'lb',
    preferredVendorId: null,
  })

  const consolidated = consolidateIngredientRows(
    [
      { ingredientId: 'flour-1', ingredientName: 'All-Purpose Flour', quantity: 2, unit: 'cup' },
      { ingredientId: 'flour-1', ingredientName: 'All-Purpose Flour', quantity: 8, unit: 'oz' },
    ],
    meta
  )

  assert.equal(consolidated.length, 1)
  assert.equal(consolidated[0].unit, 'lb')
  assert.ok(Math.abs(consolidated[0].quantity - 1.053) < 0.01, consolidated[0].quantity)
})

test('consolidateIngredientRows preserves separate buckets when units are not convertible', () => {
  const meta = createMetaMap({
    ingredientId: 'eggs-1',
    ingredientName: 'Eggs',
    defaultUnit: 'each',
    densityGPerMl: null,
    lastPriceCents: 25,
    priceUnit: 'each',
    preferredVendorId: null,
  })

  const consolidated = consolidateIngredientRows(
    [
      { ingredientId: 'eggs-1', ingredientName: 'Eggs', quantity: 12, unit: 'each' },
      { ingredientId: 'eggs-1', ingredientName: 'Eggs', quantity: 2, unit: 'lb' },
    ],
    meta
  )

  assert.equal(consolidated.length, 2)
  assert.deepEqual(
    consolidated.map((row) => [row.unit, row.quantity]),
    [
      ['each', 12],
      ['lb', 2],
    ]
  )
})

test('buildStockCoverageMap converts stock into the need unit and surfaces unresolved stock rows', () => {
  const meta = createMetaMap({
    ingredientId: 'flour-1',
    ingredientName: 'All-Purpose Flour',
    defaultUnit: 'lb',
    densityGPerMl: 0.53,
    lastPriceCents: 300,
    priceUnit: 'lb',
    preferredVendorId: null,
  })

  const coverage = buildStockCoverageMap(
    [
      {
        ingredientId: 'flour-1',
        ingredientName: 'All-Purpose Flour',
        quantity: 2,
        unit: 'cup',
      },
    ],
    [
      { ingredientId: 'flour-1', unit: 'lb', currentQty: 1 },
      { ingredientId: 'flour-1', unit: 'cup', currentQty: 1 },
      { ingredientId: 'flour-1', unit: 'each', currentQty: 6 },
    ],
    meta
  )

  const flourCoverage = coverage.get(getIngredientPlanningKey('flour-1', 'cup'))
  assert.ok(flourCoverage)
  assert.ok(Math.abs(flourCoverage.onHandQty - 4.617) < 0.02, flourCoverage.onHandQty)
  assert.deepEqual(flourCoverage.unresolvedStockRows, [
    { ingredientId: 'flour-1', unit: 'each', currentQty: 6 },
  ])
})

test('estimateIngredientCostCents respects price unit normalization with density conversion', () => {
  const estimated = estimateIngredientCostCents(2, 'cup', {
    ingredientId: 'flour-1',
    ingredientName: 'All-Purpose Flour',
    defaultUnit: 'lb',
    densityGPerMl: 0.53,
    lastPriceCents: 300,
    priceUnit: 'lb',
    preferredVendorId: null,
  })

  assert.ok(Math.abs(estimated - 166) <= 5, estimated)
})
