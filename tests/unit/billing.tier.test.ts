/**
 * Unit tests for Billing Tier Resolution
 *
 * Tests the tier resolution logic that determines Free vs Pro access.
 * This is P1 — wrong tier = users locked out of paid features or
 * getting Pro features for free.
 *
 * Tests the pure logic extracted from lib/billing/tier.ts.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─────────────────────────────────────────────────────────────────────────────
// TIER RESOLUTION LOGIC (extracted from lib/billing/tier.ts)
// ─────────────────────────────────────────────────────────────────────────────

type Tier = 'free' | 'pro'
type TierStatus = {
  tier: Tier
  isGrandfathered: boolean
  subscriptionStatus: string | null
}

/**
 * Pure function version of getTierForChef — same logic, no DB dependency.
 * This mirrors the exact logic in lib/billing/tier.ts.
 */
function resolveTier(subscriptionStatus: string | null, trialEndsAt: string | null): TierStatus {
  const isGrandfathered = subscriptionStatus === 'grandfathered'

  // These statuses always grant Pro
  const alwaysProStatuses = ['grandfathered', 'active', 'past_due']
  if (subscriptionStatus && alwaysProStatuses.includes(subscriptionStatus)) {
    return { tier: 'pro', isGrandfathered, subscriptionStatus }
  }

  // Trialing: Pro only if the trial hasn't expired
  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt)
    if (trialEnd > new Date()) {
      return { tier: 'pro', isGrandfathered: false, subscriptionStatus }
    }
  }

  // Everything else (canceled, unpaid, expired trial, null) → Free
  return { tier: 'free', isGrandfathered, subscriptionStatus }
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Tier Resolution — always-Pro statuses', () => {
  it('grandfathered → Pro + isGrandfathered=true', () => {
    const result = resolveTier('grandfathered', null)
    assert.equal(result.tier, 'pro')
    assert.equal(result.isGrandfathered, true)
    assert.equal(result.subscriptionStatus, 'grandfathered')
  })

  it('active → Pro', () => {
    const result = resolveTier('active', null)
    assert.equal(result.tier, 'pro')
    assert.equal(result.isGrandfathered, false)
  })

  it('past_due → Pro (grace period while Stripe retries)', () => {
    const result = resolveTier('past_due', null)
    assert.equal(result.tier, 'pro')
    assert.equal(result.isGrandfathered, false)
  })
})

describe('Tier Resolution — trial handling', () => {
  it('trialing with future trial_ends_at → Pro', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 14)
    const result = resolveTier('trialing', futureDate.toISOString())
    assert.equal(result.tier, 'pro')
  })

  it('trialing with past trial_ends_at → Free (trial expired)', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const result = resolveTier('trialing', pastDate.toISOString())
    assert.equal(result.tier, 'free')
  })

  it('trialing with no trial_ends_at → Free (safety fallback)', () => {
    const result = resolveTier('trialing', null)
    assert.equal(result.tier, 'free')
  })
})

describe('Tier Resolution — Free-tier statuses', () => {
  it('canceled → Free', () => {
    const result = resolveTier('canceled', null)
    assert.equal(result.tier, 'free')
  })

  it('unpaid → Free', () => {
    const result = resolveTier('unpaid', null)
    assert.equal(result.tier, 'free')
  })

  it('null (no subscription) → Free', () => {
    const result = resolveTier(null, null)
    assert.equal(result.tier, 'free')
    assert.equal(result.isGrandfathered, false)
  })

  it('empty string → Free', () => {
    const result = resolveTier('', null)
    assert.equal(result.tier, 'free')
  })

  it('unknown status → Free (safety fallback)', () => {
    const result = resolveTier('some_unknown_status', null)
    assert.equal(result.tier, 'free')
  })
})

describe('Tier Resolution — isGrandfathered flag', () => {
  it('only true when status is grandfathered', () => {
    assert.equal(resolveTier('grandfathered', null).isGrandfathered, true)
    assert.equal(resolveTier('active', null).isGrandfathered, false)
    assert.equal(resolveTier('canceled', null).isGrandfathered, false)
    assert.equal(resolveTier(null, null).isGrandfathered, false)
  })
})

describe('Tier Resolution — subscriptionStatus passthrough', () => {
  it('passes the raw status through for UI consumption', () => {
    assert.equal(resolveTier('active', null).subscriptionStatus, 'active')
    assert.equal(resolveTier('canceled', null).subscriptionStatus, 'canceled')
    assert.equal(resolveTier(null, null).subscriptionStatus, null)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PRO FEATURE REQUIRED ERROR
// ─────────────────────────────────────────────────────────────────────────────

describe('ProFeatureRequiredError', () => {
  it('has correct name, code, and featureSlug', async () => {
    // Dynamic import to avoid 'use server' issues
    const { ProFeatureRequiredError } = await import('../../lib/billing/errors.js')
    const err = new ProFeatureRequiredError('marketing')
    assert.equal(err.name, 'ProFeatureRequiredError')
    assert.equal(err.code, 'PRO_FEATURE_REQUIRED')
    assert.equal(err.featureSlug, 'marketing')
    assert.ok(err.message.includes('marketing'))
    assert.ok(err instanceof Error)
  })
})
