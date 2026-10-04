import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculatePurchaseRatio,
  summarizePurchaseCosts,
} from '../../lib/finance/purchase-cost-summary'

test('purchases without revenue do not report a healthy zero percent', () => {
  assert.equal(calculatePurchaseRatio(45000, 0), null)
  assert.equal(calculatePurchaseRatio(0, 0), null)
  assert.equal(calculatePurchaseRatio(45000, -10000), null)
})

test('zero purchases with recorded revenue is a real zero percent', () => {
  assert.equal(calculatePurchaseRatio(0, 10000), 0)
})

test('purchase ratios retain precision and overspending above 100 percent', () => {
  assert.equal(calculatePurchaseRatio(12345, 50000), 24.7)
  assert.equal(calculatePurchaseRatio(15000, 10000), 150)
})

test('non-finite totals never become a percentage', () => {
  assert.equal(calculatePurchaseRatio(NaN, 10000), null)
  assert.equal(calculatePurchaseRatio(10000, Infinity), null)
  assert.equal(calculatePurchaseRatio(Infinity, 10000), null)
})

test('same-day revenue entries are summed instead of overwritten', () => {
  const result = summarizePurchaseCosts(
    [
      { date: '2026-10-04', total_revenue_cents: 10000 },
      { date: '2026-10-04', total_revenue_cents: 20000 },
    ],
    [{ invoice_date: '2026-10-04', total_cents: 9000 }]
  )
  assert.equal(result.revenueCents, 30000)
  assert.equal(result.purchasesCents, 9000)
  assert.equal(result.purchasePercent, 30)
  assert.deepEqual(result.dailyData, [
    { date: '2026-10-04', revenueCents: 30000, purchasesCents: 9000, purchasePercent: 30 },
  ])
})

test('purchase-only days remain visible without invented percentages', () => {
  const result = summarizePurchaseCosts(
    [{ date: '2026-10-03', total_revenue_cents: 10000 }],
    [
      { invoice_date: '2026-10-04', total_cents: 6000 },
      { invoice_date: '2026-10-04', total_cents: 3000 },
    ]
  )
  assert.equal(result.purchasePercent, 90)
  assert.deepEqual(result.dailyData, [
    { date: '2026-10-04', revenueCents: 0, purchasesCents: 9000, purchasePercent: null },
    { date: '2026-10-03', revenueCents: 10000, purchasesCents: 0, purchasePercent: 0 },
  ])
})

test('empty and nullable records preserve the no-revenue state', () => {
  assert.deepEqual(summarizePurchaseCosts([], []), {
    revenueCents: 0,
    purchasesCents: 0,
    purchasePercent: null,
    dailyData: [],
  })
  assert.equal(
    summarizePurchaseCosts(
      [{ date: '2026-10-04', total_revenue_cents: null }],
      [{ invoice_date: '2026-10-04', total_cents: null }]
    ).purchasePercent,
    null
  )
})

test('invoice credits remain part of net purchase spending', () => {
  const result = summarizePurchaseCosts(
    [{ date: '2026-10-04', total_revenue_cents: 10000 }],
    [
      { invoice_date: '2026-10-04', total_cents: 3000 },
      { invoice_date: '2026-10-04', total_cents: -1000 },
    ]
  )
  assert.equal(result.purchasesCents, 2000)
  assert.equal(result.purchasePercent, 20)
})
