import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getFreshnessState,
  getNextRefreshTime,
  getRefreshPolicy,
  getRetryDelayMs,
  getStaleDecay,
  getStaleTimeMs,
  shouldWatchdogFlag,
} from '../../lib/culinary-intelligence/refresh'

const DAY_MS = 24 * 60 * 60 * 1000

test('receipt records do not schedule refreshes but still decay as evidence', () => {
  const capturedAt = new Date('2026-04-01T00:00:00.000Z')
  const now = new Date('2026-05-16T00:00:00.000Z')
  const record = {
    sourceType: 'receipt' as const,
    factType: 'price_cents' as const,
    capturedAt,
  }

  assert.equal(getNextRefreshTime(record), null)
  assert.equal(getFreshnessState(record, now), 'stale')
  assert.equal(getStaleTimeMs(record, now), 30 * DAY_MS)
  assert.ok(getStaleDecay(record, now) < 1)
  assert.ok(getStaleDecay(record, now) > 0)
})

test('recall feeds refresh daily', () => {
  const capturedAt = new Date('2026-04-28T10:00:00.000Z')
  const record = {
    sourceType: 'recall_feed' as const,
    factType: 'recall' as const,
    capturedAt,
  }

  assert.equal(getNextRefreshTime(record)?.toISOString(), '2026-04-29T10:00:00.000Z')
  assert.equal(getRefreshPolicy('recall_feed').refreshIntervalMs, DAY_MS)
})

test('license refresh is driven by the earlier scheduled check or expiry lead time', () => {
  const capturedAt = new Date('2026-04-01T00:00:00.000Z')
  const expiresAt = new Date('2026-05-01T00:00:00.000Z')
  const record = {
    sourceType: 'license' as const,
    factType: 'license_validity' as const,
    capturedAt,
    expiresAt,
  }

  assert.equal(getNextRefreshTime(record)?.toISOString(), '2026-04-01T00:00:00.000Z')
  assert.equal(getFreshnessState(record, new Date('2026-05-01T00:00:00.000Z')), 'expired')
})

test('retry delay uses capped exponential backoff', () => {
  assert.equal(getRetryDelayMs('recall_feed', 0), 5 * 60 * 1000)
  assert.equal(getRetryDelayMs('recall_feed', 3), 40 * 60 * 1000)
  assert.equal(getRetryDelayMs('recall_feed', 20), 6 * 60 * 60 * 1000)
})

test('stale decay drops from one to zero across the stale window', () => {
  const capturedAt = new Date('2026-04-01T00:00:00.000Z')
  const freshRecord = {
    sourceType: 'distributor_catalog' as const,
    capturedAt,
  }
  const staleRecord = {
    sourceType: 'distributor_catalog' as const,
    capturedAt,
  }

  assert.equal(getStaleDecay(freshRecord, new Date('2026-04-05T00:00:00.000Z')), 1)
  assert.equal(getFreshnessState(staleRecord, new Date('2026-04-20T00:00:00.000Z')), 'stale')
  assert.ok(getStaleDecay(staleRecord, new Date('2026-04-20T00:00:00.000Z')) < 1)
  assert.equal(getStaleDecay(staleRecord, new Date('2026-05-20T00:00:00.000Z')), 0)
})

test('watchdog flags stuck captures and reviews only after the policy window', () => {
  const now = new Date('2026-04-28T12:00:00.000Z')
  const recentCapture = {
    sourceType: 'scraper' as const,
    capturedAt: new Date('2026-04-28T11:00:00.000Z'),
    status: 'capturing' as const,
    statusChangedAt: new Date('2026-04-28T11:00:00.000Z'),
  }
  const stuckCapture = {
    ...recentCapture,
    statusChangedAt: new Date('2026-04-28T09:59:00.000Z'),
  }
  const stuckReview = {
    sourceType: 'license' as const,
    capturedAt: new Date('2026-04-25T11:00:00.000Z'),
    status: 'needs_review' as const,
    statusChangedAt: new Date('2026-04-25T11:00:00.000Z'),
  }

  assert.equal(shouldWatchdogFlag(recentCapture, now, 'capture'), false)
  assert.equal(shouldWatchdogFlag(stuckCapture, now, 'capture'), true)
  assert.equal(shouldWatchdogFlag(stuckReview, now, 'review'), true)
  assert.equal(shouldWatchdogFlag(stuckReview, now, 'capture'), false)
})
