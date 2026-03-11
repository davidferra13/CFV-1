// Master Module Catalog - every module grouped by universal dimension.
// This is a static catalog for discovery UI. Module toggle state lives in chef_preferences.
// NOT a server action file - no 'use server'.

import type { ArchetypeId } from './registry'

export type DimensionId = 'production' | 'movement' | 'time' | 'money' | 'people' | 'compliance'

export type DimensionDefinition = {
  id: DimensionId
  label: string
  description: string
  iconName: string // Maps to icons exported from @/components/ui/icons
}

export type CatalogModule = {
  key: string
  label: string
  description: string
  dimension: DimensionId
  iconName: string
  /** Which archetypes include this module by default */
  defaultArchetypes: ArchetypeId[]
  /** Maps to an existing module slug in lib/billing/modules.ts (if one exists) */
  moduleSlug?: string
}

// The 6 universal dimensions every food business operates across
export const DIMENSIONS: DimensionDefinition[] = [
  {
    id: 'production',
    label: 'Production',
    description:
      'Everything that happens in the kitchen: recipes, menus, batch planning, prep timelines, yield tracking',
    iconName: 'Utensils',
  },
  {
    id: 'movement',
    label: 'Movement',
    description:
      'Delivery logistics, location scheduling, commissary load-outs, vehicle maintenance',
    iconName: 'Truck',
  },
  {
    id: 'time',
    label: 'Time',
    description: 'Calendars, shift scheduling, punch clock, reservations, event timelines',
    iconName: 'Clock',
  },
  {
    id: 'money',
    label: 'Money',
    description: 'Invoicing, P&L, food cost tracking, gift cards, sales tax, payroll, tips',
    iconName: 'Wallet',
  },
  {
    id: 'people',
    label: 'People',
    description: 'Clients, staff, vendors, wholesale accounts, loyalty, feedback, communication',
    iconName: 'Users',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'Permits, SOPs, training, allergen tracking, temp logs, FIFO and shelf life',
    iconName: 'ShieldCheck',
  },
]

export const MODULE_CATALOG: CatalogModule[] = [
  // ── Production ──────────────────────────────────────────────────
  {
    key: 'recipes',
    label: 'Recipes',
    description: 'Create and manage your recipe book with ingredients, methods, and costing',
    dimension: 'production',
    iconName: 'BookOpen',
    defaultArchetypes: [
      'private-chef',
      'caterer',
      'meal-prep',
      'restaurant',
      'food-truck',
      'bakery',
    ],
    moduleSlug: 'culinary',
  },
  {
    key: 'menus',
    label: 'Menus',
    description: 'Build menus from your recipes for events, seasons, or daily service',
    dimension: 'production',
    iconName: 'UtensilsCrossed',
    defaultArchetypes: ['private-chef', 'caterer', 'restaurant', 'bakery'],
    moduleSlug: 'culinary',
  },
  {
    key: 'batch-planning',
    label: 'Batch Planning',
    description: 'Plan large-scale production runs with scaling, portioning, and yield tracking',
    dimension: 'production',
    iconName: 'LayoutGrid',
    defaultArchetypes: ['meal-prep', 'caterer', 'bakery'],
    moduleSlug: 'culinary',
  },
  {
    key: 'prep-timelines',
    label: 'Prep Timelines',
    description: 'Schedule prep tasks across days with dependencies and team assignments',
    dimension: 'production',
    iconName: 'Timer',
    defaultArchetypes: ['caterer', 'restaurant', 'bakery'],
    moduleSlug: 'culinary',
  },
  {
    key: 'stations',
    label: 'Kitchen Stations',
    description: 'Organize kitchen workflow by station with real-time status tracking',
    dimension: 'production',
    iconName: 'Grid3X3',
    defaultArchetypes: ['restaurant', 'food-truck'],
  },
  {
    key: 'pos-register',
    label: 'POS Register',
    description: 'Counter sales, product catalog, and payment processing for walk-in customers',
    dimension: 'production',
    iconName: 'Monitor',
    defaultArchetypes: ['restaurant', 'food-truck', 'bakery'],
    moduleSlug: 'commerce',
  },

  // ── Movement ────────────────────────────────────────────────────
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Manage delivery routes, drop-off windows, and driver assignments',
    dimension: 'movement',
    iconName: 'Truck',
    defaultArchetypes: ['meal-prep', 'caterer'],
  },
  {
    key: 'travel',
    label: 'Travel & Locations',
    description: 'Track event locations, travel time, mileage, and on-site logistics',
    dimension: 'movement',
    iconName: 'MapPin',
    defaultArchetypes: ['private-chef', 'caterer', 'food-truck'],
  },
  {
    key: 'commissary',
    label: 'Commissary',
    description: 'Manage shared kitchen space, load-outs, and equipment staging',
    dimension: 'movement',
    iconName: 'Warehouse',
    defaultArchetypes: ['food-truck', 'caterer'],
  },

  // ── Time ────────────────────────────────────────────────────────
  {
    key: 'calendar',
    label: 'Calendar',
    description: 'Master calendar with events, tasks, availability, and scheduling',
    dimension: 'time',
    iconName: 'Calendar',
    defaultArchetypes: [
      'private-chef',
      'caterer',
      'meal-prep',
      'restaurant',
      'food-truck',
      'bakery',
    ],
    moduleSlug: 'events',
  },
  {
    key: 'shift-scheduling',
    label: 'Shift Scheduling',
    description: 'Create and publish staff schedules with shift swaps and coverage tracking',
    dimension: 'time',
    iconName: 'Clock',
    defaultArchetypes: ['restaurant', 'caterer'],
  },
  {
    key: 'event-timeline',
    label: 'Event Timelines',
    description: 'Minute-by-minute run-of-show for events with task assignments',
    dimension: 'time',
    iconName: 'Timer',
    defaultArchetypes: ['private-chef', 'caterer'],
    moduleSlug: 'events',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'To-do lists, recurring tasks, and team task assignments with due dates',
    dimension: 'time',
    iconName: 'CheckSquare',
    defaultArchetypes: [
      'private-chef',
      'caterer',
      'meal-prep',
      'restaurant',
      'food-truck',
      'bakery',
    ],
  },

  // ── Money ───────────────────────────────────────────────────────
  {
    key: 'invoicing',
    label: 'Invoicing',
    description: 'Generate and send professional invoices with payment tracking',
    dimension: 'money',
    iconName: 'FileText',
    defaultArchetypes: ['private-chef', 'caterer', 'meal-prep', 'bakery'],
    moduleSlug: 'finance',
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Track expenses, receipts, and vendor payments for accurate P&L',
    dimension: 'money',
    iconName: 'Receipt',
    defaultArchetypes: [
      'private-chef',
      'caterer',
      'meal-prep',
      'restaurant',
      'food-truck',
      'bakery',
    ],
    moduleSlug: 'finance',
  },
  {
    key: 'food-cost',
    label: 'Food Cost Tracking',
    description: 'Monitor ingredient costs, recipe margins, and food cost percentages',
    dimension: 'money',
    iconName: 'DollarSign',
    defaultArchetypes: ['restaurant', 'caterer', 'bakery'],
    moduleSlug: 'finance',
  },
  {
    key: 'quotes',
    label: 'Quotes & Proposals',
    description: 'Create and send pricing proposals to clients with line items and terms',
    dimension: 'money',
    iconName: 'FileText',
    defaultArchetypes: ['private-chef', 'caterer', 'bakery'],
    moduleSlug: 'pipeline',
  },

  // ── People ──────────────────────────────────────────────────────
  {
    key: 'clients',
    label: 'Clients',
    description: 'Client directory with dietary preferences, history, and communication logs',
    dimension: 'people',
    iconName: 'Users',
    defaultArchetypes: ['private-chef', 'caterer', 'meal-prep', 'bakery'],
    moduleSlug: 'clients',
  },
  {
    key: 'staff',
    label: 'Staff',
    description: 'Manage your team with roles, availability, certifications, and performance',
    dimension: 'people',
    iconName: 'Users2',
    defaultArchetypes: ['caterer', 'restaurant'],
  },
  {
    key: 'inquiries',
    label: 'Inquiries & Leads',
    description: 'Capture incoming inquiries and track them through your sales pipeline',
    dimension: 'people',
    iconName: 'Inbox',
    defaultArchetypes: ['private-chef', 'caterer', 'bakery'],
    moduleSlug: 'pipeline',
  },
  {
    key: 'loyalty',
    label: 'Loyalty Program',
    description: 'Reward repeat clients with points, tiers, and redeemable perks',
    dimension: 'people',
    iconName: 'Heart',
    defaultArchetypes: ['private-chef', 'meal-prep'],
    moduleSlug: 'clients',
  },
  {
    key: 'feedback',
    label: 'Feedback & Reviews',
    description: 'Collect post-event feedback and track client satisfaction over time',
    dimension: 'people',
    iconName: 'MessageSquare',
    defaultArchetypes: ['private-chef', 'caterer'],
    moduleSlug: 'clients',
  },
  {
    key: 'social-hub',
    label: 'Social Event Hub',
    description: 'Group chat, themes, guest profiles, collaborative event planning, and polls',
    dimension: 'people',
    iconName: 'MessageCircle',
    defaultArchetypes: [],
    moduleSlug: 'social-hub',
  },

  // ── Compliance ──────────────────────────────────────────────────
  {
    key: 'allergen-tracking',
    label: 'Allergen Tracking',
    description: 'Flag and cross-check allergens across recipes, menus, and client profiles',
    dimension: 'compliance',
    iconName: 'ShieldAlert',
    defaultArchetypes: ['private-chef', 'caterer', 'meal-prep', 'restaurant', 'bakery'],
  },
  {
    key: 'temp-logs',
    label: 'Temperature Logs',
    description: 'Record holding, cooking, and storage temperatures for food safety compliance',
    dimension: 'compliance',
    iconName: 'Thermometer',
    defaultArchetypes: ['caterer', 'restaurant', 'food-truck'],
    moduleSlug: 'protection',
  },
  {
    key: 'permits',
    label: 'Permits & Licenses',
    description: 'Track business permits, health inspections, and renewal dates',
    dimension: 'compliance',
    iconName: 'FileCheck',
    defaultArchetypes: ['restaurant', 'food-truck'],
    moduleSlug: 'protection',
  },
  {
    key: 'training',
    label: 'Training & SOPs',
    description: 'Manage staff training records, certifications, and standard operating procedures',
    dimension: 'compliance',
    iconName: 'GraduationCap',
    defaultArchetypes: ['restaurant', 'caterer'],
    moduleSlug: 'protection',
  },
  {
    key: 'shelf-life',
    label: 'Shelf Life & FIFO',
    description: 'Track product dates, first-in-first-out rotation, and waste reduction',
    dimension: 'compliance',
    iconName: 'Package',
    defaultArchetypes: ['meal-prep', 'restaurant', 'bakery'],
  },
]

/** Get all modules for a specific dimension */
export function getModulesByDimension(dimensionId: DimensionId): CatalogModule[] {
  return MODULE_CATALOG.filter((m) => m.dimension === dimensionId)
}

/** Get a dimension definition by ID */
export function getDimension(id: DimensionId): DimensionDefinition | undefined {
  return DIMENSIONS.find((d) => d.id === id)
}

/** Get all catalog modules that map to a given module slug */
export function getCatalogModulesForSlug(slug: string): CatalogModule[] {
  return MODULE_CATALOG.filter((m) => m.moduleSlug === slug)
}
