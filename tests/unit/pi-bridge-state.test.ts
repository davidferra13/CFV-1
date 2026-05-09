import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { lookupPrice, lookupPricesBatch } from '../../lib/pricing/pi-bridge.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Pi bridge geography requests', () => {
  it('passes state to single lookup requests', async () => {
    let requestedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrl = String(url)
      return {
        ok: true,
        json: async () => ({ ingredient: { id: 'butter' }, prices: [], count: 0, query_ms: 1 }),
      } as Response
    }) as typeof fetch

    await lookupPrice('butter', 'MA')

    assert.match(requestedUrl, /\/price\?/)
    assert.match(requestedUrl, /name=butter/)
    assert.match(requestedUrl, /state=MA/)
  })

  it('passes state to batch lookup bodies', async () => {
    let parsedBody: unknown = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      parsedBody = JSON.parse(String(init?.body))
      return {
        ok: true,
        json: async () => ({ results: {}, query_ms: 1, count: 0 }),
      } as Response
    }) as typeof fetch

    await lookupPricesBatch(['butter', 'salmon'], 'MA')

    assert.deepEqual(parsedBody, { names: ['butter', 'salmon'], state: 'MA' })
  })
})
