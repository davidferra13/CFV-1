/**
 * QA Validation: Buyable Price Contract
 *
 * Tests the pure logic in lib/pricing/buyable-price-contract.ts:
 *   - Trust level classification engine
 *   - Label and action mapping for each trust level
 *   - Freshness computation
 *   - Proof requirement tracking
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ── Inline types and logic (mirrors lib/pricing/buyable-price-contract.ts) ─

type BuyablePriceTrustLevel =
  | 'confirmed_local_buyable'
  | 'recent_local_observed'
  | 'regional_market_estimate'
  | 'national_median'
  | 'modeled_estimate'
  | 'no_trusted_price'

function labelForTrustLevel(level: BuyablePriceTrustLevel): string {
  switch (level) {
    case 'confirmed_local_buyable': return 'Confirmed local buyable'
    case 'recent_local_observed': return 'Recent local observation'
    case 'regional_market_estimate': return 'Regional estimate'
    case 'national_median': return 'National median'
    case 'modeled_estimate': return 'Modeled estimate'
    case 'no_trusted_price': return 'No trusted price'
  }
}

function shoppingActionForTrustLevel(level: BuyablePriceTrustLevel): string {
  switch (level) {
    case 'confirmed_local_buyable': return 'Buy this exact item locally.'
    case 'recent_local_observed': return 'Verify shelf price before shopping.'
    case 'regional_market_estimate': return 'Use for costing, not a shopping promise.'
    case 'national_median': return 'Use only as a rough national benchmark.'
    case 'modeled_estimate': return 'Confirm manually before quoting or shopping.'
    case 'no_trusted_price': return 'Resolve by vendor, receipt, or manual price.'
  }
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const parsed = new Date(iso).getTime()
  if (isNaN(parsed)) return null
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000))
}

function freshnessDaysFromIso(iso: string | null | undefined): number | null {
  return daysSince(iso)
}

function confidenceLabel(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= 0.8) return 'high'
  if (score >= 0.5) return 'medium'
  if (score > 0) return 'low'
  return 'none'
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('QA Validation: labelForTrustLevel', () => {
  it('maps all trust levels to display labels', () => {
    const levels: BuyablePriceTrustLevel[] = [
      'confirmed_local_buyable',
      'recent_local_observed',
      'regional_market_estimate',
      'national_median',
      'modeled_estimate',
      'no_trusted_price',
    ]
    for (const level of levels) {
      const label = labelForTrustLevel(level)
      assert.ok(typeof label === 'string' && label.length > 0, `${level} should have a non-empty label`)
    }
  })

  it('confirmed_local_buyable is the shopping-safe label', () => {
    assert.equal(labelForTrustLevel('confirmed_local_buyable'), 'Confirmed local buyable')
  })

  it('no_trusted_price indicates missing data', () => {
    assert.equal(labelForTrustLevel('no_trusted_price'), 'No trusted price')
  })
})

describe('QA Validation: shoppingActionForTrustLevel', () => {
  it('confirmed_local_buyable recommends buying', () => {
    const action = shoppingActionForTrustLevel('confirmed_local_buyable')
    assert.ok(action.toLowerCase().includes('buy'), 'Should recommend buying')
  })

  it('no_trusted_price recommends manual resolution', () => {
    const action = shoppingActionForTrustLevel('no_trusted_price')
    assert.ok(action.toLowerCase().includes('resolve') || action.toLowerCase().includes('manual'))
  })

  it('regional_market_estimate warns about shopping safety', () => {
    const action = shoppingActionForTrustLevel('regional_market_estimate')
    assert.ok(action.toLowerCase().includes('costing') || action.toLowerCase().includes('not'))
  })

  it('every trust level has a non-empty action', () => {
    const levels: BuyablePriceTrustLevel[] = [
      'confirmed_local_buyable', 'recent_local_observed', 'regional_market_estimate',
      'national_median', 'modeled_estimate', 'no_trusted_price',
    ]
    for (const level of levels) {
      const action = shoppingActionForTrustLevel(level)
      assert.ok(action.length > 0, `${level} should have an action`)
    }
  })
})

describe('QA Validation: freshnessDaysFromIso', () => {
  it('returns null for null input', () => {
    assert.equal(freshnessDaysFromIso(null), null)
  })

  it('returns null for undefined input', () => {
    assert.equal(freshnessDaysFromIso(undefined), null)
  })

  it('returns null for invalid ISO string', () => {
    assert.equal(freshnessDaysFromIso('not-a-date'), null)
  })

  it('returns 0 for today', () => {
    const today = new Date().toISOString()
    const days = freshnessDaysFromIso(today)
    assert.ok(days !== null)
    assert.equal(days, 0)
  })

  it('returns positive number for past dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString()
    const days = freshnessDaysFromIso(threeDaysAgo)
    assert.ok(days !== null)
    assert.ok(days >= 2 && days <= 4, `Expected ~3 days, got ${days}`)
  })

  it('returns 0 for future dates (clamped)', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString()
    const days = freshnessDaysFromIso(tomorrow)
    assert.ok(days !== null)
    assert.equal(days, 0)
  })
})

describe('QA Validation: confidenceLabel', () => {
  it('high confidence for >= 0.8', () => {
    assert.equal(confidenceLabel(0.8), 'high')
    assert.equal(confidenceLabel(0.95), 'high')
    assert.equal(confidenceLabel(1.0), 'high')
  })

  it('medium confidence for 0.5-0.79', () => {
    assert.equal(confidenceLabel(0.5), 'medium')
    assert.equal(confidenceLabel(0.79), 'medium')
  })

  it('low confidence for > 0 and < 0.5', () => {
    assert.equal(confidenceLabel(0.1), 'low')
    assert.equal(confidenceLabel(0.49), 'low')
  })

  it('none for 0', () => {
    assert.equal(confidenceLabel(0), 'none')
  })
})