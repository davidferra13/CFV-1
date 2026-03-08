// Dashboard Templates - Pre-built widget layouts for "My Dashboard"
// Each template is a curated set of widgets for a specific use case.
// Templates are shown in the empty state so chefs get a populated
// dashboard with one click instead of building from scratch.

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  icon: string
  widgets: string[]
  // If tied to an archetype, shown first when chef matches
  archetype?: string
}

// ============================================
// ARCHETYPE-BASED TEMPLATES
// These map 1:1 to the 6 chef archetypes.
// When a chef's archetype matches, that template
// is highlighted as "Recommended for you."
// ============================================

const privateChefTemplate: DashboardTemplate = {
  id: 'private-chef',
  name: 'Private Chef',
  description: 'Client relationships, scheduling, and financials at a glance',
  icon: '\u{1F373}',
  archetype: 'private-chef',
  widgets: [
    'business_snapshot',
    'todays_schedule',
    'payments_due',
    'pending_followups',
    'cooling_alerts',
    'expiring_quotes',
    'response_time',
    'invoice_pulse',
    'stuck_events',
    'dietary_allergy_alerts',
    'client_birthdays',
  ],
}

const catererTemplate: DashboardTemplate = {
  id: 'caterer',
  name: 'Caterer',
  description: 'Event pipeline, staff coordination, and payment tracking',
  icon: '\u{1F3AA}',
  archetype: 'caterer',
  widgets: [
    'business_snapshot',
    'todays_schedule',
    'payments_due',
    'stuck_events',
    'expiring_quotes',
    'pending_followups',
    'invoice_pulse',
    'response_time',
    'pipeline_forecast',
    'staff_operations',
    'multi_event_days',
  ],
}

const mealPrepTemplate: DashboardTemplate = {
  id: 'meal-prep',
  name: 'Meal Prep',
  description: 'Recurring clients, prep schedules, and weekly batches',
  icon: '\u{1F4E6}',
  archetype: 'meal-prep',
  widgets: [
    'business_snapshot',
    'todays_schedule',
    'dop_tasks',
    'prep_prompts',
    'active_shopping_list',
    'payments_due',
    'cooling_alerts',
    'dietary_allergy_alerts',
    'invoice_pulse',
    'quick_expense',
  ],
}

const restaurantTemplate: DashboardTemplate = {
  id: 'restaurant',
  name: 'Restaurant',
  description: 'Daily service, staff ops, and revenue tracking',
  icon: '\u{1F3EA}',
  archetype: 'restaurant',
  widgets: [
    'business_snapshot',
    'todays_schedule',
    'payments_due',
    'invoice_pulse',
    'staff_operations',
    'food_cost_trend',
    'quick_expense',
    'revenue_goal',
    'stuck_events',
    'live_inbox',
  ],
}

const foodTruckTemplate: DashboardTemplate = {
  id: 'food-truck',
  name: 'Food Truck',
  description: 'Locations, prep, and daily revenue',
  icon: '\u{1F69A}',
  archetype: 'food-truck',
  widgets: [
    'business_snapshot',
    'todays_schedule',
    'dop_tasks',
    'prep_prompts',
    'quick_expense',
    'payments_due',
    'invoice_pulse',
    'food_cost_trend',
    'active_shopping_list',
    'revenue_goal',
  ],
}

const bakeryTemplate: DashboardTemplate = {
  id: 'bakery',
  name: 'Bakery / Pastry',
  description: 'Orders, recipes, clients, and production schedules',
  icon: '\u{1F9C1}',
  archetype: 'bakery',
  widgets: [
    'business_snapshot',
    'todays_schedule',
    'payments_due',
    'pending_followups',
    'dop_tasks',
    'prep_prompts',
    'expiring_quotes',
    'invoice_pulse',
    'cooling_alerts',
    'active_shopping_list',
  ],
}

// ============================================
// USE-CASE TEMPLATES
// Generic templates not tied to archetypes.
// Available to everyone regardless of role.
// ============================================

const financialFocusTemplate: DashboardTemplate = {
  id: 'financial-focus',
  name: 'Financial Focus',
  description: 'Revenue, expenses, payments, and collection rates',
  icon: '\u{1F4B0}',
  widgets: [
    'business_snapshot',
    'payments_due',
    'invoice_pulse',
    'expiring_quotes',
    'revenue_goal',
    'food_cost_trend',
    'quick_expense',
    'revenue_comparison',
    'pipeline_forecast',
    'overdue_installments',
  ],
}

const clientFirstTemplate: DashboardTemplate = {
  id: 'client-first',
  name: 'Client First',
  description: 'Relationships, follow-ups, and client health',
  icon: '\u{1F465}',
  widgets: [
    'pending_followups',
    'cooling_alerts',
    'response_time',
    'dietary_allergy_alerts',
    'client_birthdays',
    'unread_hub_messages',
    'stuck_events',
    'loyalty_approaching',
    'dormant_clients_list',
    'live_inbox',
  ],
}

const opsCommandTemplate: DashboardTemplate = {
  id: 'ops-command',
  name: 'Ops Command Center',
  description: 'Everything operational: schedule, prep, tasks, shopping',
  icon: '\u{1F527}',
  widgets: [
    'todays_schedule',
    'dop_tasks',
    'prep_prompts',
    'active_shopping_list',
    'shopping_window',
    'quick_availability',
    'stuck_events',
    'multi_event_days',
    'dietary_allergy_alerts',
    'scheduling_gaps',
  ],
}

const minimalTemplate: DashboardTemplate = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Just the essentials: revenue, schedule, and payments',
  icon: '\u2728',
  widgets: [
    'business_snapshot',
    'todays_schedule',
    'payments_due',
    'response_time',
    'invoice_pulse',
  ],
}

// ============================================
// EXPORTS
// ============================================

// All archetype templates
export const ARCHETYPE_TEMPLATES: DashboardTemplate[] = [
  privateChefTemplate,
  catererTemplate,
  mealPrepTemplate,
  restaurantTemplate,
  foodTruckTemplate,
  bakeryTemplate,
]

// All use-case templates
export const USECASE_TEMPLATES: DashboardTemplate[] = [
  financialFocusTemplate,
  clientFirstTemplate,
  opsCommandTemplate,
  minimalTemplate,
]

// All templates combined
export const ALL_TEMPLATES: DashboardTemplate[] = [...ARCHETYPE_TEMPLATES, ...USECASE_TEMPLATES]

/**
 * Get templates sorted so the chef's archetype match is first.
 * Returns archetype templates first (with match highlighted),
 * then use-case templates.
 */
export function getTemplatesForChef(chefArchetype: string | null): {
  recommended: DashboardTemplate | null
  templates: DashboardTemplate[]
} {
  const recommended = chefArchetype
    ? (ARCHETYPE_TEMPLATES.find((t) => t.archetype === chefArchetype) ?? null)
    : null

  // Put recommended first, then other archetypes, then use-cases
  const others = ALL_TEMPLATES.filter((t) => t.id !== recommended?.id)

  return {
    recommended,
    templates: recommended ? [recommended, ...others] : ALL_TEMPLATES,
  }
}
