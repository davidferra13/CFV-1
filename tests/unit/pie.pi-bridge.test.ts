import test from 'node:test'
import assert from 'node:assert/strict'
import * as piBridge from '../../lib/pricing/pi-bridge.js'

const originalFetch = globalThis.fetch
const originalDateNow = Date.now
const originalSetTimeout = globalThis.setTimeout
const originalClearTimeout = globalThis.clearTimeout

let now = 1_000_000

function setNow(value: number): void {
  now = value
  Date.now = () => now
}

function mockFetch(
  handler: (url: string | URL | Request, init?: RequestInit) => Promise<Response> | Response
): void {
  globalThis.fetch = handler as typeof fetch
}

function okJson(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

function failedResponse(): Response {
  return {
    ok: false,
    json: async () => ({}),
  } as Response
}

function restoreGlobals(): void {
  globalThis.fetch = originalFetch
  Date.now = originalDateNow
  globalThis.setTimeout = originalSetTimeout
  globalThis.clearTimeout = originalClearTimeout
}

async function resetCircuit(): Promise<void> {
  restoreGlobals()
  const state = piBridge.getCircuitState()
  setNow(Math.max(now, state.lastFailure + 5 * 60 * 1000))
  mockFetch(async () => okJson({ ingredient: { id: 'reset' }, prices: [], count: 0, query_ms: 0 }))
  await piBridge.lookupPrice('__reset__')
  assert.equal(piBridge.getCircuitState().state, 'closed')
  assert.equal(piBridge.getCircuitState().failures, 0)
  restoreGlobals()
}

async function runIsolated(assertions: () => Promise<void>): Promise<void> {
  await resetCircuit()
  try {
    await assertions()
  } finally {
    await resetCircuit()
  }
}

async function tripCircuit(): Promise<void> {
  await piBridge.lookupPrice('butter')
  await piBridge.lookupPrice('butter')
  await piBridge.lookupPrice('butter')
}

test('PIE Pi bridge lookup and circuit-breaker behavior', async (t) => {
  await t.test(
    'starts closed and tracks failures until the threshold opens the circuit',
    async () => {
      await runIsolated(async () => {
        setNow(10_000)

        const initialState = piBridge.getCircuitState()
        assert.equal(initialState.state, 'closed')
        assert.equal(initialState.failures, 0)
        assert.equal(initialState.lastFailure, 0)

        mockFetch(async () => failedResponse())

        await piBridge.lookupPrice('butter')
        assert.equal(piBridge.getCircuitState().state, 'closed')
        assert.equal(piBridge.getCircuitState().failures, 1)
        assert.equal(piBridge.getCircuitState().lastFailure, 10_000)

        setNow(11_000)
        await piBridge.lookupPrice('butter')
        assert.equal(piBridge.getCircuitState().state, 'closed')
        assert.equal(piBridge.getCircuitState().failures, 2)
        assert.equal(piBridge.getCircuitState().lastFailure, 11_000)

        setNow(12_000)
        await piBridge.lookupPrice('butter')
        assert.equal(piBridge.getCircuitState().state, 'open')
        assert.equal(piBridge.getCircuitState().failures, 3)
        assert.equal(piBridge.getCircuitState().lastFailure, 12_000)
      })
    }
  )

  await t.test(
    'blocks requests while open, then allows a half-open probe after cooldown',
    async () => {
      await runIsolated(async () => {
        setNow(20_000)
        let fetchCalls = 0

        mockFetch(async () => {
          fetchCalls += 1
          return failedResponse()
        })

        await tripCircuit()
        assert.equal(piBridge.getCircuitState().state, 'open')
        assert.equal(fetchCalls, 3)

        setNow(20_000 + 60_000)
        const blocked = await piBridge.lookupPrice('salmon')
        assert.equal(blocked, null)
        assert.equal(fetchCalls, 3)
        assert.equal(piBridge.getCircuitState().state, 'open')

        setNow(20_000 + 5 * 60_000)
        mockFetch(async () => {
          fetchCalls += 1
          return okJson({ ingredient: { id: 'salmon' }, prices: [], count: 0, query_ms: 2 })
        })

        const probe = await piBridge.lookupPrice('salmon')
        assert.equal(fetchCalls, 4)
        assert.deepEqual(probe, { ingredient: { id: 'salmon' }, prices: [], count: 0, query_ms: 2 })
        assert.equal(piBridge.getCircuitState().state, 'closed')
        assert.equal(piBridge.getCircuitState().failures, 0)
        assert.equal(piBridge.getCircuitState().lastSuccess, 20_000 + 5 * 60_000)
      })
    }
  )

  await t.test('reopens when the half-open probe fails', async () => {
    await runIsolated(async () => {
      setNow(30_000)

      mockFetch(async () => failedResponse())
      await tripCircuit()
      assert.equal(piBridge.getCircuitState().state, 'open')

      setNow(30_000 + 5 * 60_000)
      mockFetch(async () => failedResponse())

      const result = await piBridge.lookupPrice('cream')
      assert.equal(result, null)
      assert.equal(piBridge.getCircuitState().state, 'open')
      assert.equal(piBridge.getCircuitState().failures, 4)
      assert.equal(piBridge.getCircuitState().lastFailure, 30_000 + 5 * 60_000)
    })
  })

  await t.test('returns lookupPrice results and sends encoded name and state', async () => {
    await runIsolated(async () => {
      setNow(40_000)
      let requestedUrl = ''

      const responseBody = {
        ingredient: {
          id: 'ing_olive_oil',
          name: 'olive oil',
          category: 'oil',
          standard_unit: 'ml',
        },
        prices: [
          {
            price_cents: 1199,
            price_unit: 'bottle',
            price_per_standard_unit_cents: 8,
            standard_unit: 'ml',
            confidence: 'high',
            last_confirmed_at: '2026-05-15T00:00:00Z',
            price_type: 'retail',
            product_name: 'Extra virgin olive oil',
            in_stock: true,
            store: 'Market',
            state: 'MA',
            city: 'Boston',
          },
        ],
        count: 1,
        query_ms: 3,
      }

      mockFetch(async (url) => {
        requestedUrl = String(url)
        return okJson(responseBody)
      })

      const result = await piBridge.lookupPrice('olive oil', 'MA')

      assert.deepEqual(result, responseBody)
      assert.match(requestedUrl, /\/price\?/)
      assert.match(requestedUrl, /name=olive\+oil/)
      assert.match(requestedUrl, /state=MA/)
      assert.equal(piBridge.getCircuitState().state, 'closed')
      assert.equal(piBridge.getCircuitState().failures, 0)
    })
  })

  await t.test('returns null instead of throwing when fetch rejects', async () => {
    await runIsolated(async () => {
      setNow(50_000)

      mockFetch(async () => {
        throw new Error('Pi unreachable')
      })

      const result = await piBridge.lookupPrice('butter')

      assert.equal(result, null)
      assert.equal(piBridge.getCircuitState().state, 'closed')
      assert.equal(piBridge.getCircuitState().failures, 1)
      assert.equal(piBridge.getCircuitState().lastFailure, 50_000)
    })
  })

  await t.test('aborts slow requests, returns null, and records a failure', async () => {
    await runIsolated(async () => {
      setNow(60_000)
      let sawAbortedSignal = false

      globalThis.setTimeout = ((callback: TimerHandler) => {
        if (typeof callback === 'function') callback()
        return 1 as unknown as NodeJS.Timeout
      }) as typeof setTimeout
      globalThis.clearTimeout = (() => undefined) as typeof clearTimeout

      mockFetch(async (_url, init) => {
        sawAbortedSignal = init?.signal?.aborted ?? false
        throw new DOMException('The operation was aborted.', 'AbortError')
      })

      const result = await piBridge.lookupPrice('flour')

      assert.equal(result, null)
      assert.equal(sawAbortedSignal, true)
      assert.equal(piBridge.getCircuitState().failures, 1)
      assert.equal(piBridge.getCircuitState().lastFailure, 60_000)
    })
  })

  await t.test('skips lookup fetches immediately when the circuit is open', async () => {
    await runIsolated(async () => {
      setNow(70_000)
      let fetchCalls = 0

      mockFetch(async () => {
        fetchCalls += 1
        return failedResponse()
      })

      await tripCircuit()
      assert.equal(fetchCalls, 3)
      assert.equal(piBridge.getCircuitState().state, 'open')

      const result = await piBridge.lookupPrice('pepper')

      assert.equal(result, null)
      assert.equal(fetchCalls, 3)
    })
  })

  await t.test('posts small batches with state and returns aggregated results', async () => {
    await runIsolated(async () => {
      setNow(80_000)
      let requestedUrl = ''
      let parsedBody: unknown = null

      const responseBody = {
        results: {
          butter: {
            ingredient_id: 'ing_butter',
            canonical_name: 'butter',
            category: 'dairy',
            avg_cents: 499,
            median_cents: 499,
            min_cents: 399,
            max_cents: 599,
            observation_count: 12,
            freshest: '2026-05-15T00:00:00Z',
            unit: 'lb',
            normalized: true,
          },
          salmon: null,
        },
        query_ms: 4,
        count: 2,
      }

      mockFetch(async (url, init) => {
        requestedUrl = String(url)
        parsedBody = JSON.parse(String(init?.body))
        return okJson(responseBody)
      })

      const result = await piBridge.lookupPricesBatch(['butter', 'salmon'], 'MA')

      assert.equal(requestedUrl, 'http://10.0.0.177:7700/prices')
      assert.deepEqual(parsedBody, { names: ['butter', 'salmon'], state: 'MA' })
      assert.deepEqual(result, responseBody)
    })
  })

  await t.test('skips batch fetches immediately when the circuit is open', async () => {
    await runIsolated(async () => {
      setNow(90_000)
      let fetchCalls = 0

      mockFetch(async () => {
        fetchCalls += 1
        return failedResponse()
      })

      await tripCircuit()
      assert.equal(piBridge.getCircuitState().state, 'open')
      assert.equal(fetchCalls, 3)

      const result = await piBridge.lookupPricesBatch(['butter', 'salmon'])

      assert.equal(result, null)
      assert.equal(fetchCalls, 3)
    })
  })

  await t.test('merges successful chunks and records failures for failed chunks', async () => {
    await runIsolated(async () => {
      setNow(100_000)
      const names = Array.from({ length: 150 }, (_, index) => `ingredient-${index}`)
      const postedBatches: string[][] = []

      mockFetch(async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { names: string[] }
        postedBatches.push(body.names)

        if (postedBatches.length === 2) {
          return failedResponse()
        }

        return okJson({
          results: {
            [body.names[0]]: {
              ingredient_id: body.names[0],
              canonical_name: body.names[0],
              category: null,
              avg_cents: 100,
              median_cents: 100,
              min_cents: 90,
              max_cents: 110,
              observation_count: 1,
              freshest: null,
              unit: 'each',
              normalized: true,
            },
          },
          query_ms: 5,
          count: 1,
        })
      })

      const result = await piBridge.lookupPricesBatch(names)

      assert.equal(postedBatches.length, 2)
      assert.equal(postedBatches[0]?.length, 100)
      assert.equal(postedBatches[1]?.length, 50)
      assert.deepEqual(result, {
        results: {
          'ingredient-0': {
            ingredient_id: 'ingredient-0',
            canonical_name: 'ingredient-0',
            category: null,
            avg_cents: 100,
            median_cents: 100,
            min_cents: 90,
            max_cents: 110,
            observation_count: 1,
            freshest: null,
            unit: 'each',
            normalized: true,
          },
        },
        query_ms: 5,
        count: 1,
      })
      assert.equal(piBridge.getCircuitState().state, 'closed')
      assert.equal(piBridge.getCircuitState().failures, 1)
      assert.equal(piBridge.getCircuitState().lastFailure, 100_000)
    })
  })
})
