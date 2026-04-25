// Module definitions for workspace visibility.
// Module toggles control what appears in navigation. They do not control access.

export type ModuleTier = 'free' | 'paid'

export type { Tier } from '@/lib/billing/tier'
import type { Tier } from '@/lib/billing/tier'

export type ModuleDefinition = {
  slug: string
  label: string
  description: string
  tier: ModuleTier
  defaultEnabled: boolean
  alwaysVisible: boolean
  navGroupId?: string
}

export const MODULES: ModuleDefinition[] = [
  {
    slug: 'dashboard',
    label: 'Dashboard',
    description: 'Your command center with daily actions and key metrics',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: true,
  },
  {
    slug: 'pipeline',
    label: 'Pipeline',
    description: 'Inquiries, quotes, leads, and sales tracking',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'pipeline',
  },
  {
    slug: 'events',
    label: 'Events',
    description: 'Event lifecycle, calendar, staff, and operations',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'events',
  },
  {
    slug: 'culinary',
    label: 'Culinary',
    description: 'Menus, recipes, ingredients, prep, costing, vendors, and kitchen management',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'culinary',
  },
  {
    slug: 'clients',
    label: 'Clients',
    description: 'Client directory, preferences, and communication',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'clients',
  },
  {
    slug: 'finance',
    label: 'Finance',
    description: 'Expenses, invoices, payments, and ledger',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'finance',
  },
  {
    slug: 'protection',
    label: 'Protection',
    description: 'Insurance, certifications, safety, and crisis response',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'protection',
  },
  {
    slug: 'more',
    label: 'More Tools',
    description: 'Analytics, marketing, community, professional development, and more',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'more',
  },
  {
    slug: 'commerce',
    label: 'Commerce',
    description: 'POS register, counter sales, product catalog, and payment processing',
    tier: 'free',
    defaultEnabled: false,
    alwaysVisible: false,
    navGroupId: 'commerce',
  },
  {
    slug: 'social-hub',
    label: 'Social Event Hub',
    description: 'Group chat, themes, guest profiles, collaborative event planning, and polls',
    tier: 'free',
    defaultEnabled: false,
    alwaysVisible: false,
  },
  {
    slug: 'multi-location',
    label: 'Multi-Location',
    description:
      'Multi-site command center, cross-location metrics, centralized purchasing, recipe compliance',
    tier: 'paid',
    defaultEnabled: false,
    alwaysVisible: false,
    navGroupId: 'locations',
  },
  {
    slug: 'station-ops',
    label: 'Operations',
    description: 'Kitchen day-to-day, staff, equipment, meal prep, and station clipboards',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'operations',
  },
  {
    slug: 'operations',
    label: 'Supply Chain',
    description: 'Vendors, inventory, procurement, demand forecasting, and cost control',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: false,
    navGroupId: 'supply-chain',
  },
]

export const DEFAULT_ENABLED_MODULES = MODULES.filter((m) => m.defaultEnabled).map((m) => m.slug)

export const ALL_MODULE_SLUGS = MODULES.map((m) => m.slug)

export function getModule(slug: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.slug === slug)
}

export function getVisibleNavGroupIds(enabledModules: string[], _tier: Tier): string[] {
  const enabled = new Set(enabledModules)
  const visible: string[] = []

  for (const mod of MODULES) {
    if (!mod.navGroupId) continue
    if (mod.alwaysVisible || enabled.has(mod.slug)) {
      visible.push(mod.navGroupId)
    }
  }

  return visible
}
