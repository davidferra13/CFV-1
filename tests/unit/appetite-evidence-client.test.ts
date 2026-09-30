import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { trackDiscoveryEvent } = vi.hoisted(() => ({
  trackDiscoveryEvent: vi.fn(),
}))

vi.mock('@/lib/discovery/track-discovery-click', () => ({
  trackDiscoveryEvent,
}))

import {
  currentSessionAppetiteTagIds,
  readAppetiteEvidence,
  recordAppetiteEvidence,
} from '@/lib/discovery/appetite-evidence-client'
import type { AppetiteEvidence } from '@/lib/discovery/appetite-engine'

const storage = new Map<string, string>()
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
}

function evidence(index: number): AppetiteEvidence {
  return {
    tagId: 'food-thai',
    action: 'spin_seen',
    occurredAt: new Date(index).toISOString(),
  }
}

describe('appetite evidence client', () => {
  beforeEach(() => {
    storage.clear()
    trackDiscoveryEvent.mockClear()
    vi.stubGlobal('window', {
      localStorage,
      location: { search: '?appetite=food-thai%2Cneed-vegan' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recovers safely from malformed browser storage', () => {
    storage.set('chefflow:appetite-evidence:v1', '{not-json')

    expect(readAppetiteEvidence()).toEqual([])
  })

  it('filters invalid evidence, caps history, and persists valid events', () => {
    recordAppetiteEvidence([
      ...Array.from({ length: 501 }, (_, index) => evidence(index)),
      { ...evidence(502), tagId: 'unknown-tag' },
    ])

    const saved = readAppetiteEvidence()
    expect(saved).toHaveLength(500)
    expect(saved[0].occurredAt).toBe(evidence(1).occurredAt)
    expect(saved.every((item) => item.tagId === 'food-thai')).toBe(true)
    expect(trackDiscoveryEvent).toHaveBeenCalledTimes(501)
    expect(trackDiscoveryEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'impression',
        itemType: 'culinary_signal',
        itemValue: 'food-thai',
        eventContext: expect.objectContaining({
          source: 'eat_appetite',
          appetite_action: 'spin_seen',
        }),
      })
    )
  })

  it('reads the current appetite query as the session context', () => {
    expect(currentSessionAppetiteTagIds()).toEqual(['food-thai', 'need-vegan'])
  })
})
