import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  isSnoozed,
  snoozeChip,
  clearSnooze,
  getSnoozedIds,
  SNOOZE_TTL_MS,
} from '@/lib/dashboard/snooze'

describe('snooze', () => {
  const mockStorage = new Map<string, string>()

  beforeEach(() => {
    mockStorage.clear()
    ;(globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, val: string) => {
        mockStorage.set(key, val)
      },
      removeItem: (key: string) => {
        mockStorage.delete(key)
      },
    }
  })

  it('snoozeChip stores chip id with timestamp', () => {
    snoozeChip('msg-1', 85)
    assert.equal(isSnoozed('msg-1', 85), true)
  })

  it('isSnoozed returns false for unknown chip', () => {
    assert.equal(isSnoozed('unknown', 50), false)
  })

  it('isSnoozed returns false after TTL expires', () => {
    snoozeChip('msg-2', 70)
    const data = JSON.parse(mockStorage.get('cf:dash-snooze') ?? '{}')
    data['msg-2'].snoozedAt = Date.now() - SNOOZE_TTL_MS - 1000
    mockStorage.set('cf:dash-snooze', JSON.stringify(data))
    assert.equal(isSnoozed('msg-2', 70), false)
  })

  it('isSnoozed returns false when urgency increases by 10+', () => {
    snoozeChip('msg-3', 60)
    assert.equal(isSnoozed('msg-3', 60), true)
    assert.equal(isSnoozed('msg-3', 70), false)
  })

  it('clearSnooze removes a specific chip', () => {
    snoozeChip('msg-4', 50)
    assert.equal(isSnoozed('msg-4', 50), true)
    clearSnooze('msg-4')
    assert.equal(isSnoozed('msg-4', 50), false)
  })

  it('getSnoozedIds returns all snoozed chip ids', () => {
    snoozeChip('a', 80)
    snoozeChip('b', 70)
    const ids = getSnoozedIds()
    assert.ok(ids.includes('a'))
    assert.ok(ids.includes('b'))
  })
})
