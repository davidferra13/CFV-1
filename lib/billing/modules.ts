// Module Definitions - single source of truth for the progressive disclosure system.
// Each module maps to a nav group or feature area that can be toggled on/off by the chef.
// NOT a server action file - no 'use server'.
//
// Two independent concepts:
//   1. Tier (Free vs Pro) - controls what you CAN access (monetization)
//   2. Module toggle - controls what you SEE (UX personalization)
//
// A module can be toggled off even if the chef has Pro access (they just don't want to see it).
// A Free user can toggle on a Pro module, but they'll see upgrade prompts on those pages.

import type { Tier } from '@/lib/billing/tier'

export type ModuleDefinition = {
  slug: string
  label: string
  description: string
  tier: Tier // 'free' = always available, 'pro' = requires Pro subscription
  defaultEnabled: boolean // ON by default for new signups?
  alwaysVisible: boolean // Cannot be toggled off (e.g., Dashboard)
  navGroupId?: string // Maps to navGroups[].id in nav-config.tsx
}

export const MODULES: ModuleDefinition[] = [
  // ─── Always-on (cannot be toggled off) ────────────────────────────────────
  {
    slug: 'dashboard',
    label: 'Dashboard',
    description: 'Your command center with daily actions and key metrics',
    tier: 'free',
    defaultEnabled: true,
    alwaysVisible: true,
  },

  // ─── Free modules (default ON) ────────────────────────────────────────────
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

  // ─── Extended modules (all free, opt-in) ──────────────────────────────────
  {
    slug: 'protection',
    label: 'Protection',
    description: 'Insurance, certifications, safety, and crisis response',
    tier: 'free',
    defaultEnabled: false,
    alwaysVisible: false,
    navGroupId: 'protection',
  },
  {
    slug: 'more',
    label: 'More Tools',
    description: 'Analytics, marketing, community, professional development, and more',
    tier: 'free',
    defaultEnabled: false,
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
    slug: 'station-ops',
    label: 'Operations',
    description: 'Kitchen day-to-day, staff, equipment, meal prep, and station clipboards',
    tier: 'free',
    defaultEnabled: false,
    alwaysVisible: false,
    navGroupId: 'operations',
  },
  {
    slug: 'operations',
    label: 'Supply Chain',
    description: 'Vendors, inventory, procurement, demand forecasting, and cost control',
    tier: 'free',
    defaultEnabled: false,
    alwaysVisible: false,
    navGroupId: 'supply-chain',
  },
]

/** Default enabled modules for new signups. */
export const DEFAULT_ENABLED_MODULES = MODULES.filter((m) => m.defaultEnabled).map((m) => m.slug)

/** All module slugs (for "Select All" in settings). */
export const ALL_MODULE_SLUGS = MODULES.map((m) => m.slug)

/** Look up a module by slug. */
export function getModule(slug: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.slug === slug)
}

/**
 * Given a chef's enabled modules and their tier, determine which nav group IDs to show.
 * - Always-visible modules are always included.
 * - Enabled modules are included if the chef has toggled them on.
 * - Pro modules for Free users: included (so they see upgrade prompts), but could be hidden via mode.
 */
export function getVisibleNavGroupIds(enabledModules: string[], tier: Tier): string[] {
  const enabled = new Set(enabledModules)
  const visible: string[] = []

  for (const mod of MODULES) {
    if (!mod.navGroupId) continue // dashboard has no nav group

    // Always-visible modules always show
    if (mod.alwaysVisible) {
      visible.push(mod.navGroupId)
      continue
    }

    // Module must be toggled on by the user
    if (!enabled.has(mod.slug)) continue

    // Free modules always show when enabled
    // Pro modules show when enabled (Free users see upgrade prompts on the pages)
    visible.push(mod.navGroupId)
  }

  return visible
}
