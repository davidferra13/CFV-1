'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'cf:dashboard-collapsed'

/**
 * Manages collapsed/expanded state for dashboard widgets via localStorage.
 * Hydration-safe: reads localStorage only after mount via useEffect.
 */
export function useCollapsedWidgets(storageKey: string = STORAGE_KEY) {
  const [collapsedIds, setCollapsedIds] = useState<string[]>([])

  // Hydration-safe localStorage read
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setCollapsedIds(parsed.filter((id): id is string => typeof id === 'string'))
        }
      }
    } catch {
      // Ignore parse errors — start with all expanded
    }
  }, [storageKey])

  const persist = useCallback(
    (ids: string[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids))
      } catch {
        // localStorage full or unavailable — ignore
      }
    },
    [storageKey]
  )

  const collapsedSet = useMemo(() => new Set(collapsedIds), [collapsedIds])

  const toggleCollapsed = useCallback(
    (widgetId: string) => {
      setCollapsedIds((prev) => {
        const next = prev.includes(widgetId)
          ? prev.filter((id) => id !== widgetId)
          : [...prev, widgetId]
        persist(next)
        return next
      })
    },
    [persist]
  )

  const collapseAll = useCallback(
    (allIds: string[]) => {
      setCollapsedIds(allIds)
      persist(allIds)
    },
    [persist]
  )

  const expandAll = useCallback(() => {
    setCollapsedIds([])
    persist([])
  }, [persist])

  return { collapsedSet, toggleCollapsed, collapseAll, expandAll }
}
