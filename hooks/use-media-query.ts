'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to track a CSS media query match.
 * Returns `true` when the query matches, `false` otherwise.
 * Returns `false` during SSR (safe for hydration).
 *
 * Usage:
 *   const isDesktop = useMediaQuery('(min-width: 768px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
