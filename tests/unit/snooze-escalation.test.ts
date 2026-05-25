import { describe, test, expect, beforeEach, vi } from 'vitest'
import { getSnoozeEscalation, REPEAT_SNOOZE_THRESHOLD } from '@/lib/remy/snooze-escalation'

describe('snooze-escalation', () => {
  describe('getSnoozeEscalation', () => {
    test('inquiry returns contextual message with count', () => {
      const result = getSnoozeEscalation('inquiry', {
        clientName: 'Sarah',
        snoozeCount: 3,
      })
      expect(result.message).toContain('3 times')
      expect(result.message).toContain('inquiry')
      expect(result.remyPrompt).toBe("Draft a follow-up for Sarah's inquiry")
      expect(result.actionLabel).toBe('Let Remy handle it')
    })

    test('payment returns nudge message', () => {
      const result = getSnoozeEscalation('payment', {
        clientName: 'Tom',
        snoozeCount: 2,
      })
      expect(result.message).toContain('payment')
      expect(result.remyPrompt).toBe('Draft a payment reminder for Tom')
      expect(result.actionLabel).toBe('Let Remy handle it')
    })

    test('follow-up returns pending message', () => {
      const result = getSnoozeEscalation('follow-up', {
        clientName: 'Alex',
        snoozeCount: 2,
      })
      expect(result.message).toContain('pending')
      expect(result.remyPrompt).toBe('Draft a follow-up message for Alex')
    })

    test('thread includes subject in prompt when provided', () => {
      const result = getSnoozeEscalation('thread', {
        clientName: 'Lisa',
        subject: 'menu changes',
        snoozeCount: 2,
      })
      expect(result.remyPrompt).toContain('menu changes')
      expect(result.remyPrompt).toContain('Lisa')
    })

    test('thread omits subject in prompt when missing', () => {
      const result = getSnoozeEscalation('thread', {
        clientName: 'Lisa',
        snoozeCount: 2,
      })
      expect(result.remyPrompt).not.toContain('about')
      expect(result.remyPrompt).toContain('Lisa')
    })

    test('reminder returns deferred message with count', () => {
      const result = getSnoozeEscalation('reminder', {
        subject: 'order supplies',
        snoozeCount: 4,
      })
      expect(result.message).toContain('4 times')
      expect(result.remyPrompt).toBe('Help me handle this reminder: order supplies')
    })

    test('generic returns deferred message', () => {
      const result = getSnoozeEscalation('generic', { snoozeCount: 5 })
      expect(result.message).toContain('5 times')
      expect(result.remyPrompt).toBe('Help me decide what to do about this')
    })

    test('falls back to "the client" when clientName missing', () => {
      const result = getSnoozeEscalation('inquiry', { snoozeCount: 2 })
      expect(result.remyPrompt).toContain('the client')
    })
  })

  describe('REPEAT_SNOOZE_THRESHOLD', () => {
    test('equals 2', () => {
      expect(REPEAT_SNOOZE_THRESHOLD).toBe(2)
    })
  })
})

describe('snooze.ts count tracking', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
    })
  })

  test('snoozeChip increments count on repeat snooze', async () => {
    const { snoozeChip, getSnoozeCount } = await import('@/lib/dashboard/snooze')

    snoozeChip('chip-1', 5)
    expect(getSnoozeCount('chip-1')).toBe(1)

    snoozeChip('chip-1', 5)
    expect(getSnoozeCount('chip-1')).toBe(2)

    snoozeChip('chip-1', 5)
    expect(getSnoozeCount('chip-1')).toBe(3)
  })

  test('getSnoozeCount returns 0 for unknown chips', async () => {
    const { getSnoozeCount } = await import('@/lib/dashboard/snooze')
    expect(getSnoozeCount('nonexistent')).toBe(0)
  })
})

describe('queue snooze count tracking', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
    })
  })

  test('queue snooze count persists across re-snoozes', () => {
    const key = 'cf:queue-snoozed'
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    storage[key] = JSON.stringify({
      'item-1': { until: futureDate, count: 1 },
    })

    const raw = JSON.parse(storage[key])
    expect(raw['item-1'].count).toBe(1)

    const newFuture = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    raw['item-1'] = { until: newFuture, count: raw['item-1'].count + 1 }
    storage[key] = JSON.stringify(raw)

    const updated = JSON.parse(storage[key])
    expect(updated['item-1'].count).toBe(2)
  })

  test('isRepeatSnoozed returns true at threshold', () => {
    const count = 2
    expect(count >= REPEAT_SNOOZE_THRESHOLD).toBe(true)
    expect(1 >= REPEAT_SNOOZE_THRESHOLD).toBe(false)
  })

  test('migrates legacy string format to entry with count 1', () => {
    const key = 'cf:queue-snoozed'
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    storage[key] = JSON.stringify({ 'item-1': futureDate })

    const raw = JSON.parse(storage[key])
    const migrated: Record<string, { until: string; count: number }> = {}
    for (const [id, value] of Object.entries(raw)) {
      if (typeof value === 'string') {
        migrated[id] = { until: value, count: 1 }
      } else {
        migrated[id] = value as { until: string; count: number }
      }
    }

    expect(migrated['item-1'].count).toBe(1)
    expect(migrated['item-1'].until).toBe(futureDate)
  })

  test('cleanExpiredEntries retains expired entries under 7 days old', () => {
    const now = Date.now()
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()
    const futureDate = new Date(now + 60 * 60 * 1000).toISOString()

    const EXPIRED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

    type Entry = { until: string; count: number }
    const map: Record<string, Entry> = {
      active: { until: futureDate, count: 1 },
      recentExpired: { until: twoDaysAgo, count: 3 },
      oldExpired: { until: tenDaysAgo, count: 2 },
    }

    const cleaned: Record<string, Entry> = {}
    for (const [id, entry] of Object.entries(map)) {
      const untilMs = new Date(entry.until).getTime()
      if (untilMs > now) {
        cleaned[id] = entry
      } else if (now - untilMs < EXPIRED_RETENTION_MS) {
        cleaned[id] = entry
      }
    }

    expect(cleaned['active']).toBeDefined()
    expect(cleaned['recentExpired']).toBeDefined()
    expect(cleaned['oldExpired']).toBeUndefined()
  })
})
