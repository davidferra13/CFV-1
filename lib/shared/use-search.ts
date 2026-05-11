'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/lib/hooks/use-debounce'

export type UseSearchOptions = {
  /** URL search param key to sync with (e.g. 'q'). Omit to skip URL sync. */
  paramKey?: string
  /** Debounce delay in ms. Default 300. */
  debounceMs?: number
  /** Minimum query length before triggering search. Default 0. */
  minLength?: number
  /** Initial query value. If paramKey is set, the URL param takes precedence. */
  initialQuery?: string
}

export type UseSearchReturn = {
  /** Raw input value (updates immediately on keystroke) */
  query: string
  /** Debounced query value (updates after debounce delay) */
  debouncedQuery: string
  /** Whether the debounced value is lagging behind the raw input */
  isSearching: boolean
  /** Update the search query */
  setQuery: (value: string) => void
  /** Clear the search input and URL param */
  clearSearch: () => void
  /** The effective query: empty string if below minLength, otherwise debouncedQuery */
  effectiveQuery: string
}

/**
 * Headless search hook with debouncing and optional URL-param sync.
 *
 * Reuses the existing useDebounce from lib/hooks. Manages the full
 * lifecycle: raw input state, debounced value, URL sync, and clear.
 *
 * @example
 * const { query, setQuery, effectiveQuery, isSearching, clearSearch } = useSearch({
 *   paramKey: 'q',
 *   debounceMs: 300,
 *   minLength: 2,
 * })
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { paramKey, debounceMs = 300, minLength = 0, initialQuery = '' } = options

  const router = useRouter()
  const searchParams = useSearchParams()
  const isInitialized = useRef(false)

  // Seed from URL param if available
  const paramValue = paramKey ? (searchParams?.get(paramKey) ?? '') : ''
  const seed = !isInitialized.current && paramValue ? paramValue : initialQuery

  const [query, setQueryState] = useState(seed)
  const debouncedQuery = useDebounce(query, debounceMs)

  // Mark initialized after first render
  useEffect(() => {
    isInitialized.current = true
  }, [])

  // Sync URL param when debounced value changes
  useEffect(() => {
    if (!paramKey || !isInitialized.current) return

    const currentParam = searchParams?.get(paramKey) ?? ''
    if (debouncedQuery === currentParam) return

    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (debouncedQuery) {
      params.set(paramKey, debouncedQuery)
    } else {
      params.delete(paramKey)
    }
    const qs = params.toString()
    router.replace(`?${qs}`, { scroll: false })
  }, [debouncedQuery, paramKey, router, searchParams])

  const setQuery = useCallback((value: string) => {
    setQueryState(value)
  }, [])

  const clearSearch = useCallback(() => {
    setQueryState('')
  }, [])

  const isSearching = query !== debouncedQuery
  const effectiveQuery = debouncedQuery.length >= minLength ? debouncedQuery : ''

  return {
    query,
    debouncedQuery,
    isSearching,
    setQuery,
    clearSearch,
    effectiveQuery,
  }
}
