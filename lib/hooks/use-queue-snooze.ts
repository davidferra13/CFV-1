'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'cf:queue-snoozed'
const EXPIRED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

type SnoozedEntry = { until: string; count: number }
type SnoozedMap = Record<string, SnoozedEntry>

function readSnoozed(): SnoozedMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const result: SnoozedMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        result[id] = { until: value, count: 1 }
      } else {
        result[id] = value as SnoozedEntry
      }
    }
    return result
  } catch {
    return {}
  }
}

function writeSnoozed(map: SnoozedMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function cleanExpiredEntries(map: SnoozedMap): SnoozedMap {
  const now = Date.now()
  const cleaned: SnoozedMap = {}
  for (const [id, entry] of Object.entries(map)) {
    const untilMs = new Date(entry.until).getTime()
    if (untilMs > now) {
      cleaned[id] = entry
    } else if (now - untilMs < EXPIRED_RETENTION_MS) {
      cleaned[id] = entry
    }
  }
  return cleaned
}

export type SnoozeDuration = '1h' | '4h' | 'tomorrow' | 'next-week'

function computeSnoozeUntil(duration: SnoozeDuration): string {
  const now = new Date()
  switch (duration) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    case '4h':
      return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
    case 'tomorrow': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(8, 0, 0, 0)
      return tomorrow.toISOString()
    }
    case 'next-week': {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      nextWeek.setHours(8, 0, 0, 0)
      return nextWeek.toISOString()
    }
  }
}

export const SNOOZE_OPTIONS: { value: SnoozeDuration; label: string }[] = [
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hours' },
  { value: 'tomorrow', label: 'Tomorrow morning' },
  { value: 'next-week', label: 'Next week' },
]

/**
 * Hook for snoozing queue items.
 * Stores snooze state in localStorage - no migration needed.
 */
export function useQueueSnooze() {
  const [snoozedMap, setSnoozedMap] = useState<SnoozedMap>({})

  // Load + clean on mount
  useEffect(() => {
    const cleaned = cleanExpiredEntries(readSnoozed())
    writeSnoozed(cleaned)
    setSnoozedMap(cleaned)
  }, [])

  const snoozeItem = useCallback((itemId: string, duration: SnoozeDuration) => {
    const until = computeSnoozeUntil(duration)
    setSnoozedMap((prev) => {
      const prevCount = prev[itemId]?.count ?? 0
      const next = { ...prev, [itemId]: { until, count: prevCount + 1 } }
      writeSnoozed(next)
      return next
    })
    return until
  }, [])

  const snoozeItemCustom = useCallback((itemId: string, until: string) => {
    setSnoozedMap((prev) => {
      const prevCount = prev[itemId]?.count ?? 0
      const next = { ...prev, [itemId]: { until, count: prevCount + 1 } }
      writeSnoozed(next)
      return next
    })
  }, [])

  const unsnoozeItem = useCallback((itemId: string) => {
    setSnoozedMap((prev) => {
      const next = { ...prev }
      delete next[itemId]
      writeSnoozed(next)
      return next
    })
  }, [])

  const isSnoozed = useCallback(
    (itemId: string): boolean => {
      const entry = snoozedMap[itemId]
      if (!entry) return false
      return new Date(entry.until).getTime() > Date.now()
    },
    [snoozedMap]
  )

  const snoozedCount = Object.values(snoozedMap).filter(
    (entry) => new Date(entry.until).getTime() > Date.now()
  ).length

  const snoozedUntil = useCallback(
    (itemId: string): string | null => snoozedMap[itemId]?.until ?? null,
    [snoozedMap]
  )

  const getSnoozeCount = useCallback(
    (itemId: string): number => snoozedMap[itemId]?.count ?? 0,
    [snoozedMap]
  )

  const isRepeatSnoozed = useCallback(
    (itemId: string): boolean => (snoozedMap[itemId]?.count ?? 0) >= 2,
    [snoozedMap]
  )

  return {
    snoozeItem,
    snoozeItemCustom,
    unsnoozeItem,
    isSnoozed,
    snoozedCount,
    snoozedUntil,
    getSnoozeCount,
    isRepeatSnoozed,
  }
}
