import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  clearRefreshTelemetry,
  getRefreshTelemetrySnapshot,
  recordRefreshTelemetry,
  subscribeRefreshTelemetry,
} from '@/lib/runtime/refresh-telemetry'

const originalNow = Date.now
const originalNodeEnv = process.env.NODE_ENV

let now = 1_000_000

function setNow(value: number): void {
  now = value
}

beforeEach(() => {
  process.env.NODE_ENV = 'test'
  Date.now = () => now
  setNow(1_000_000)
  clearRefreshTelemetry()
})

afterEach(() => {
  clearRefreshTelemetry()
  Date.now = originalNow

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }
})

describe('refresh telemetry', () => {
  it('records refresh and skip events with occurrence timestamps', () => {
    recordRefreshTelemetry({
      kind: 'refresh',
      pathname: '/events/evt_1',
      source: 'event-detail',
      entity: 'event',
      event: 'evt_1',
    })

    setNow(1_005_000)

    recordRefreshTelemetry({
      kind: 'skip',
      pathname: '/events/evt_1',
      source: 'event-detail',
      reason: 'already-current',
    })

    const snapshot = getRefreshTelemetrySnapshot()

    assert.equal(snapshot.totalRefreshes, 1)
    assert.equal(snapshot.totalSkips, 1)
    assert.equal(snapshot.recentRefreshes, 1)
    assert.equal(snapshot.recentSkips, 1)
    assert.deepEqual(snapshot.events, [
      {
        kind: 'refresh',
        pathname: '/events/evt_1',
        source: 'event-detail',
        entity: 'event',
        event: 'evt_1',
        occurredAt: 1_000_000,
      },
      {
        kind: 'skip',
        pathname: '/events/evt_1',
        source: 'event-detail',
        reason: 'already-current',
        occurredAt: 1_005_000,
      },
    ])
  })

  it('caps stored events at 50', () => {
    for (let index = 0; index < 55; index += 1) {
      setNow(1_000_000 + index)
      recordRefreshTelemetry({
        kind: 'refresh',
        pathname: `/events/${index}`,
        source: 'test',
      })
    }

    const snapshot = getRefreshTelemetrySnapshot()

    assert.equal(snapshot.events.length, 50)
    assert.equal(snapshot.totalRefreshes, 50)
    assert.equal(snapshot.events[0]?.pathname, '/events/5')
    assert.equal(snapshot.events[49]?.pathname, '/events/54')
  })

  it('counts recent events within the last 60 seconds', () => {
    setNow(1_000_000)
    recordRefreshTelemetry({
      kind: 'refresh',
      pathname: '/old-refresh',
      source: 'test',
    })

    setNow(1_010_000)
    recordRefreshTelemetry({
      kind: 'skip',
      pathname: '/old-skip',
      source: 'test',
    })

    setNow(1_061_000)
    recordRefreshTelemetry({
      kind: 'refresh',
      pathname: '/recent-refresh',
      source: 'test',
    })

    const snapshot = getRefreshTelemetrySnapshot()

    assert.equal(snapshot.totalRefreshes, 2)
    assert.equal(snapshot.totalSkips, 1)
    assert.equal(snapshot.recentRefreshes, 1)
    assert.equal(snapshot.recentSkips, 1)
  })

  it('notifies subscribers on record and clear until unsubscribed', () => {
    let calls = 0
    const unsubscribe = subscribeRefreshTelemetry(() => {
      calls += 1
    })

    recordRefreshTelemetry({
      kind: 'refresh',
      pathname: '/events/evt_1',
      source: 'test',
    })
    clearRefreshTelemetry()
    unsubscribe()
    recordRefreshTelemetry({
      kind: 'skip',
      pathname: '/events/evt_1',
      source: 'test',
    })

    assert.equal(calls, 2)
  })

  it('returns snapshot event copies', () => {
    recordRefreshTelemetry({
      kind: 'refresh',
      pathname: '/events/evt_1',
      source: 'test',
    })

    const snapshot = getRefreshTelemetrySnapshot()
    snapshot.events.length = 0

    assert.equal(getRefreshTelemetrySnapshot().events.length, 1)
  })

  it('does not store or notify telemetry in production', () => {
    process.env.NODE_ENV = 'production'
    let calls = 0
    const unsubscribe = subscribeRefreshTelemetry(() => {
      calls += 1
    })

    recordRefreshTelemetry({
      kind: 'refresh',
      pathname: '/events/evt_1',
      source: 'test',
    })

    unsubscribe()

    const snapshot = getRefreshTelemetrySnapshot()
    assert.equal(snapshot.events.length, 0)
    assert.equal(snapshot.totalRefreshes, 0)
    assert.equal(calls, 0)
  })
})
