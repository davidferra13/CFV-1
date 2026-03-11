// Archetype-Specific Dashboard Configuration
// Maps each chef archetype to a default set of KPI widgets.
// Widgets are ordered by priority (highest first).
// Universal widgets appear for all archetypes; specialty widgets are archetype-specific.

import { DEFAULT_ARCHETYPE_ID, type ArchetypeId } from './registry'

export type WidgetGridSpan = 1 | 2

export type DashboardWidget = {
  key: string
  title: string
  description: string
  /** Component path hint for future dynamic loading */
  component: string | null
  gridSpan: WidgetGridSpan
  priority: number
  /** Which archetypes this widget is relevant to (empty = universal) */
  archetypes: ArchetypeId[]
}

// ---- Master Widget Registry ----
// Every available widget in the system, tagged with relevant archetypes.

export const WIDGET_REGISTRY: DashboardWidget[] = [
  // ---- Universal widgets (all archetypes) ----
  {
    key: 'revenue-summary',
    title: 'Revenue Summary',
    description: 'Total revenue, expenses, and profit at a glance',
    component: null,
    gridSpan: 1,
    priority: 100,
    archetypes: [],
  },
  {
    key: 'upcoming-events',
    title: 'Upcoming Events',
    description: 'Next events on your calendar',
    component: null,
    gridSpan: 2,
    priority: 95,
    archetypes: [],
  },
  {
    key: 'client-pipeline',
    title: 'Client Pipeline',
    description: 'Active leads and conversion status',
    component: null,
    gridSpan: 1,
    priority: 85,
    archetypes: [],
  },
  {
    key: 'recent-inquiries',
    title: 'Recent Inquiries',
    description: 'Latest inquiries requiring attention',
    component: null,
    gridSpan: 1,
    priority: 80,
    archetypes: [],
  },

  // ---- Bakery widgets ----
  {
    key: 'oven-utilization',
    title: 'Oven Utilization',
    description: 'Current oven usage and scheduling gaps',
    component: null,
    gridSpan: 1,
    priority: 90,
    archetypes: ['bakery'],
  },
  {
    key: 'yield-variance',
    title: 'Yield Variance',
    description: 'Actual vs expected production yield',
    component: null,
    gridSpan: 1,
    priority: 88,
    archetypes: ['bakery'],
  },
  {
    key: 'display-case-status',
    title: 'Display Case Status',
    description: 'Items in display, what needs restocking',
    component: null,
    gridSpan: 1,
    priority: 75,
    archetypes: ['bakery'],
  },
  {
    key: 'fermentation-active',
    title: 'Fermentation Active',
    description: 'Active fermentation batches and timers',
    component: null,
    gridSpan: 1,
    priority: 70,
    archetypes: ['bakery'],
  },
  {
    key: 'daily-production-progress',
    title: 'Daily Production Progress',
    description: 'Production targets vs completed items today',
    component: null,
    gridSpan: 2,
    priority: 92,
    archetypes: ['bakery'],
  },

  // ---- Food Truck widgets ----
  {
    key: 'location-profitability',
    title: 'Location Profitability',
    description: 'Revenue and margin by location',
    component: null,
    gridSpan: 2,
    priority: 90,
    archetypes: ['food-truck'],
  },
  {
    key: 'weather-demand',
    title: 'Weather & Demand',
    description: 'Weather forecast and its impact on expected demand',
    component: null,
    gridSpan: 1,
    priority: 85,
    archetypes: ['food-truck'],
  },
  {
    key: 'permit-expiry',
    title: 'Permit Expiry',
    description: 'Upcoming permit renewals and deadlines',
    component: null,
    gridSpan: 1,
    priority: 78,
    archetypes: ['food-truck'],
  },
  {
    key: 'vehicle-maintenance-due',
    title: 'Vehicle Maintenance',
    description: 'Scheduled maintenance and mileage alerts',
    component: null,
    gridSpan: 1,
    priority: 72,
    archetypes: ['food-truck'],
  },
  {
    key: 'preorder-count',
    title: 'Preorder Count',
    description: 'Active preorders for today and tomorrow',
    component: null,
    gridSpan: 1,
    priority: 82,
    archetypes: ['food-truck'],
  },

  // ---- Restaurant widgets ----
  {
    key: 'peak-hours',
    title: 'Peak Hours',
    description: 'Busiest hours today and staffing alignment',
    component: null,
    gridSpan: 1,
    priority: 88,
    archetypes: ['restaurant'],
  },
  {
    key: 'reservation-count',
    title: 'Reservations',
    description: 'Total reservations for today',
    component: null,
    gridSpan: 1,
    priority: 90,
    archetypes: ['restaurant'],
  },
  {
    key: 'covers-today',
    title: 'Covers Today',
    description: 'Expected covers based on reservations and walk-ins',
    component: null,
    gridSpan: 1,
    priority: 92,
    archetypes: ['restaurant'],
  },
  {
    key: 'daily-specials',
    title: 'Daily Specials',
    description: "Today's specials and 86'd items",
    component: null,
    gridSpan: 1,
    priority: 75,
    archetypes: ['restaurant'],
  },
  {
    key: 'kds-queue',
    title: 'KDS Queue',
    description: 'Kitchen display system ticket count and wait times',
    component: null,
    gridSpan: 2,
    priority: 85,
    archetypes: ['restaurant'],
  },

  // ---- Meal Prep widgets ----
  {
    key: 'delivery-schedule',
    title: 'Delivery Schedule',
    description: 'Upcoming deliveries and routes',
    component: null,
    gridSpan: 2,
    priority: 90,
    archetypes: ['meal-prep'],
  },
  {
    key: 'subscription-renewals',
    title: 'Subscription Renewals',
    description: 'Upcoming renewals and at-risk subscriptions',
    component: null,
    gridSpan: 1,
    priority: 85,
    archetypes: ['meal-prep'],
  },
  {
    key: 'meal-plan-active',
    title: 'Active Meal Plans',
    description: 'Currently active meal plans and client count',
    component: null,
    gridSpan: 1,
    priority: 88,
    archetypes: ['meal-prep'],
  },
  {
    key: 'prep-timeline',
    title: 'Prep Timeline',
    description: 'Batch cooking schedule for the week',
    component: null,
    gridSpan: 2,
    priority: 82,
    archetypes: ['meal-prep'],
  },

  // ---- Private Chef widgets ----
  {
    key: 'event-calendar',
    title: 'Event Calendar',
    description: 'Upcoming events with client and menu details',
    component: null,
    gridSpan: 2,
    priority: 90,
    archetypes: ['private-chef'],
  },
  {
    key: 'quote-pipeline',
    title: 'Quote Pipeline',
    description: 'Quotes in progress, sent, and awaiting response',
    component: null,
    gridSpan: 1,
    priority: 88,
    archetypes: ['private-chef'],
  },
  {
    key: 'menu-proposals',
    title: 'Menu Proposals',
    description: 'Draft and pending menu proposals for clients',
    component: null,
    gridSpan: 1,
    priority: 82,
    archetypes: ['private-chef'],
  },
  {
    key: 'client-dietary-notes',
    title: 'Client Dietary Notes',
    description: 'Dietary restrictions and preferences for upcoming events',
    component: null,
    gridSpan: 1,
    priority: 78,
    archetypes: ['private-chef'],
  },

  // ---- Caterer widgets ----
  {
    key: 'upcoming-events-catering',
    title: 'Upcoming Catering Events',
    description: 'Next catering events with guest count and venue',
    component: null,
    gridSpan: 2,
    priority: 90,
    archetypes: ['caterer'],
  },
  {
    key: 'staff-schedule',
    title: 'Staff Schedule',
    description: 'Staff assignments and availability for upcoming events',
    component: null,
    gridSpan: 2,
    priority: 88,
    archetypes: ['caterer'],
  },
  {
    key: 'equipment-checklist',
    title: 'Equipment Checklist',
    description: 'Equipment needed for upcoming events',
    component: null,
    gridSpan: 1,
    priority: 82,
    archetypes: ['caterer'],
  },
  {
    key: 'tastings-scheduled',
    title: 'Tastings Scheduled',
    description: 'Upcoming tasting appointments with clients',
    component: null,
    gridSpan: 1,
    priority: 78,
    archetypes: ['caterer'],
  },
]

// ---- Default Widget Lists per Archetype ----

const ARCHETYPE_DEFAULTS: Record<ArchetypeId, string[]> = {
  'private-chef': [
    'revenue-summary',
    'event-calendar',
    'quote-pipeline',
    'client-pipeline',
    'recent-inquiries',
    'menu-proposals',
    'client-dietary-notes',
    'upcoming-events',
  ],
  caterer: [
    'revenue-summary',
    'upcoming-events-catering',
    'staff-schedule',
    'client-pipeline',
    'equipment-checklist',
    'tastings-scheduled',
    'recent-inquiries',
    'upcoming-events',
  ],
  'meal-prep': [
    'revenue-summary',
    'delivery-schedule',
    'meal-plan-active',
    'subscription-renewals',
    'prep-timeline',
    'client-pipeline',
    'recent-inquiries',
    'upcoming-events',
  ],
  restaurant: [
    'revenue-summary',
    'covers-today',
    'reservation-count',
    'peak-hours',
    'kds-queue',
    'daily-specials',
    'client-pipeline',
    'recent-inquiries',
  ],
  'food-truck': [
    'revenue-summary',
    'location-profitability',
    'weather-demand',
    'preorder-count',
    'permit-expiry',
    'vehicle-maintenance-due',
    'client-pipeline',
    'recent-inquiries',
  ],
  bakery: [
    'revenue-summary',
    'daily-production-progress',
    'oven-utilization',
    'yield-variance',
    'display-case-status',
    'fermentation-active',
    'client-pipeline',
    'recent-inquiries',
  ],
}

/**
 * Returns the default dashboard widget configuration for a given archetype.
 * Widgets are returned in priority order (highest first).
 * If the archetype is unknown, falls back to private-chef defaults.
 */
export function getDashboardConfig(archetypeKey: string): DashboardWidget[] {
  const key = (archetypeKey || DEFAULT_ARCHETYPE_ID) as ArchetypeId
  const widgetKeys = ARCHETYPE_DEFAULTS[key] ?? ARCHETYPE_DEFAULTS[DEFAULT_ARCHETYPE_ID]

  const widgetMap = new Map(WIDGET_REGISTRY.map((w) => [w.key, w]))

  return widgetKeys
    .map((k) => widgetMap.get(k))
    .filter((w): w is DashboardWidget => w !== undefined)
}

/**
 * Returns all widgets relevant to a given archetype (including universal ones).
 * Useful for a "widget picker" UI where chefs can add/remove widgets.
 */
export function getAvailableWidgets(archetypeKey: string): DashboardWidget[] {
  const key = (archetypeKey || DEFAULT_ARCHETYPE_ID) as ArchetypeId

  return WIDGET_REGISTRY.filter(
    (w) => w.archetypes.length === 0 || w.archetypes.includes(key)
  ).sort((a, b) => b.priority - a.priority)
}
