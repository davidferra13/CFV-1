'use client'

// React context for archetype-aware terminology.
// Wrap the app in <TerminologyProvider> and use hooks to get translated terms.

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { getTerminology, type TerminologyMap, type TermKey } from './terminology'

// ── Context ─────────────────────────────────────────────────────

const TerminologyContext = createContext<TerminologyMap | null>(null)

// ── Provider ────────────────────────────────────────────────────

type TerminologyProviderProps = {
  archetypeKey: string
  children: ReactNode
}

/**
 * Provides archetype-aware terminology to all child components.
 * Place this near the top of the component tree, after determining
 * the active archetype for the current user/chef.
 */
export function TerminologyProvider({ archetypeKey, children }: TerminologyProviderProps) {
  const map = useMemo(() => getTerminology(archetypeKey), [archetypeKey])

  return <TerminologyContext.Provider value={map}>{children}</TerminologyContext.Provider>
}

// ── Hooks ───────────────────────────────────────────────────────

/**
 * Returns the full resolved terminology map for the active archetype.
 * Must be used inside a <TerminologyProvider>.
 */
export function useTerminology(): TerminologyMap {
  const ctx = useContext(TerminologyContext)
  if (!ctx) {
    throw new Error('useTerminology must be used inside a <TerminologyProvider>')
  }
  return ctx
}

/**
 * Returns a single translated term for the active archetype.
 * Defaults to singular form. Pass `plural: true` for the plural.
 *
 * Example: `const label = useTerm('event')` returns "Order" for bakery users.
 */
export function useTerm(key: TermKey, options?: { plural?: boolean }): string {
  const map = useTerminology()
  const entry = map[key]
  if (!entry) return key
  return options?.plural ? entry.plural : entry.singular
}
