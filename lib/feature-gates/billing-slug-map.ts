// lib/feature-gates/billing-slug-map.ts
// Maps the kebab-case billing feature slugs used by requirePro() and
// <UpgradeGate featureSlug="..."> to gate keys in GATE_REGISTRY.
// This is the enforcement bridge; the chef-facing module vocabulary table
// (blueprint Section 4 item 2) is owned by the nav workstream and may add
// entries here, but must never remove one while a call site still uses it.
// Completeness is asserted by tests/unit/feature-gates.billing-slug-map.test.ts.

import type { GateKey } from './gate-registry'

export const BILLING_SLUG_GATES = {
  'advanced-analytics': 'advanced_analytics',
  'advanced-calendar': 'advanced_calendar',
  'cannabis-portal': 'cannabis_portal',
  'client-intelligence': 'client_intelligence',
  commerce: 'commerce',
  community: 'community',
  integrations: 'integrations',
  'intelligence-hub': 'intelligence_hub',
  marketing: 'marketing',
  'meal-prep-ops': 'meal_prep_ops',
  'nutrition-analysis': 'nutrition_analysis',
  payroll: 'payroll',
  'professional-dev': 'professional_dev',
  protection: 'protection',
  raffle: 'raffle',
  'staff-management': 'staff_management',
} as const satisfies Record<string, GateKey>

export type BillingFeatureSlug = keyof typeof BILLING_SLUG_GATES
