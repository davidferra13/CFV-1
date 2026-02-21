'use client'

import { useState, useEffect } from 'react'

/**
 * Debounce a value — useful for search inputs to avoid firing
 * a query on every keystroke.
 *
 * @example
 * const debouncedQuery = useDebounce(query, 300)
 * useEffect(() => { search(debouncedQuery) }, [debouncedQuery])
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}

/**
 * Debounce a callback — useful for debouncing event handlers directly
 * rather than values.
 *
 * @example
 * const debouncedSearch = useDebouncedCallback((q: string) => search(q), 300)
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delayMs = 300
): (...args: Parameters<T>) => void {
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    setTimer(setTimeout(() => callback(...args), delayMs))
  }
}
