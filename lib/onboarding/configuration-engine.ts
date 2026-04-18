// Configuration Engine - Deterministic system configuration from onboarding inputs.
// Pure functions (resolveConfiguration) + server action (applyConfiguration).
//
// Pattern: 5 structured inputs -> lookup tables -> SystemConfiguration -> DB writes.
// No AI, no heuristics. Every transformation is a static map.

import type { ArchetypeId } from '@/lib/archetypes/presets'
import type { DashboardWidgetId } from '@/lib/scheduling/types'
import type {
  ConfigurationInputs,
  ScaleId,
  MaturityId,
  AcquisitionId,
  IntegrationId,
} from './configuration-inputs'

// ─── Output Type ──────────────────────────────────────────────────────────────

export type SystemConfiguration = {
  // chef_preferences
  archetype: ArchetypeId
  enabled_modules: string[]
  primary_nav_hrefs: string[]
  mobile_tab_hrefs: string[]
  dashboard_widgets: { id: DashboardWidgetId; enabled: boolean }[]
  default_prep_hours: number
  default_buffer_minutes: number
  default_shopping_minutes: number
  target_margin_percent: number
  focus_mode: boolean

  // chef_pricing_config (only for 'new' maturity)
  pricing: {
    deposit_percentage: number
    balance_due_hours: number
  } | null

  // ai_preferences
  remy_archetype: string
  remy_enabled: boolean

  // event_templates (only for 'new' maturity)
  starter_template: {
    name: string
    occasion: string
    service_style: string
    guest_count: number
  } | null

  // Metadata for UI hints (not persisted, used by wizard/empty states)
  hints: {
    emphasize_import: boolean
    emphasize_gmail: boolean
    emphasize_csv: boolean
    show_staff_tools: boolean
  }
}

// ─── Transformation Tables ────────────────────────────────────────────────────

// Base widgets every archetype gets
const BASE_WIDGETS: DashboardWidgetId[] = [
  'todays_schedule',
  'week_strip',
  'priority_queue',
  'business_health',
  'dietary_allergy_alerts',
]

const ARCHETYPE_WIDGETS: Record<ArchetypeId, DashboardWidgetId[]> = {
  'private-chef': ['response_time', 'pending_followups', 'payments_due', 'revenue_goal'],
  caterer: ['response_time', 'payments_due', 'revenue_goal', 'quick_expense'],
  'meal-prep': ['payments_due', 'revenue_goal'],
  restaurant: ['quick_expense', 'revenue_goal'],
  'food-truck': ['quick_expense'],
  bakery: ['response_time', 'payments_due', 'revenue_goal'],
}

const PREP_HOURS: Record<ArchetypeId, number> = {
  'private-chef': 3.0,
  caterer: 4.0,
  'meal-prep': 3.0,
  restaurant: 2.0,
  'food-truck': 2.0,
  bakery: 2.0,
}

const BUFFER_MINUTES: Record<ArchetypeId, number> = {
  'private-chef': 30,
  caterer: 45,
  'meal-prep': 30,
  restaurant: 15,
  'food-truck': 15,
  bakery: 30,
}

const MARGIN_PERCENT: Record<MaturityId, number> = {
  new: 50,
  established: 60,
  transitioning: 55,
}

const REMY_ARCHETYPE_MAP: Record<ArchetypeId, Record<MaturityId, string>> = {
  'private-chef': { new: 'mentor', established: 'veteran', transitioning: 'mentor' },
  caterer: { new: 'mentor', established: 'veteran', transitioning: 'mentor' },
  'meal-prep': { new: 'zen', established: 'numbers', transitioning: 'mentor' },
  restaurant: { new: 'mentor', established: 'numbers', transitioning: 'mentor' },
  'food-truck': { new: 'hype', established: 'veteran', transitioning: 'mentor' },
  bakery: { new: 'zen', established: 'veteran', transitioning: 'mentor' },
}

const STARTER_TEMPLATES: Record<
  ArchetypeId,
  { name: string; occasion: string; service_style: string; guest_count: number } | null
> = {
  'private-chef': {
    name: 'Dinner Party',
    occasion: 'dinner_party',
    service_style: 'plated',
    guest_count: 6,
  },
  caterer: {
    name: 'Corporate Lunch',
    occasion: 'corporate',
    service_style: 'buffet',
    guest_count: 30,
  },
  'meal-prep': {
    name: 'Weekly Meal Prep',
    occasion: 'meal_prep',
    service_style: 'delivery',
    guest_count: 1,
  },
  restaurant: null, // restaurants don't use event templates
  'food-truck': {
    name: 'Pop-Up Event',
    occasion: 'pop_up',
    service_style: 'counter',
    guest_count: 50,
  },
  bakery: {
    name: 'Custom Order',
    occasion: 'custom_order',
    service_style: 'pickup',
    guest_count: 1,
  },
}

const DEPOSIT_PCT: Record<ArchetypeId, number> = {
  'private-chef': 50,
  caterer: 50,
  'meal-prep': 100,
  restaurant: 50,
  'food-truck': 50,
  bakery: 50,
}

const BALANCE_DUE_HOURS: Record<ArchetypeId, number> = {
  'private-chef': 24,
  caterer: 24,
  'meal-prep': 0,
  restaurant: 24,
  'food-truck': 24,
  bakery: 24,
}

// ─── Resolve (Pure Function) ─────────────────────────────────────────────────

/**
 * Deterministic transformation: 5 inputs -> SystemConfiguration.
 * No DB access, no side effects. Fully testable.
 */
export function resolveConfiguration(inputs: ConfigurationInputs): SystemConfiguration {
  const { archetype, scale, maturity, acquisition, integrations } = inputs

  // Import archetype presets
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getArchetype } = require('@/lib/archetypes/presets')
  const preset = getArchetype(archetype)
  if (!preset) throw new Error(`Unknown archetype: ${archetype}`)

  // Dashboard widgets: base + archetype-specific, all others disabled
  const enabledWidgetIds = new Set<DashboardWidgetId>([
    ...BASE_WIDGETS,
    ...(ARCHETYPE_WIDGETS[archetype] || []),
  ])

  // Import all widget IDs to build full preference array
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DASHBOARD_WIDGET_IDS } = require('@/lib/scheduling/types')
  const dashboardWidgets = (DASHBOARD_WIDGET_IDS as readonly DashboardWidgetId[]).map((id) => ({
    id,
    enabled: enabledWidgetIds.has(id),
  }))

  // Shopping time: solo takes longer
  const shoppingMinutes = scale === 'solo' ? 60 : 45

  // Pricing defaults only for new businesses
  const pricing =
    maturity === 'new'
      ? {
          deposit_percentage: DEPOSIT_PCT[archetype],
          balance_due_hours: BALANCE_DUE_HOURS[archetype],
        }
      : null

  // Starter template only for new businesses
  const starterTemplate = maturity === 'new' ? STARTER_TEMPLATES[archetype] : null

  // Remy personality
  const remyArchetype = REMY_ARCHETYPE_MAP[archetype][maturity]

  // UI hints (not persisted, used by wizard flow)
  const emphasizeImport = maturity === 'established' || maturity === 'transitioning'
  const emphasizeGmail = integrations === 'gmail'
  const emphasizeCsv = integrations === 'spreadsheets'
  const showStaffTools = scale !== 'solo'

  return {
    archetype,
    enabled_modules: preset.enabledModules,
    primary_nav_hrefs: preset.primaryNavHrefs,
    mobile_tab_hrefs: preset.mobileTabHrefs,
    dashboard_widgets: dashboardWidgets,
    default_prep_hours: PREP_HOURS[archetype],
    default_buffer_minutes: BUFFER_MINUTES[archetype],
    default_shopping_minutes: shoppingMinutes,
    target_margin_percent: MARGIN_PERCENT[maturity],
    focus_mode: maturity === 'new',

    pricing,
    remy_archetype: remyArchetype,
    remy_enabled: true,

    starter_template: starterTemplate,

    hints: {
      emphasize_import: emphasizeImport,
      emphasize_gmail: emphasizeGmail,
      emphasize_csv: emphasizeCsv,
      show_staff_tools: showStaffTools,
    },
  }
}
