// Archetype-Aware Terminology Mapping
// Swaps UI labels based on the user's active archetype.
// A bakery sees "Orders" where a caterer sees "Events."
//
// NOT a server action file - no 'use server'.

import type { ArchetypeId } from './registry'

/** All translatable term keys used across the UI. */
export type TermKey = 'event' | 'client' | 'guest' | 'menu' | 'quote' | 'booking'

/** A single term entry with singular and plural forms. */
export type TermEntry = {
  singular: string
  plural: string
}

/** Full terminology map for an archetype. */
export type TerminologyMap = Record<TermKey, TermEntry>

// ── Default (Private Chef) ──────────────────────────────────────

const DEFAULT_TERMS: TerminologyMap = {
  event: { singular: 'Event', plural: 'Events' },
  client: { singular: 'Client', plural: 'Clients' },
  guest: { singular: 'Guest', plural: 'Guests' },
  menu: { singular: 'Menu', plural: 'Menus' },
  quote: { singular: 'Quote', plural: 'Quotes' },
  booking: { singular: 'Booking', plural: 'Bookings' },
}

// ── Per-Archetype Overrides ─────────────────────────────────────
// Only specify terms that differ from the default.

const OVERRIDES: Partial<Record<ArchetypeId, Partial<TerminologyMap>>> = {
  // Caterer uses mostly the same terms as private chef
  caterer: {},

  'meal-prep': {
    event: { singular: 'Delivery', plural: 'Deliveries' },
    client: { singular: 'Subscriber', plural: 'Subscribers' },
    guest: { singular: 'Portion', plural: 'Portions' },
    quote: { singular: 'Plan', plural: 'Plans' },
    booking: { singular: 'Subscription', plural: 'Subscriptions' },
  },

  restaurant: {
    event: { singular: 'Service', plural: 'Services' },
    client: { singular: 'Customer', plural: 'Customers' },
    guest: { singular: 'Cover', plural: 'Covers' },
    quote: { singular: 'Reservation', plural: 'Reservations' },
    booking: { singular: 'Reservation', plural: 'Reservations' },
  },

  'food-truck': {
    event: { singular: 'Stop', plural: 'Stops' },
    client: { singular: 'Customer', plural: 'Customers' },
    guest: { singular: 'Customer', plural: 'Customers' },
    quote: { singular: 'n/a', plural: 'n/a' },
    booking: { singular: 'Location', plural: 'Locations' },
  },

  bakery: {
    event: { singular: 'Order', plural: 'Orders' },
    client: { singular: 'Customer', plural: 'Customers' },
    guest: { singular: 'n/a', plural: 'n/a' },
    booking: { singular: 'Order', plural: 'Orders' },
  },
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Returns the full resolved terminology map for a given archetype.
 * Falls back to private-chef defaults for any unspecified terms.
 */
export function getTerminology(archetypeKey: string): TerminologyMap {
  const overrides = OVERRIDES[archetypeKey as ArchetypeId] ?? {}
  return { ...DEFAULT_TERMS, ...overrides }
}

/**
 * Returns a single term for a given key and archetype.
 * Defaults to singular form. Pass `plural: true` for the plural.
 */
export function getTerm(
  key: TermKey,
  archetypeKey: string,
  options?: { plural?: boolean }
): string {
  const map = getTerminology(archetypeKey)
  const entry = map[key] ?? DEFAULT_TERMS[key]
  return options?.plural ? entry.plural : entry.singular
}

/** All valid term keys, useful for iteration and validation. */
export const TERM_KEYS: TermKey[] = ['event', 'client', 'guest', 'menu', 'quote', 'booking']
