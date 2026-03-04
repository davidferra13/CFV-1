import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  enqueueOrderCheckout,
  getQueuedOrderCheckouts,
  replayOrderCheckoutQueue,
} from '@/lib/devices/offline-order-queue'

type MemoryStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>()
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

const originalLocalStorage = (globalThis as any).localStorage
const originalFetch = globalThis.fetch

describe('offline-order-queue', () => {
  beforeEach(() => {
    ;(globalThis as any).localStorage = createMemoryStorage()
  })

  afterEach(() => {
    if (originalLocalStorage) {
      ;(globalThis as any).localStorage = originalLocalStorage
    } else {
      delete (globalThis as any).localStorage
    }
    globalThis.fetch = originalFetch
  })

  it('deduplicates queue entries by token + client checkout id', () => {
    enqueueOrderCheckout('token_a', {
      payment_method: 'cash',
      client_checkout_id: 'checkout_123',
    })
    enqueueOrderCheckout('token_a', {
      payment_method: 'cash',
      client_checkout_id: 'checkout_123',
    })
    enqueueOrderCheckout('token_a', {
      payment_method: 'cash',
      client_checkout_id: 'checkout_124',
    })

    const queue = getQueuedOrderCheckouts()
    assert.equal(queue.length, 2)
    assert.equal(queue[0]?.payload.client_checkout_id, 'checkout_123')
    assert.equal(queue[1]?.payload.client_checkout_id, 'checkout_124')
  })

  it('replays successful checkouts and removes them from queue', async () => {
    enqueueOrderCheckout('token_a', {
      payment_method: 'card',
      client_checkout_id: 'checkout_replay_success',
    })

    globalThis.fetch = async () => new Response('{}', { status: 200 })

    const sent = await replayOrderCheckoutQueue()
    assert.equal(sent, 1)
    assert.equal(getQueuedOrderCheckouts().length, 0)
  })

  it('increments attempts when replay fails', async () => {
    enqueueOrderCheckout('token_a', {
      payment_method: 'card',
      client_checkout_id: 'checkout_replay_fail',
    })

    globalThis.fetch = async () => new Response('error', { status: 500 })

    const sent = await replayOrderCheckoutQueue()
    assert.equal(sent, 0)
    assert.equal(getQueuedOrderCheckouts().length, 1)
    assert.equal(getQueuedOrderCheckouts()[0]?.attempts, 1)
  })
})
