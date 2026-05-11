'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TabDefinition<K extends string = string> = {
  key: K
  label: string
  badge?: number | string | null
  icon?: React.ComponentType<{ className?: string }>
  /** Hide this tab entirely (useful for conditional tabs) */
  hidden?: boolean
}

export type UseTabNavOptions<K extends string> = {
  /** Tab definitions or simple string keys */
  tabs: readonly K[] | readonly TabDefinition<K>[]
  /** Default active tab (first tab if omitted) */
  defaultTab?: K
  /** URL search-param key to sync (e.g. 'tab'). Omit for local state only. */
  paramKey?: string
}

export type UseTabNavReturn<K extends string> = {
  /** Currently active tab key */
  activeTab: K
  /** Set the active tab */
  setTab: (key: K) => void
  /** Normalized tab definitions */
  tabs: TabDefinition<K>[]
  /** Check if a given tab is active */
  isActive: (key: K) => boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeTabs<K extends string>(
  input: readonly K[] | readonly TabDefinition<K>[]
): TabDefinition<K>[] {
  if (input.length === 0) return []
  if (typeof input[0] === 'string') {
    return (input as readonly K[]).map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
    }))
  }
  return [...(input as readonly TabDefinition<K>[])]
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Headless tab navigation hook.
 *
 * Supports two modes:
 * 1. URL-synced: pass `paramKey` to read/write a URL search param (bookmarkable).
 * 2. Local state: omit `paramKey` for a simple useState-based tab.
 *
 * @example
 * ```ts
 * const { activeTab, setTab, tabs } = useTabNav({
 *   tabs: ['overview', 'money', 'prep'] as const,
 *   defaultTab: 'overview',
 *   paramKey: 'tab',
 * })
 * ```
 */
export function useTabNav<K extends string>(options: UseTabNavOptions<K>): UseTabNavReturn<K> {
  const { defaultTab, paramKey } = options

  const normalizedTabs = useMemo(
    () => normalizeTabs(options.tabs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(options.tabs)]
  )

  const visibleTabs = useMemo(() => normalizedTabs.filter((t) => !t.hidden), [normalizedTabs])

  const fallback = defaultTab ?? visibleTabs[0]?.key ?? ('' as K)

  // URL-synced mode
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Local state mode
  const [localTab, setLocalTab] = useState<K>(fallback)

  const urlTab = paramKey ? (searchParams?.get(paramKey) as K | null) : null
  const validKeys = new Set(visibleTabs.map((t) => t.key))

  const activeTab: K =
    paramKey && urlTab && validKeys.has(urlTab)
      ? urlTab
      : !paramKey && validKeys.has(localTab)
        ? localTab
        : fallback

  const setTab = useCallback(
    (key: K) => {
      if (paramKey) {
        const params = new URLSearchParams(searchParams?.toString() ?? '')
        if (key === fallback) {
          params.delete(paramKey)
        } else {
          params.set(paramKey, key)
        }
        const qs = params.toString()
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
      } else {
        setLocalTab(key)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramKey, fallback, pathname, searchParams?.toString()]
  )

  const isActive = useCallback((key: K) => key === activeTab, [activeTab])

  return {
    activeTab,
    setTab,
    tabs: visibleTabs,
    isActive,
  }
}
