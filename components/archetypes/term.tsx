'use client'

// <Term /> - Renders the archetype-appropriate label for a given term key.
// Drop this into any page to get automatic terminology translation.
//
// Usage:
//   <Term k="event" />          -> "Order" (bakery), "Event" (private chef)
//   <Term k="event" plural />   -> "Orders" (bakery), "Events" (private chef)
//   <Term k="client" plural />  -> "Subscribers" (meal prep), "Clients" (private chef)

import { useTerm } from '@/lib/archetypes/terminology-context'
import type { TermKey } from '@/lib/archetypes/terminology'

type TermProps = {
  /** The term key to translate (e.g. 'event', 'client', 'guest'). */
  k: TermKey
  /** If true, renders the plural form. */
  plural?: boolean
  /** Optional className for the wrapping span. */
  className?: string
}

/**
 * Inline component that renders an archetype-aware term.
 * Must be used inside a <TerminologyProvider>.
 */
export function Term({ k, plural, className }: TermProps) {
  const label = useTerm(k, { plural })

  if (className) {
    return <span className={className}>{label}</span>
  }

  return <>{label}</>
}
