import test from 'node:test'
import assert from 'node:assert/strict'
import { computeLoyaltyInvoiceAdjustments } from '@/lib/loyalty/invoice-adjustments'

test('applies fixed then percent discount in deterministic order', () => {
  const result = computeLoyaltyInvoiceAdjustments(10_000, [
    {
      id: 'r1',
      rewardId: 'reward-fixed',
      rewardName: '$25 Off',
      rewardType: 'discount_fixed',
      pointsSpent: 100,
      createdAt: '2026-02-01T10:00:00.000Z',
      rewardValueCents: 2_500,
      rewardPercent: null,
      valuationSource: 'snapshot',
    },
    {
      id: 'r2',
      rewardId: 'reward-percent',
      rewardName: '20% Off',
      rewardType: 'discount_percent',
      pointsSpent: 150,
      createdAt: '2026-02-01T10:01:00.000Z',
      rewardValueCents: null,
      rewardPercent: 20,
      valuationSource: 'snapshot',
    },
  ])

  assert.equal(result.totalDiscountCents, 4_000)
  assert.equal(result.adjustedServiceCents, 6_000)
  assert.equal(result.appliedRedemptions.length, 2)
  assert.equal(result.appliedRedemptions[0].discountCents, 2_500)
  assert.equal(result.appliedRedemptions[1].discountCents, 1_500)
})

test('caps stacked discounts so adjusted subtotal never goes below zero', () => {
  const result = computeLoyaltyInvoiceAdjustments(5_000, [
    {
      id: 'r1',
      rewardId: 'reward-80pct',
      rewardName: '80% Off',
      rewardType: 'discount_percent',
      pointsSpent: 250,
      createdAt: '2026-02-01T10:00:00.000Z',
      rewardValueCents: null,
      rewardPercent: 80,
      valuationSource: 'snapshot',
    },
    {
      id: 'r2',
      rewardId: 'reward-fixed',
      rewardName: '$20 Off',
      rewardType: 'discount_fixed',
      pointsSpent: 120,
      createdAt: '2026-02-01T10:01:00.000Z',
      rewardValueCents: 2_000,
      rewardPercent: null,
      valuationSource: 'snapshot',
    },
    {
      id: 'r3',
      rewardId: 'reward-extra',
      rewardName: '$1 Off',
      rewardType: 'discount_fixed',
      pointsSpent: 10,
      createdAt: '2026-02-01T10:02:00.000Z',
      rewardValueCents: 100,
      rewardPercent: null,
      valuationSource: 'snapshot',
    },
  ])

  assert.equal(result.totalDiscountCents, 5_000)
  assert.equal(result.adjustedServiceCents, 0)
  assert.equal(result.appliedRedemptions.length, 2)
  assert.equal(result.appliedRedemptions[1].discountCents, 1_000)
})

test('ignores non-discount rewards and zero-value discount rows', () => {
  const result = computeLoyaltyInvoiceAdjustments(10_000, [
    {
      id: 'r1',
      rewardId: 'reward-course',
      rewardName: 'Free Course',
      rewardType: 'free_course',
      pointsSpent: 60,
      createdAt: '2026-02-01T10:00:00.000Z',
      rewardValueCents: null,
      rewardPercent: null,
      valuationSource: 'unknown',
    },
    {
      id: 'r2',
      rewardId: 'reward-bad-fixed',
      rewardName: 'Broken Fixed Discount',
      rewardType: 'discount_fixed',
      pointsSpent: 60,
      createdAt: '2026-02-01T10:01:00.000Z',
      rewardValueCents: null,
      rewardPercent: null,
      valuationSource: 'unknown',
    },
  ])

  assert.equal(result.totalDiscountCents, 0)
  assert.equal(result.adjustedServiceCents, 10_000)
  assert.equal(result.appliedRedemptions.length, 0)
})

test('uses createdAt then id ordering when timestamps are equal', () => {
  const result = computeLoyaltyInvoiceAdjustments(10_000, [
    {
      id: 'b',
      rewardId: 'reward-percent',
      rewardName: '50% Off',
      rewardType: 'discount_percent',
      pointsSpent: 200,
      createdAt: '2026-02-01T10:00:00.000Z',
      rewardValueCents: null,
      rewardPercent: 50,
      valuationSource: 'snapshot',
    },
    {
      id: 'a',
      rewardId: 'reward-fixed',
      rewardName: '$10 Off',
      rewardType: 'discount_fixed',
      pointsSpent: 80,
      createdAt: '2026-02-01T10:00:00.000Z',
      rewardValueCents: 1_000,
      rewardPercent: null,
      valuationSource: 'snapshot',
    },
  ])

  assert.equal(result.appliedRedemptions[0].redemptionId, 'a')
  assert.equal(result.totalDiscountCents, 5_500)
  assert.equal(result.adjustedServiceCents, 4_500)
})
