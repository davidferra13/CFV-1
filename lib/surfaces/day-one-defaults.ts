// Day-one Defaults - archetype-specific route visibility for new chefs.
// Wraps the archetype presets from lib/archetypes/presets.ts with
// route-level visibility decisions for the surface graph.

import type { ArchetypeId } from '@/lib/archetypes/presets'
import { getRouteTier } from './route-metadata'
import type { RouteTier } from './route-metadata'

export type { ArchetypeId }

/**
 * Routes visible on day 1 per archetype.
 * These are the routes a brand-new chef should see before they have any data.
 * Archetype presets define nav/module preferences; this defines route-level
 * visibility for the surface graph resolver.
 */
const ARCHETYPE_SURFACES: Record<ArchetypeId, string[]> = {
  'private-chef': [
    '/dashboard',
    '/events',
    '/events/new',
    '/events/board',
    '/clients',
    '/clients/new',
    '/culinary',
    '/recipes',
    '/recipes/new',
    '/menus',
    '/menus/new',
    '/finance',
    '/finance/invoices',
    '/inbox',
    '/calendar',
    '/settings',
    '/culinary/prep',
    '/inquiries',
    '/inquiries/new',
    '/quotes',
    '/quotes/new',
    '/remy',
    '/chat',
    '/help',
    '/onboarding',
    '/welcome',
  ],
  caterer: [
    '/dashboard',
    '/events',
    '/events/new',
    '/events/board',
    '/clients',
    '/clients/new',
    '/culinary',
    '/recipes',
    '/recipes/new',
    '/menus',
    '/menus/new',
    '/finance',
    '/finance/invoices',
    '/inbox',
    '/calendar',
    '/settings',
    '/culinary/prep',
    '/inquiries',
    '/inquiries/new',
    '/quotes',
    '/quotes/new',
    '/remy',
    '/staff',
    '/tasks',
    '/help',
    '/onboarding',
    '/welcome',
  ],
  'meal-prep': [
    '/dashboard',
    '/events',
    '/events/new',
    '/clients',
    '/clients/new',
    '/culinary',
    '/recipes',
    '/recipes/new',
    '/menus',
    '/menus/new',
    '/finance',
    '/finance/invoices',
    '/inbox',
    '/calendar',
    '/settings',
    '/culinary/prep',
    '/culinary/prep/shopping',
    '/remy',
    '/chat',
    '/tasks',
    '/help',
    '/onboarding',
    '/welcome',
  ],
  restaurant: [
    '/dashboard',
    '/events',
    '/clients',
    '/culinary',
    '/recipes',
    '/recipes/new',
    '/menus',
    '/menus/new',
    '/finance',
    '/finance/invoices',
    '/calendar',
    '/settings',
    '/culinary/prep',
    '/remy',
    '/staff',
    '/tasks',
    '/stations',
    '/kitchen',
    '/commerce',
    '/commerce/register',
    '/commerce/products',
    '/commerce/orders',
    '/inventory',
    '/help',
    '/onboarding',
    '/welcome',
  ],
  'food-truck': [
    '/dashboard',
    '/events',
    '/culinary',
    '/recipes',
    '/recipes/new',
    '/menus',
    '/menus/new',
    '/finance',
    '/finance/invoices',
    '/calendar',
    '/settings',
    '/culinary/prep',
    '/remy',
    '/tasks',
    '/stations',
    '/travel',
    '/commerce',
    '/commerce/register',
    '/help',
    '/onboarding',
    '/welcome',
  ],
  bakery: [
    '/dashboard',
    '/events',
    '/events/new',
    '/clients',
    '/clients/new',
    '/culinary',
    '/recipes',
    '/recipes/new',
    '/menus',
    '/menus/new',
    '/finance',
    '/finance/invoices',
    '/inbox',
    '/calendar',
    '/settings',
    '/culinary/prep',
    '/culinary/prep/shopping',
    '/inquiries',
    '/remy',
    '/tasks',
    '/commerce',
    '/commerce/register',
    '/commerce/products',
    '/help',
    '/onboarding',
    '/welcome',
  ],
}

/**
 * Get the day-1 route list for an archetype.
 */
export function getDay1Surfaces(archetype: ArchetypeId): string[] {
  return ARCHETYPE_SURFACES[archetype] ?? ARCHETYPE_SURFACES['private-chef']
}

/**
 * Check whether a route is in the day-1 set for a given archetype.
 */
export function isDay1Route(routePath: string, archetype: ArchetypeId): boolean {
  const normalized = routePath === '/' ? '/' : routePath.replace(/\/+$/, '')
  const surfaces = ARCHETYPE_SURFACES[archetype]
  if (!surfaces) return false
  return surfaces.includes(normalized)
}

/**
 * Determine the minimum tier a chef must be at for a route to be appropriate.
 * If the chef's current tier (derived from data presence / business maturity)
 * is below this, the route should be hidden or deprioritized.
 */
export function getMinimumTierForRoute(routePath: string, archetype: ArchetypeId): RouteTier {
  if (isDay1Route(routePath, archetype)) return 'day-one'
  return getRouteTier(routePath)
}
