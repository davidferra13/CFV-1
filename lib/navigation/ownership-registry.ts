// Route ownership registry: maps route patterns to surface owners

import type { SurfaceOwner } from './ownership-types'

type RoutePattern = {
  pattern: RegExp
  owner: SurfaceOwner
}

const ROUTE_OWNERSHIP: RoutePattern[] = [
  // Lifecycle (events, dinners, bookings)
  { pattern: /^\/events(\/|$)/, owner: 'lifecycle' },
  { pattern: /^\/dinners(\/|$)/, owner: 'lifecycle' },
  { pattern: /^\/bookings(\/|$)/, owner: 'lifecycle' },
  { pattern: /^\/calendar(\/|$)/, owner: 'lifecycle' },

  // Clients
  { pattern: /^\/clients(\/|$)/, owner: 'clients' },
  { pattern: /^\/contacts(\/|$)/, owner: 'clients' },

  // Menus
  { pattern: /^\/menus(\/|$)/, owner: 'menus' },

  // Recipes
  { pattern: /^\/recipes(\/|$)/, owner: 'recipes' },

  // Ingredients
  { pattern: /^\/ingredients(\/|$)/, owner: 'ingredients' },

  // Settings
  { pattern: /^\/settings(\/|$)/, owner: 'settings' },
  { pattern: /^\/profile(\/|$)/, owner: 'settings' },
  { pattern: /^\/account(\/|$)/, owner: 'settings' },

  // Admin
  { pattern: /^\/admin(\/|$)/, owner: 'admin' },

  // Portal (client-facing)
  { pattern: /^\/portal(\/|$)/, owner: 'portal' },

  // Public pages
  { pattern: /^\/about(\/|$)/, owner: 'public' },
  { pattern: /^\/pricing(\/|$)/, owner: 'public' },
  { pattern: /^\/legal(\/|$)/, owner: 'public' },
  { pattern: /^\/blog(\/|$)/, owner: 'public' },
  { pattern: /^\/auth(\/|$)/, owner: 'public' },
  { pattern: /^\/sign-in(\/|$)/, owner: 'public' },
  { pattern: /^\/sign-up(\/|$)/, owner: 'public' },

  // Operations (dashboard, tasks, queue)
  { pattern: /^\/dashboard(\/|$)/, owner: 'operations' },
  { pattern: /^\/tasks(\/|$)/, owner: 'operations' },
  { pattern: /^\/queue(\/|$)/, owner: 'operations' },
  { pattern: /^\/notifications(\/|$)/, owner: 'operations' },

  // Intelligence (analytics, reports, insights)
  { pattern: /^\/analytics(\/|$)/, owner: 'intelligence' },
  { pattern: /^\/reports(\/|$)/, owner: 'intelligence' },
  { pattern: /^\/insights(\/|$)/, owner: 'intelligence' },
  { pattern: /^\/intelligence(\/|$)/, owner: 'intelligence' },

  // Finance (invoices, payments, ledger)
  { pattern: /^\/finance(\/|$)/, owner: 'finance' },
  { pattern: /^\/invoices(\/|$)/, owner: 'finance' },
  { pattern: /^\/payments(\/|$)/, owner: 'finance' },
  { pattern: /^\/ledger(\/|$)/, owner: 'finance' },
  { pattern: /^\/quotes(\/|$)/, owner: 'finance' },
]

/**
 * Get the surface owner for a given pathname.
 * Returns undefined if no owner is registered (orphan route).
 */
export function getOwner(pathname: string): SurfaceOwner | undefined {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  for (const entry of ROUTE_OWNERSHIP) {
    if (entry.pattern.test(normalized)) {
      return entry.owner
    }
  }
  return undefined
}

/**
 * Check if a pathname has no registered owner.
 */
export function isOrphan(pathname: string): boolean {
  return getOwner(pathname) === undefined
}

/**
 * Get all registered route patterns for a specific owner.
 */
export function getPatternsForOwner(owner: SurfaceOwner): RegExp[] {
  return ROUTE_OWNERSHIP.filter((entry) => entry.owner === owner).map((entry) => entry.pattern)
}
