/**
 * Unit tests for feature-gate tier resolution.
 *
 * Source of truth for a chef's plan: chefs.subscription_status and
 * chefs.trial_ends_at (lib/db/schema/schema.ts:20091-20092), written by
 * lib/stripe/subscription.ts. Rules mirror tests/unit/billing.tier.test.ts.
 *
 * Run: node --test --import tsx tests/unit/feature-gates.tier-resolution.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTierFromSubscription } from '../../lib/feature-gates/tier-resolution'

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

describe('resolveTierFromSubscription - always-pro statuses', () => {
  it('active grants pro', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'active', trialEndsAt: null }),
      'pro'
    )
  })

  it('grandfathered grants pro', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'grandfathered', trialEndsAt: null }),
      'pro'
    )
  })

  it('past_due grants pro (grace period)', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'past_due', trialEndsAt: null }),
      'pro'
    )
  })
})

describe('resolveTierFromSubscription - trials', () => {
  it('trialing with a future trial end grants pro', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: FUTURE }),
      'pro'
    )
  })

  it('trialing with an expired trial end is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: PAST }),
      'free'
    )
  })

  it('trialing with no trial end date is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: null }),
      'free'
    )
  })

  it('trialing with an unparseable trial end date is free (fail closed)', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: 'not-a-date' }),
      'free'
    )
  })
})

describe('resolveTierFromSubscription - everything else is free', () => {
  it('canceled is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'canceled', trialEndsAt: null }),
      'free'
    )
  })

  it('null status is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: null, trialEndsAt: null }),
      'free'
    )
  })

  it('unknown status string is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'mystery', trialEndsAt: null }),
      'free'
    )
  })

  it('never returns enterprise (no storage for it yet)', () => {
    for (const status of ['active', 'grandfathered', 'past_due', 'canceled', null]) {
      const tier = resolveTierFromSubscription({ subscriptionStatus: status, trialEndsAt: null })
      assert.notEqual(tier, 'enterprise')
    }
  })
})
