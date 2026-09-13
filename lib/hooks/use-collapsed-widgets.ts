'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'cf:dashboard-collapsed'

/**
 * Manages collapsed/expanded state for dashboard widgets via localStorage.
 * Hydration-safe: reads localStorage only after mount via useEffect.
 */
export function useCollapsedWidgets(
  storageKey: string = STORAGE_KEY,
  /**
   * What starts collapsed before the reader has chosen anything. Used on the
   * very first visit only: the moment they open or close one thing, their own
   * set is stored and takes over. Defaults to nothing collapsed, which is the
   * old behaviour for every other caller.
   */
  defaultCollapsedIds: string[] = []
) {
  // Initialised from the defaults rather than empty, so the server render and
  // the first client render agree and nothing flashes open then shut.
  const [collapsedIds, setCollapsedIds] = useState<string[]>(defaultCollapsedIds)

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
      // Ignore parse errors - keep the defaults
    }
  }, [storageKey])

  const persist = useCallback(
    (ids: string[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids))
      } catch {
        // localStorage full or unavailable - ignore
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
