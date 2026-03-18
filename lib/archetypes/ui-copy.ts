// Archetype-aware UI copy - maps chef archetype to contextual labels/actions.
// Used by the dashboard to show a relevant primary action button.

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
