import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  computeVendorPriceAlerts,
  computeVendorPriceTrends,
} = require('../../lib/vendors/price-insights.ts')

test('computeVendorPriceAlerts returns only changed latest price points', () => {
  const alerts = computeVendorPriceAlerts(
    [
      {
        vendor_id: 'v1',
        vendor_name: 'Vendor One',
        item_name: 'Mozzarella',
        unit: '5 lb',
        price_cents: 2500,
        recorded_at: '2026-03-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v1',
        vendor_name: 'Vendor One',
        item_name: 'Mozzarella',
        unit: '5 lb',
        price_cents: 3000,
        recorded_at: '2026-03-02T10:00:00.000Z',
      },
      {
        vendor_id: 'v2',
        vendor_name: 'Vendor Two',
        item_name: 'Tomato Sauce',
        unit: 'each',
        price_cents: 1800,
        recorded_at: '2026-03-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v2',
        vendor_name: 'Vendor Two',
        item_name: 'Tomato Sauce',
        unit: 'each',
        price_cents: 1800,
        recorded_at: '2026-03-02T10:00:00.000Z',
      },
    ],
    10
  )

  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].vendor_id, 'v1')
  assert.equal(alerts[0].direction, 'up')
  assert.equal(alerts[0].delta_cents, 500)
})

test('computeVendorPriceAlerts sorts by largest percentage movement first', () => {
  const alerts = computeVendorPriceAlerts(
    [
      {
        vendor_id: 'v1',
        vendor_name: 'Vendor One',
        item_name: 'Flour',
        unit: '25 lb',
        price_cents: 1200,
        recorded_at: '2026-03-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v1',
        vendor_name: 'Vendor One',
        item_name: 'Flour',
        unit: '25 lb',
        price_cents: 1800,
        recorded_at: '2026-03-02T10:00:00.000Z',
      },
      {
        vendor_id: 'v2',
        vendor_name: 'Vendor Two',
        item_name: 'Olive Oil',
        unit: '1 l',
        price_cents: 2000,
        recorded_at: '2026-03-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v2',
        vendor_name: 'Vendor Two',
        item_name: 'Olive Oil',
        unit: '1 l',
        price_cents: 2300,
        recorded_at: '2026-03-02T10:00:00.000Z',
      },
    ],
    10
  )

  assert.equal(alerts.length, 2)
  assert.equal(alerts[0].item_name, 'Flour')
  assert.ok(Math.abs(alerts[0].delta_percent) > Math.abs(alerts[1].delta_percent))
})

test('computeVendorPriceTrends returns direction and bounded points', () => {
  const trends = computeVendorPriceTrends(
    [
      {
        vendor_id: 'v1',
        vendor_name: 'Vendor One',
        item_name: 'Mozzarella',
        unit: '5 lb',
        price_cents: 2000,
        recorded_at: '2026-01-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v1',
        vendor_name: 'Vendor One',
        item_name: 'Mozzarella',
        unit: '5 lb',
        price_cents: 2200,
        recorded_at: '2026-02-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v1',
        vendor_name: 'Vendor One',
        item_name: 'Mozzarella',
        unit: '5 lb',
        price_cents: 2100,
        recorded_at: '2026-03-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v2',
        vendor_name: 'Vendor Two',
        item_name: 'Tomatoes',
        unit: '25 lb',
        price_cents: 4000,
        recorded_at: '2026-01-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v2',
        vendor_name: 'Vendor Two',
        item_name: 'Tomatoes',
        unit: '25 lb',
        price_cents: 3600,
        recorded_at: '2026-02-01T10:00:00.000Z',
      },
      {
        vendor_id: 'v2',
        vendor_name: 'Vendor Two',
        item_name: 'Tomatoes',
        unit: '25 lb',
        price_cents: 3400,
        recorded_at: '2026-03-01T10:00:00.000Z',
      },
    ],
    { maxItems: 10, pointsPerItem: 2 }
  )

  assert.equal(trends.length, 2)
  assert.equal(trends[0].points.length, 2)

  const mozzarellaTrend = trends.find((trend: any) => trend.item_name === 'Mozzarella')
  const tomatoesTrend = trends.find((trend: any) => trend.item_name === 'Tomatoes')

  assert.equal(mozzarellaTrend?.direction, 'down')
  assert.equal(tomatoesTrend?.direction, 'down')
  assert.ok((mozarellaOrThrow(mozzarellaTrend).change_percent ?? 0) < 0)
})

function mozarellaOrThrow<T>(value: T | undefined | null): T {
  assert.ok(value)
  return value
}
