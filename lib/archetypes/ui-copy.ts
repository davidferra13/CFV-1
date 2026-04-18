// Archetype-aware UI copy - maps chef archetype to contextual labels/actions.
// Used by dashboard, nav, forms, and empty states for archetype-specific language.

import type { ArchetypeId } from './presets'

interface PrimaryAction {
  label: string
  href: string
}

const ARCHETYPE_ACTIONS: Record<ArchetypeId, PrimaryAction> = {
  'private-chef': { label: 'New Event', href: '/events/new' },
  caterer: { label: 'New Event', href: '/events/new' },
  'meal-prep': { label: 'New Prep Order', href: '/events/new' },
  restaurant: { label: 'New Reservation', href: '/events/new' },
  'food-truck': { label: 'New Booking', href: '/events/new' },
  bakery: { label: 'New Order', href: '/events/new' },
}

const DEFAULT_ACTION: PrimaryAction = { label: 'New Event', href: '/events/new' }

export function getDashboardPrimaryAction(
  archetype: ArchetypeId | null | undefined
): PrimaryAction {
  if (!archetype) return DEFAULT_ACTION
  return ARCHETYPE_ACTIONS[archetype] ?? DEFAULT_ACTION
}

// ─── Archetype-Aware Label Overrides ─────────────────────────────────────────
// Maps default labels to archetype-specific replacements.
// Only non-obvious overrides are listed; private-chef and caterer use defaults.

interface ArchetypeCopy {
  /** Nav/action bar label for "Events" hub */
  eventsLabel: string
  /** Singular: "event" -> "prep order", etc. */
  eventSingular: string
  /** "New Event" -> "New Prep Order", etc. */
  newEventLabel: string
  /** Empty state: "No events scheduled yet" -> "No prep orders yet", etc. */
  noEventsMessage: string
  /** Page title on /events */
  eventsPageTitle: string
}

const ARCHETYPE_COPY: Partial<Record<ArchetypeId, Partial<ArchetypeCopy>>> = {
  'meal-prep': {
    eventsLabel: 'Orders',
    eventSingular: 'prep order',
    newEventLabel: 'New Prep Order',
    noEventsMessage: 'No prep orders yet. Create your first one to get started.',
    eventsPageTitle: 'Prep Orders',
  },
  restaurant: {
    eventsLabel: 'Reservations',
    eventSingular: 'reservation',
    newEventLabel: 'New Reservation',
    noEventsMessage: 'No reservations yet. Create your first one to get started.',
    eventsPageTitle: 'Reservations',
  },
  'food-truck': {
    eventsLabel: 'Bookings',
    eventSingular: 'booking',
    newEventLabel: 'New Booking',
    noEventsMessage: 'No bookings yet. Create your first one to get started.',
    eventsPageTitle: 'Bookings',
  },
  bakery: {
    eventsLabel: 'Orders',
    eventSingular: 'order',
    newEventLabel: 'New Order',
    noEventsMessage: 'No orders yet. Create your first one to get started.',
    eventsPageTitle: 'Orders',
  },
}

const DEFAULT_COPY: ArchetypeCopy = {
  eventsLabel: 'Events',
  eventSingular: 'event',
  newEventLabel: 'New Event',
  noEventsMessage: 'No events scheduled yet. Create your first one to get started.',
  eventsPageTitle: 'Events',
}

/**
 * Get archetype-specific UI copy. Falls back to default for private-chef/caterer/unknown.
 */
export function getArchetypeCopy(
  archetype: ArchetypeId | string | null | undefined
): ArchetypeCopy {
  if (!archetype) return DEFAULT_COPY
  const overrides = ARCHETYPE_COPY[archetype as ArchetypeId]
  if (!overrides) return DEFAULT_COPY
  return { ...DEFAULT_COPY, ...overrides }
}
