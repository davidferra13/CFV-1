'use client'

import { useCallback, useMemo } from 'react'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

// ============================================
// TYPES
// ============================================

export type FilterDimensionType = 'multi-select' | 'single-select' | 'text' | 'date-range'

export type FilterOption = {
  value: string
  label: string
  count?: number
}

export type FilterDimension = {
  key: string
  label: string
  type: FilterDimensionType
  options?: FilterOption[]
  /** Placeholder text for text inputs */
  placeholder?: string
}

export type FilterPreset = {
  label: string
  filters: Record<string, unknown>
}

export type FilterableListConfig = {
  /** Unique key for URL/localStorage persistence */
  scopeKey: string
  /** Filter dimensions available to the user */
  dimensions: FilterDimension[]
  /** Default filter values applied on first load */
  defaultFilters?: Record<string, unknown>
  /** Named presets (e.g. "Active Quotes" = status in [draft, sent]) */
  presets?: FilterPreset[]
}

export type FilterableListResult = {
  /** Current filter state */
  filters: Record<string, unknown>
  /** Set a single filter dimension */
  setFilter: (key: string, value: unknown) => void
  /** Set multiple filters at once */
  setFilters: (patch: Record<string, unknown>) => void
  /** Clear all filters back to defaults */
  clearFilters: () => void
  /** Apply a named preset */
  applyPreset: (preset: FilterPreset) => void
  /** Number of active (non-default) filters */
  activeCount: number
  /** Check if a specific multi-select value is selected */
  isSelected: (key: string, value: string) => boolean
  /** Toggle a value in a multi-select filter */
  toggleValue: (key: string, value: string) => void
  /** The resolved config for rendering */
  config: FilterableListConfig
}

// ============================================
// HOOK
// ============================================

export function useFilterableList(config: FilterableListConfig): FilterableListResult {
  const { scopeKey, dimensions, defaultFilters = {}, presets } = config

  // Build defaults from dimensions + explicit defaults
  const resolvedDefaults = useMemo(() => {
    const d: Record<string, unknown> = {}
    for (const dim of dimensions) {
      if (dim.type === 'multi-select') {
        d[dim.key] = []
      } else if (dim.type === 'single-select') {
        d[dim.key] = ''
      } else if (dim.type === 'text') {
        d[dim.key] = ''
      } else if (dim.type === 'date-range') {
        d[dim.key] = ''
      }
    }
    return { ...d, ...defaultFilters }
  }, [dimensions, defaultFilters])

  const { state, setState, reset } = usePersistentViewState(scopeKey, {
    strategy: 'url',
    defaults: resolvedDefaults,
  })

  const setFilter = useCallback(
    (key: string, value: unknown) => {
      setState({ [key]: value })
    },
    [setState]
  )

  const setFilters = useCallback(
    (patch: Record<string, unknown>) => {
      setState(patch)
    },
    [setState]
  )

  const clearFilters = useCallback(() => {
    reset()
  }, [reset])

  const applyPreset = useCallback(
    (preset: FilterPreset) => {
      // Reset to defaults first, then apply preset
      setState(() => ({ ...resolvedDefaults, ...preset.filters }))
    },
    [setState, resolvedDefaults]
  )

  const isSelected = useCallback(
    (key: string, value: string): boolean => {
      const current = state[key]
      if (Array.isArray(current)) {
        return current.includes(value)
      }
      return current === value
    },
    [state]
  )

  const toggleValue = useCallback(
    (key: string, value: string) => {
      const current = state[key]
      if (Array.isArray(current)) {
        const arr = current as string[]
        if (arr.includes(value)) {
          setState({ [key]: arr.filter((v) => v !== value) })
        } else {
          setState({ [key]: [...arr, value] })
        }
      } else {
        // For single-select, toggle between value and empty
        setState({ [key]: current === value ? '' : value })
      }
    },
    [state, setState]
  )

  const activeCount = useMemo(() => {
    let count = 0
    for (const [key, value] of Object.entries(state)) {
      const defaultValue = resolvedDefaults[key]
      if (Array.isArray(value)) {
        if (value.length > 0 && JSON.stringify(value) !== JSON.stringify(defaultValue)) {
          count++
        }
      } else if (value !== '' && value !== defaultValue) {
        count++
      }
    }
    return count
  }, [state, resolvedDefaults])

  return {
    filters: state,
    setFilter,
    setFilters,
    clearFilters,
    applyPreset,
    activeCount,
    isSelected,
    toggleValue,
    config,
  }
}

// ============================================
// FILTERING UTILITY
// ============================================

/**
 * Client-side filter function. Apply current filters to an array of items.
 * For server-side filtering, use the filters object to build your query.
 */
export function applyFilters<T>(
  items: T[],
  filters: Record<string, unknown>,
  matchers: Record<string, (item: T, value: unknown) => boolean>
): T[] {
  return items.filter((item) => {
    for (const [key, value] of Object.entries(filters)) {
      // Skip empty filters
      if (value === '' || value === undefined || value === null) continue
      if (Array.isArray(value) && value.length === 0) continue

      const matcher = matchers[key]
      if (matcher && !matcher(item, value)) return false
    }
    return true
  })
}
