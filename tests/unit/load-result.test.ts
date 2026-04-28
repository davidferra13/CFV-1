import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getUnavailableLabels, hasUnavailableResult, loadResult } from '@/lib/reality/load-result'

describe('loadResult', () => {
  it('returns ok data from a successful loader', async () => {
    const result = await loadResult('orders', async () => ['a'], { fallback: [] as string[] })

    assert.equal(result.status, 'ok')
    assert.deepEqual(result.data, ['a'])
    assert.equal(result.error, null)
  })

  it('keeps empty data distinct from unavailable data', async () => {
    const result = await loadResult('orders', async () => [] as string[], {
      fallback: [] as string[],
      emptyWhen: (rows) => rows.length === 0,
      emptyReason: 'No orders have been created yet.',
    })

    assert.equal(result.status, 'empty')
    assert.deepEqual(result.data, [])
    assert.equal(result.reason, 'No orders have been created yet.')
  })

  it('returns the fallback with an unavailable status when loading fails', async () => {
    const messages: string[] = []
    const result = await loadResult(
      'orders',
      async () => {
        throw new Error('database unavailable')
      },
      {
        fallback: [] as string[],
        errorMessage: 'Orders could not be loaded.',
        log: (message) => messages.push(message),
      }
    )

    assert.equal(result.status, 'unavailable')
    assert.deepEqual(result.data, [])
    assert.equal(result.error, 'Orders could not be loaded.')
    assert.deepEqual(messages, ['[loadResult] orders failed'])
  })
})

describe('loadResult collection helpers', () => {
  it('detects unavailable entries without treating empty entries as failures', () => {
    const results = {
      ok: { status: 'ok', data: [1], error: null },
      empty: { status: 'empty', data: [], error: null, reason: 'No data yet.' },
      unavailable: { status: 'unavailable', data: [], error: 'Could not load.' },
    } as const

    assert.equal(hasUnavailableResult(Object.values(results)), true)
    assert.deepEqual(getUnavailableLabels(results), ['unavailable'])
  })
})
