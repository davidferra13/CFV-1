// Route ownership map: every chef-nav route has exactly one owner.
//
// Required by Amendment 2 of docs/chef-navigation-decision-contract.md.
// Section 2 of that contract says every route has one owning domain. This file
// is the machine-readable form of that rule, so that every route in the chef
// sidebar is reachable by some toggle instead of being permanently pinned on.
//
// An owner is either a module slug from lib/billing/modules.ts, or CORE_OWNER.
// CORE_OWNER means "never hidden by a module toggle": the daily doors and the
// escape hatches a chef must always be able to reach, settings above all. A core
// route still counts as owned, so coverage can be proved at 100 percent.
//
// NOT a server action file - no 'use server'.

export const CORE_OWNER = 'core' as const

export type RouteOwner = string

/**
 * First path segment -> owning module slug, or CORE_OWNER.
 * Every first segment present in components/navigation/nav-config.tsx must
 * appear here. scripts/scratch/audit-module-coverage.ts proves the count.
 */
export const SEGMENT_OWNER: Record<string, RouteOwner> = {
  // Core: always reachable, never hidden by a toggle
  activity: CORE_OWNER,
  briefing: CORE_OWNER,
  communication: CORE_OWNER,
  dashboard: CORE_OWNER,
  dev: CORE_OWNER,
  eat: CORE_OWNER,
  features: CORE_OWNER,
  help: CORE_OWNER,
  import: CORE_OWNER,
  imports: CORE_OWNER,
  inbox: CORE_OWNER,
  notifications: CORE_OWNER,
  onboarding: CORE_OWNER,
  queue: CORE_OWNER,
  reminders: CORE_OWNER,
  remy: CORE_OWNER,
  settings: CORE_OWNER,

  // Pipeline: inquiries, quotes, leads, proposals, prospecting
  calls: 'pipeline',
  'guest-leads': 'pipeline',
  inquiries: 'pipeline',
  leads: 'pipeline',
  marketplace: 'pipeline',
  pipeline: 'pipeline',
  proposals: 'pipeline',
  prospecting: 'pipeline',
  quotes: 'pipeline',
  'rate-card': 'pipeline',
  waiting: 'pipeline',
  'wix-submissions': 'pipeline',

  // Events: the event lifecycle and the calendar
  availability: 'events',
  calendar: 'events',
  events: 'events',
  waitlist: 'events',

  // Culinary: menus, recipes, prep, kitchen reference
  capture: 'culinary',
  culinary: 'culinary',
  'culinary-board': 'culinary',
  kitchen: 'culinary',
  menus: 'culinary',
  prep: 'culinary',
  recipes: 'culinary',
  reference: 'culinary',
  shopping: 'culinary',

  // Clients: the relationship domain
  circles: 'clients',
  clients: 'clients',
  'guest-analytics': 'clients',
  guests: 'clients',
  loyalty: 'clients',
  reputation: 'clients',
  reviews: 'clients',

  // Finance: money in, money out, reporting
  business: 'finance',
  expenses: 'finance',
  finance: 'finance',
  payments: 'finance',
  receipts: 'finance',

  // Commerce: register, counter sales, product catalog
  commerce: 'commerce',

  // Station ops (module label "Operations"): kitchen day to day, staff, stations
  daily: 'station-ops',
  'meal-prep': 'station-ops',
  ops: 'station-ops',
  production: 'station-ops',
  'quick-log': 'station-ops',
  staff: 'station-ops',
  stations: 'station-ops',
  tables: 'station-ops',
  tasks: 'station-ops',
  team: 'station-ops',
  travel: 'station-ops',

  // Operations (module label "Supply Chain"): vendors, inventory, cost control
  'food-cost': 'operations',
  inventory: 'operations',
  prices: 'operations',
  vendors: 'operations',

  // Protection: safety, contracts, compliance, documents
  cannabis: 'protection',
  chef: 'protection',
  contracts: 'protection',
  documents: 'protection',
  safety: 'protection',

  // More tools: analytics, marketing, community, professional development
  aar: 'more',
  analytics: 'more',
  autopilot: 'more',
  consulting: 'more',
  content: 'more',
  insights: 'more',
  intelligence: 'more',
  journey: 'more',
  marketing: 'more',
  partners: 'more',
  'pie-cart': 'more',
  portfolio: 'more',
  pulse: 'more',
  studio: 'more',
  surveys: 'more',

  // Multi-location
  locations: 'multi-location',
}

/** First path segment of a route, or empty string for the root. */
export function routeSegment(routePath: string): string {
  const clean = routePath.split('?')[0].split('#')[0]
  return clean.split('/').filter(Boolean)[0] ?? ''
}

/** The owner of a route: a module slug, CORE_OWNER, or undefined if unmapped. */
export function getRouteOwner(routePath: string): RouteOwner | undefined {
  return SEGMENT_OWNER[routeSegment(routePath)]
}

/** True when the route is owned and that owner is a real module toggle. */
export function isModuleOwned(routePath: string): boolean {
  const owner = getRouteOwner(routePath)
  return owner !== undefined && owner !== CORE_OWNER
}

/**
 * Nav group id (from components/navigation/nav-config.tsx) -> owning module slug,
 * or CORE_OWNER for the group that must never disappear.
 *
 * Route-level ownership alone does not collapse a group, because a group mixes
 * routes from many segments: one core-owned route such as /settings keeps the
 * whole group on screen. This map is what lets a group leave the sidebar when
 * the operator does not use it, which is the difference between hiding a link
 * and hiding a door.
 *
 * `tools` is CORE_OWNER on purpose: it holds settings, help and import, the way
 * back for anything that has been switched off.
 */
export const NAV_GROUP_OWNER: Record<string, RouteOwner> = {
  analytics: 'more',
  clients: 'clients',
  commerce: 'commerce',
  culinary: 'culinary',
  events: 'events',
  finance: 'finance',
  locations: 'multi-location',
  marketing: 'more',
  operations: 'station-ops',
  pipeline: 'pipeline',
  protection: 'protection',
  'supply-chain': 'operations',
  tools: CORE_OWNER,
}

/** True when a nav group should be shown for this set of enabled modules. */
export function isNavGroupEnabled(groupId: string, enabledModules: string[]): boolean {
  const owner = NAV_GROUP_OWNER[groupId]
  if (owner === undefined || owner === CORE_OWNER) return true
  return enabledModules.includes(owner)
}
