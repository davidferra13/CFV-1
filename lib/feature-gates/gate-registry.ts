// lib/feature-gates/gate-registry.ts
// Canonical registry of all gated features, organized by tier.

import type { GateDefinition, GateRegistry } from './gate-types'

function gate(
  key: string,
  name: string,
  tier: GateDefinition['tier'],
  description: string,
  defaultEnabled = true
): GateDefinition {
  return { key, name, tier, description, defaultEnabled }
}

/**
 * GATE_REGISTRY: single source of truth for every feature gate.
 *
 * Tier assignment follows .constraints/tier-gating.json:
 *   free  = inquiries, events, clients, quotes, payments, basic calendar,
 *           basic finance, recipes, documents
 *   pro   = everything else
 *   enterprise = multi-location, team management, API access
 */
export const GATE_REGISTRY: GateRegistry = {
  // --- AI features (pro) ---
  remy_chat: gate('remy_chat', 'Remy Chat', 'pro', 'AI concierge chat for client communication'),
  remy_autopilot: gate(
    'remy_autopilot',
    'Remy Autopilot',
    'pro',
    'Autonomous AI actions on behalf of the chef'
  ),
  ai_menu_suggestions: gate(
    'ai_menu_suggestions',
    'AI Menu Suggestions',
    'pro',
    'AI-powered menu composition and pairing recommendations'
  ),

  // --- Advanced features (pro) ---
  recipe_costing: gate(
    'recipe_costing',
    'Recipe Costing',
    'pro',
    'Ingredient-level cost analysis and margin tracking'
  ),
  weather_intelligence: gate(
    'weather_intelligence',
    'Weather Intelligence',
    'pro',
    'Weather-aware event planning and alerts'
  ),
  profitability_cockpit: gate(
    'profitability_cockpit',
    'Profitability Cockpit',
    'pro',
    'Deep financial analytics and profitability dashboards'
  ),
  advanced_scheduling: gate(
    'advanced_scheduling',
    'Advanced Scheduling',
    'pro',
    'Conflict detection, travel time, and protected time blocks'
  ),

  // --- Premium features (pro) ---
  client_portal_customization: gate(
    'client_portal_customization',
    'Client Portal Customization',
    'pro',
    'Custom branding and layout for the client-facing portal'
  ),
  custom_branding: gate(
    'custom_branding',
    'Custom Branding',
    'pro',
    'Logo, colors, and typography overrides across all surfaces'
  ),
  data_export: gate(
    'data_export',
    'Data Export',
    'pro',
    'CSV and PDF export of events, finances, and client data'
  ),

  // --- Enterprise features ---
  multi_location: gate(
    'multi_location',
    'Multi-Location',
    'enterprise',
    'Manage operations across multiple kitchens or regions'
  ),
  team_management: gate(
    'team_management',
    'Team Management',
    'enterprise',
    'Staff roles, permissions, and delegation workflows'
  ),
  api_access: gate(
    'api_access',
    'API Access',
    'enterprise',
    'Programmatic access to ChefFlow data and actions'
  ),
  audit_log: gate(
    'audit_log',
    'Audit Log',
    'enterprise',
    'Full history of account actions and changes'
  ),
  sla_support: gate(
    'sla_support',
    'SLA Support',
    'enterprise',
    'Priority support with guaranteed response times'
  ),
} as const

/** All gate keys as a union type for compile-time safety. */
export type GateKey = keyof typeof GATE_REGISTRY
