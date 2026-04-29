import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  clearRefreshTelemetry,
  getRefreshTelemetrySnapshot,
} from '@/lib/runtime/refresh-telemetry'
import { trackedRouterRefresh } from '@/lib/runtime/tracked-router-refresh'

const originalNodeEnv = process.env.NODE_ENV
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

function restoreWindow(): void {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow)
  } else {
    Reflect.deleteProperty(globalThis, 'window')
  }
}

beforeEach(() => {
  process.env.NODE_ENV = 'test'
  clearRefreshTelemetry()
  restoreWindow()
})

afterEach(() => {
  clearRefreshTelemetry()
  restoreWindow()

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }
})

describe('trackedRouterRefresh', () => {
  it('records refresh telemetry before refreshing the router', () => {
    const calls: string[] = []
    const router = {
      refresh: () => {
        calls.push('refresh')
      },
    }

    trackedRouterRefresh(router, {
      pathname: '/events/evt_1',
      source: 'event-detail',
      entity: 'event',
      event: 'status_changed',
      reason: 'draft->proposed',
    })

    const snapshot = getRefreshTelemetrySnapshot()

    assert.deepEqual(calls, ['refresh'])
    assert.equal(snapshot.totalRefreshes, 1)
    assert.equal(snapshot.events[0]?.pathname, '/events/evt_1')
    assert.equal(snapshot.events[0]?.source, 'event-detail')
    assert.equal(snapshot.events[0]?.entity, 'event')
    assert.equal(snapshot.events[0]?.event, 'status_changed')
    assert.equal(snapshot.events[0]?.reason, 'draft->proposed')
  })

  it('uses the browser pathname when no pathname is supplied', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          pathname: '/dashboard',
        },
      },
    })

    trackedRouterRefresh(
      {
        refresh: () => {},
      },
      {
        source: 'retry-button',
      },
    )

    const snapshot = getRefreshTelemetrySnapshot()

    assert.equal(snapshot.events[0]?.pathname, '/dashboard')
    assert.equal(snapshot.events[0]?.source, 'retry-button')
  })
})
