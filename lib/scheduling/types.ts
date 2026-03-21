// Scheduling Engine - Type Definitions
// Pure types for timeline generation, DOPs, and prep prompts.

// ============================================
// CHEF PREFERENCES
// ============================================

export interface DefaultStore {
  name: string
  address: string
  place_id?: string | null
}

export const DASHBOARD_WIDGET_IDS = [
  'system_nerve_center',
  'onboarding_accelerator',
  'todays_schedule',
  'daily_plan',
  'next_action',
  'week_strip',
  'dop_tasks',
  'priority_queue',
  'prep_prompts',
  'scheduling_gaps',
  'response_time',
  'pending_followups',
  'holiday_outreach',
  'onboarding_checklist',
  'upcoming_calls',
  'collaboration_invites',
  'recipe_shares',
  'collaborating_on',
  'recipe_debt',
  'invite_chef',
  'service_quality',
  'business_snapshot',
  'commerce_hub',
  'inventory_health',
  'vendor_costs',
  'payments_health',
  'staff_operations',
  'marketing_pipeline',
  'contracts_collections',
  'analytics_pulse',
  'goals_tracker',
  'operations_readiness',
  'recipe_menu_engine',
  'lead_funnel_live',
  'network_collab_growth',
  'safety_risk_watch',
  'travel_logistics',
  'inbox_command_center',
  'notifications_center',
  'reviews_reputation',
  'documents_compliance',
  'client_growth_signals',
  'survey_testimonial_feed',
  'partners_referrals',
  'stations_ops_status',
  'payments_finance_detail',
  'reports_snapshot',
  'task_automation',
  'cannabis_control_center',
  'charity_impact',
  'community_commands',
  'guest_ops',
  'receipts_reconciliation',
  'social_planner',
  'wix_intake_health',
  'imports_sync_health',
  'remy_status',
  'takeachef_command_center',
  'wellbeing',
  'concentration_risk',
  'business_health',
  'insurance_health',
  'business_insights',
  'career_growth',
  'hours',
  'activity',
  'todo_list',
  'intelligence_hub',
  'stuck_events',
  'next_best_actions',
  'cooling_alerts',
  'active_clients_now',
  'work_surface',
  'prospecting_hub',
  'beta_program',
  'revenue_comparison',
  'payments_due',
  'expiring_quotes',
  'dietary_allergy_alerts',
  'client_birthdays',
  'shopping_window',
  'unread_hub_messages',
  'top_events_profit',
  'pipeline_forecast',
  'multi_event_days',
  'aar_performance',
  'avg_hourly_rate',
  'payout_summary',
  'revenue_goal',
  'loyalty_approaching',
  'food_cost_trend',
  'booking_seasonality',
  'yoy_comparison',
  'overdue_installments',
  'dormant_clients_list',
  'live_inbox',
  'active_shopping_list',
  'quick_expense',
  'quick_availability',
  'invoice_pulse',
  'recipe_capture',
  'client_lookup',
  'smart_hours',
  'inline_aar',
  'quick_create',
] as const

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number]

export interface DashboardWidgetPreference {
  id: DashboardWidgetId
  enabled: boolean
}

// ============================================
// WIDGET CATEGORIES & METADATA
// ============================================

export type WidgetCategory =
  | 'today'
  | 'actions'
  | 'prep'
  | 'money'
  | 'clients'
  | 'analytics'
  | 'collaboration'
  | 'system'

export type WidgetSize = 'sm' | 'lg'

export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, string> = {
  today: 'Today & This Week',
  actions: 'Action Items',
  prep: 'Schedule & Prep',
  money: 'Money & Payments',
  clients: 'Clients & Relationships',
  analytics: 'Analytics & Intelligence',
  collaboration: 'Collaboration & Growth',
  system: 'System & Setup',
}

export const WIDGET_CATEGORY_ORDER: WidgetCategory[] = [
  'today',
  'actions',
  'prep',
  'money',
  'clients',
  'analytics',
  'collaboration',
  'system',
]

export interface WidgetMeta {
  category: WidgetCategory
  size: WidgetSize
  defaultEnabled: boolean
}

export const DASHBOARD_WIDGET_META: Record<DashboardWidgetId, WidgetMeta> = {
  // Today & This Week
  // Starter defaults: 10 essential widgets that answer "What do I need to do right now?"
  // Power users can enable all 105 widgets via Settings > Dashboard.
  todays_schedule: { category: 'today', size: 'lg', defaultEnabled: true },
  daily_plan: { category: 'today', size: 'lg', defaultEnabled: false },
  next_action: { category: 'today', size: 'sm', defaultEnabled: false },
  week_strip: { category: 'today', size: 'lg', defaultEnabled: true },
  quick_create: { category: 'today', size: 'lg', defaultEnabled: false },
  client_lookup: { category: 'today', size: 'lg', defaultEnabled: false },

  // Action Items
  priority_queue: { category: 'actions', size: 'lg', defaultEnabled: true },
  scheduling_gaps: { category: 'actions', size: 'lg', defaultEnabled: false },
  response_time: { category: 'actions', size: 'sm', defaultEnabled: true },
  pending_followups: { category: 'actions', size: 'sm', defaultEnabled: true },
  stuck_events: { category: 'actions', size: 'sm', defaultEnabled: false },
  next_best_actions: { category: 'actions', size: 'sm', defaultEnabled: false },
  live_inbox: { category: 'actions', size: 'lg', defaultEnabled: false },
  upcoming_calls: { category: 'actions', size: 'sm', defaultEnabled: false },

  // Schedule & Prep
  dop_tasks: { category: 'prep', size: 'lg', defaultEnabled: false },
  prep_prompts: { category: 'prep', size: 'lg', defaultEnabled: false },
  shopping_window: { category: 'prep', size: 'sm', defaultEnabled: false },
  active_shopping_list: { category: 'prep', size: 'sm', defaultEnabled: false },
  quick_availability: { category: 'prep', size: 'sm', defaultEnabled: false },
  multi_event_days: { category: 'prep', size: 'sm', defaultEnabled: false },

  // Money & Payments
  payments_due: { category: 'money', size: 'sm', defaultEnabled: true },
  expiring_quotes: { category: 'money', size: 'sm', defaultEnabled: false },
  quick_expense: { category: 'money', size: 'sm', defaultEnabled: true },
  invoice_pulse: { category: 'money', size: 'sm', defaultEnabled: false },
  overdue_installments: { category: 'money', size: 'sm', defaultEnabled: false },
  revenue_comparison: { category: 'money', size: 'sm', defaultEnabled: false },
  revenue_goal: { category: 'money', size: 'sm', defaultEnabled: true },
  pipeline_forecast: { category: 'money', size: 'sm', defaultEnabled: false },
  payout_summary: { category: 'money', size: 'sm', defaultEnabled: false },
  avg_hourly_rate: { category: 'money', size: 'sm', defaultEnabled: false },
  top_events_profit: { category: 'money', size: 'sm', defaultEnabled: false },
  food_cost_trend: { category: 'money', size: 'sm', defaultEnabled: false },
  yoy_comparison: { category: 'money', size: 'sm', defaultEnabled: false },
  booking_seasonality: { category: 'money', size: 'sm', defaultEnabled: false },
  inline_aar: { category: 'money', size: 'lg', defaultEnabled: false },
  business_snapshot: { category: 'money', size: 'sm', defaultEnabled: false },
  commerce_hub: { category: 'money', size: 'sm', defaultEnabled: false },
  payments_health: { category: 'money', size: 'sm', defaultEnabled: false },
  payments_finance_detail: { category: 'money', size: 'sm', defaultEnabled: false },
  contracts_collections: { category: 'money', size: 'sm', defaultEnabled: false },
  receipts_reconciliation: { category: 'money', size: 'sm', defaultEnabled: false },

  // Clients & Relationships
  dietary_allergy_alerts: { category: 'clients', size: 'sm', defaultEnabled: true },
  cooling_alerts: { category: 'clients', size: 'sm', defaultEnabled: false },
  client_birthdays: { category: 'clients', size: 'sm', defaultEnabled: false },
  unread_hub_messages: { category: 'clients', size: 'sm', defaultEnabled: false },
  loyalty_approaching: { category: 'clients', size: 'sm', defaultEnabled: false },
  dormant_clients_list: { category: 'clients', size: 'sm', defaultEnabled: false },
  active_clients_now: { category: 'clients', size: 'sm', defaultEnabled: false },
  holiday_outreach: { category: 'clients', size: 'sm', defaultEnabled: false },
  client_growth_signals: { category: 'clients', size: 'sm', defaultEnabled: false },
  guest_ops: { category: 'clients', size: 'sm', defaultEnabled: false },

  // Analytics & Intelligence
  business_health: { category: 'analytics', size: 'lg', defaultEnabled: true },
  work_surface: { category: 'analytics', size: 'lg', defaultEnabled: false },
  business_insights: { category: 'analytics', size: 'sm', defaultEnabled: false },
  concentration_risk: { category: 'analytics', size: 'sm', defaultEnabled: false },
  insurance_health: { category: 'analytics', size: 'sm', defaultEnabled: false },
  aar_performance: { category: 'analytics', size: 'sm', defaultEnabled: false },
  service_quality: { category: 'analytics', size: 'lg', defaultEnabled: false },
  analytics_pulse: { category: 'analytics', size: 'sm', defaultEnabled: false },
  goals_tracker: { category: 'analytics', size: 'sm', defaultEnabled: false },
  operations_readiness: { category: 'analytics', size: 'sm', defaultEnabled: false },
  safety_risk_watch: { category: 'analytics', size: 'sm', defaultEnabled: false },
  reviews_reputation: { category: 'analytics', size: 'sm', defaultEnabled: false },
  reports_snapshot: { category: 'analytics', size: 'sm', defaultEnabled: false },
  survey_testimonial_feed: { category: 'analytics', size: 'sm', defaultEnabled: false },
  intelligence_hub: { category: 'analytics', size: 'sm', defaultEnabled: false },
  wellbeing: { category: 'analytics', size: 'sm', defaultEnabled: false },

  // Collaboration & Growth
  collaboration_invites: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  recipe_shares: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  collaborating_on: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  invite_chef: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  recipe_debt: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  recipe_capture: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  network_collab_growth: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  partners_referrals: { category: 'collaboration', size: 'sm', defaultEnabled: false },
  community_commands: { category: 'collaboration', size: 'sm', defaultEnabled: false },

  // System & Setup
  system_nerve_center: { category: 'system', size: 'lg', defaultEnabled: false },
  onboarding_accelerator: { category: 'system', size: 'lg', defaultEnabled: false },
  onboarding_checklist: { category: 'system', size: 'sm', defaultEnabled: false },
  smart_hours: { category: 'system', size: 'sm', defaultEnabled: false },
  hours: { category: 'system', size: 'sm', defaultEnabled: false },
  activity: { category: 'system', size: 'lg', defaultEnabled: false },
  todo_list: { category: 'system', size: 'sm', defaultEnabled: false },
  career_growth: { category: 'system', size: 'sm', defaultEnabled: false },
  beta_program: { category: 'system', size: 'sm', defaultEnabled: false },
  prospecting_hub: { category: 'system', size: 'sm', defaultEnabled: false },
  remy_status: { category: 'system', size: 'sm', defaultEnabled: false },
  takeachef_command_center: { category: 'system', size: 'sm', defaultEnabled: false },
  inbox_command_center: { category: 'system', size: 'sm', defaultEnabled: false },
  notifications_center: { category: 'system', size: 'sm', defaultEnabled: false },
  documents_compliance: { category: 'system', size: 'sm', defaultEnabled: false },
  task_automation: { category: 'system', size: 'sm', defaultEnabled: false },
  cannabis_control_center: { category: 'system', size: 'sm', defaultEnabled: false },
  charity_impact: { category: 'system', size: 'sm', defaultEnabled: false },
  social_planner: { category: 'system', size: 'sm', defaultEnabled: false },
  wix_intake_health: { category: 'system', size: 'sm', defaultEnabled: false },
  imports_sync_health: { category: 'system', size: 'sm', defaultEnabled: false },
  recipe_menu_engine: { category: 'system', size: 'sm', defaultEnabled: false },
  lead_funnel_live: { category: 'system', size: 'sm', defaultEnabled: false },
  travel_logistics: { category: 'system', size: 'sm', defaultEnabled: false },
  stations_ops_status: { category: 'system', size: 'sm', defaultEnabled: false },
  staff_operations: { category: 'system', size: 'sm', defaultEnabled: false },
  marketing_pipeline: { category: 'system', size: 'sm', defaultEnabled: false },
  inventory_health: { category: 'system', size: 'sm', defaultEnabled: false },
  vendor_costs: { category: 'system', size: 'sm', defaultEnabled: false },
}

// ============================================
// WIDGET VISUAL STYLES (icons, category colors)
// ============================================

export interface CategoryStyle {
  border: string
  bg: string
  bgExpanded: string
  icon: string
}

export const WIDGET_CATEGORY_STYLES: Record<WidgetCategory, CategoryStyle> = {
  today: {
    border: '#3b82f6',
    bg: 'rgba(59,130,246,0.07)',
    bgExpanded: 'linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u{1F4C5}',
  },
  actions: {
    border: '#f59e0b',
    bg: 'rgba(245,158,11,0.07)',
    bgExpanded: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u26A1',
  },
  prep: {
    border: '#10b981',
    bg: 'rgba(16,185,129,0.07)',
    bgExpanded: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u{1F52A}',
  },
  money: {
    border: '#22c55e',
    bg: 'rgba(34,197,94,0.07)',
    bgExpanded: 'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u{1F4B0}',
  },
  clients: {
    border: '#a855f7',
    bg: 'rgba(168,85,247,0.07)',
    bgExpanded: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u{1F465}',
  },
  analytics: {
    border: '#06b6d4',
    bg: 'rgba(6,182,212,0.07)',
    bgExpanded: 'linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u{1F4CA}',
  },
  collaboration: {
    border: '#f43f5e',
    bg: 'rgba(244,63,94,0.07)',
    bgExpanded: 'linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u{1F91D}',
  },
  system: {
    border: '#78716c',
    bg: 'rgba(120,113,108,0.06)',
    bgExpanded: 'linear-gradient(135deg, rgba(120,113,108,0.08) 0%, rgba(28,25,23,0.5) 100%)',
    icon: '\u2699\uFE0F',
  },
}

export const WIDGET_ICONS: Partial<Record<DashboardWidgetId, string>> = {
  todays_schedule: '\u{1F4C5}',
  daily_plan: '\u{1F4CB}',
  next_action: '\u{1F3AF}',
  week_strip: '\u{1F4C6}',
  quick_create: '\u2728',
  client_lookup: '\u{1F50D}',
  priority_queue: '\u{1F4E5}',
  scheduling_gaps: '\u26A0\uFE0F',
  response_time: '\u23F1\uFE0F',
  pending_followups: '\u{1F4E9}',
  stuck_events: '\u{1F6A7}',
  next_best_actions: '\u{1F4A1}',
  live_inbox: '\u{1F4EC}',
  upcoming_calls: '\u{1F4DE}',
  dop_tasks: '\u2705',
  prep_prompts: '\u{1F52A}',
  shopping_window: '\u{1F6D2}',
  active_shopping_list: '\u{1F4DD}',
  quick_availability: '\u{1F4C5}',
  payments_due: '\u{1F4B3}',
  expiring_quotes: '\u231B',
  quick_expense: '\u{1F9FE}',
  invoice_pulse: '\u{1F4CA}',
  revenue_goal: '\u{1F3AF}',
  system_nerve_center: '\u{1F9E0}',
  onboarding_accelerator: '\u{1F680}',
  onboarding_checklist: '\u2705',
  service_quality: '\u2B50',
  business_snapshot: '\u{1F4F8}',
  career_growth: '\u{1F4C8}',
  hours: '\u{1F550}',
  activity: '\u{1F4E1}',
  business_health: '\u{1F4AA}',
  work_surface: '\u{1F527}',
  business_insights: '\u{1F9E0}',
  concentration_risk: '\u2696\uFE0F',
  insurance_health: '\u{1F6E1}\uFE0F',
  holiday_outreach: '\u{1F384}',
  recipe_debt: '\u{1F4D5}',
  recipe_capture: '\u{1F4F8}',
  invite_chef: '\u{1F468}\u200D\u{1F373}',
  collaboration_invites: '\u{1F48C}',
  recipe_shares: '\u{1F4E4}',
  collaborating_on: '\u{1F91D}',
  commerce_hub: '\u{1F3EA}',
  inventory_health: '\u{1F4E6}',
  vendor_costs: '\u{1F3F7}\uFE0F',
  payments_health: '\u{1F49A}',
  staff_operations: '\u{1F477}',
  marketing_pipeline: '\u{1F4E3}',
  contracts_collections: '\u{1F4C4}',
  analytics_pulse: '\u{1F4C8}',
  goals_tracker: '\u{1F3AF}',
  operations_readiness: '\u{1F527}',
  recipe_menu_engine: '\u{1F37D}\uFE0F',
  lead_funnel_live: '\u{1F525}',
  cooling_alerts: '\u2744\uFE0F',
  dietary_allergy_alerts: '\u{1F95C}',
  client_birthdays: '\u{1F382}',
  unread_hub_messages: '\u{1F4AC}',
  todo_list: '\u{1F4CB}',
  wellbeing: '\u{1F9D8}',
  inline_aar: '\u{1F4DD}',
  pipeline_forecast: '\u{1F4C8}',
  revenue_comparison: '\u{1F4CA}',
  smart_hours: '\u23F0',
  beta_program: '\u{1F9EA}',
  prospecting_hub: '\u{1F50E}',
  inbox_command_center: '\u{1F4E8}',
  notifications_center: '\u{1F514}',
  remy_status: '\u{1F916}',
  multi_event_days: '\u{1F4C6}',
  aar_performance: '\u{1F4DD}',
  avg_hourly_rate: '\u{1F4B2}',
  payout_summary: '\u{1F4B5}',
  overdue_installments: '\u{1F6A8}',
  dormant_clients_list: '\u{1F4A4}',
  food_cost_trend: '\u{1F4C9}',
  booking_seasonality: '\u{1F326}\uFE0F',
  yoy_comparison: '\u{1F4CA}',
  loyalty_approaching: '\u{1F31F}',
  top_events_profit: '\u{1F3C6}',
  takeachef_command_center: '\u{1F468}\u200D\u{1F373}',
  cannabis_control_center: '\u{1F33F}',
  charity_impact: '\u{1F49C}',
  community_commands: '\u{1F310}',
  guest_ops: '\u{1F3E0}',
  receipts_reconciliation: '\u{1F9FE}',
  social_planner: '\u{1F4F1}',
  wix_intake_health: '\u{1F310}',
  imports_sync_health: '\u{1F504}',
  documents_compliance: '\u{1F4C2}',
  safety_risk_watch: '\u{1F6E1}\uFE0F',
  travel_logistics: '\u2708\uFE0F',
  network_collab_growth: '\u{1F310}',
  partners_referrals: '\u{1F91D}',
  stations_ops_status: '\u{1F3ED}',
  payments_finance_detail: '\u{1F4B3}',
  reports_snapshot: '\u{1F4CA}',
  task_automation: '\u{1F916}',
  survey_testimonial_feed: '\u{1F4AC}',
  reviews_reputation: '\u2B50',
  client_growth_signals: '\u{1F4C8}',
  active_clients_now: '\u{1F7E2}',
}

/** Get icon for a specific widget (falls back to category icon) */
export function getWidgetIcon(widgetId: string): string {
  const specific = WIDGET_ICONS[widgetId as DashboardWidgetId]
  if (specific) return specific
  const meta = DASHBOARD_WIDGET_META[widgetId as DashboardWidgetId]
  return meta ? WIDGET_CATEGORY_STYLES[meta.category].icon : '\u{1F4CC}'
}

/** Get category visual style for a widget */
export function getWidgetCategoryStyle(widgetId: string): CategoryStyle {
  const meta = DASHBOARD_WIDGET_META[widgetId as DashboardWidgetId]
  return meta
    ? WIDGET_CATEGORY_STYLES[meta.category]
    : {
        border: '#78716c',
        bg: 'rgba(120,113,108,0.06)',
        bgExpanded: 'rgba(120,113,108,0.06)',
        icon: '\u{1F4CC}',
      }
}

/** CSS class for a widget's grid column span */
export function widgetGridClass(widgetId: DashboardWidgetId): string {
  const meta = DASHBOARD_WIDGET_META[widgetId]
  return meta?.size === 'lg' ? 'col-span-1 md:col-span-2' : 'col-span-1'
}

/** Group widget IDs by category (preserves order within each category) */
export function groupWidgetsByCategory(
  widgets: DashboardWidgetPreference[]
): { category: WidgetCategory; label: string; widgets: DashboardWidgetPreference[] }[] {
  const groups: Record<WidgetCategory, DashboardWidgetPreference[]> = {
    today: [],
    actions: [],
    prep: [],
    money: [],
    clients: [],
    analytics: [],
    collaboration: [],
    system: [],
  }
  for (const w of widgets) {
    const meta = DASHBOARD_WIDGET_META[w.id]
    if (meta) groups[meta.category].push(w)
  }
  return WIDGET_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: WIDGET_CATEGORY_LABELS[cat],
    widgets: groups[cat],
  })).filter((g) => g.widgets.length > 0)
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetPreference[] = DASHBOARD_WIDGET_IDS.map(
  (id) => ({
    id,
    enabled: DASHBOARD_WIDGET_META[id]?.defaultEnabled ?? false,
  })
)

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  system_nerve_center: 'System Health',
  onboarding_accelerator: 'Onboarding Accelerator',
  todays_schedule: "Today's Schedule",
  daily_plan: 'Daily Plan',
  next_action: 'Next Action',
  week_strip: 'Week at a Glance',
  dop_tasks: 'DOP Tasks',
  priority_queue: 'Priority Queue',
  prep_prompts: 'Preparation Prompts',
  scheduling_gaps: 'Scheduling Gaps',
  response_time: 'Response Time',
  pending_followups: 'Pending Follow-Ups',
  holiday_outreach: 'Holiday Outreach',
  onboarding_checklist: 'Onboarding Checklist',
  upcoming_calls: 'Upcoming Calls',
  collaboration_invites: 'Collaboration Invitations',
  recipe_shares: 'Recipe Shares',
  collaborating_on: 'Collaborating On',
  recipe_debt: 'Recipe Debt',
  invite_chef: 'Invite a Chef',
  service_quality: 'Service Quality',
  business_snapshot: 'Business Snapshot',
  commerce_hub: 'Commerce Hub',
  inventory_health: 'Inventory Health',
  vendor_costs: 'Vendor Costs',
  payments_health: 'Payments Health',
  staff_operations: 'Staff Operations',
  marketing_pipeline: 'Marketing Pipeline',
  contracts_collections: 'Contracts & Collections',
  analytics_pulse: 'Analytics Pulse',
  goals_tracker: 'Goals Tracker',
  operations_readiness: 'Operations Readiness',
  recipe_menu_engine: 'Recipe & Menu Engine',
  lead_funnel_live: 'Lead Funnel Live',
  network_collab_growth: 'Network & Collab Growth',
  safety_risk_watch: 'Safety Risk Watch',
  travel_logistics: 'Travel Logistics',
  inbox_command_center: 'Inbox Command Center',
  notifications_center: 'Notification Center',
  reviews_reputation: 'Reviews & Reputation',
  documents_compliance: 'Documents & Compliance',
  client_growth_signals: 'Client Growth Signals',
  survey_testimonial_feed: 'Survey & Testimonial Feed',
  partners_referrals: 'Partners & Referrals',
  stations_ops_status: 'Stations Ops Status',
  payments_finance_detail: 'Payments & Finance Detail',
  reports_snapshot: 'Reports Snapshot',
  task_automation: 'Task & Automation',
  cannabis_control_center: 'Cannabis Control Center',
  charity_impact: 'Charity Impact',
  community_commands: 'Community & Commands',
  guest_ops: 'Guest Operations',
  receipts_reconciliation: 'Receipts Reconciliation',
  social_planner: 'Social Planner',
  wix_intake_health: 'Wix Intake Health',
  imports_sync_health: 'Imports & Sync Health',
  remy_status: 'Remy Status',
  takeachef_command_center: 'TakeAChef Command Center',
  wellbeing: 'Wellbeing',
  concentration_risk: 'Revenue Concentration',
  business_health: 'Business Health',
  insurance_health: 'Insurance Health',
  business_insights: 'Business Insights',
  career_growth: 'Career Growth',
  hours: 'Hours',
  activity: 'Activity',
  todo_list: 'To Do List',
  intelligence_hub: 'Intelligence Hub',
  stuck_events: 'Stuck Events',
  next_best_actions: 'Client Actions',
  cooling_alerts: 'Cooling Relationships',
  active_clients_now: 'Active Clients Now',
  work_surface: 'Work Surface',
  prospecting_hub: 'Prospecting',
  beta_program: 'Beta Program',
  revenue_comparison: 'Revenue This Month',
  payments_due: 'Payments Due',
  expiring_quotes: 'Expiring Quotes',
  dietary_allergy_alerts: 'Dietary & Allergy Alerts',
  client_birthdays: 'Client Birthdays',
  shopping_window: 'Shopping Window',
  unread_hub_messages: 'Hub Messages',
  top_events_profit: 'Top Events by Profit',
  pipeline_forecast: 'Pipeline Forecast',
  multi_event_days: 'Multi-Event Days',
  aar_performance: 'AAR Performance',
  avg_hourly_rate: 'Avg Hourly Rate',
  payout_summary: 'Payout Summary',
  revenue_goal: 'Revenue Goal',
  loyalty_approaching: 'Loyalty Rewards',
  food_cost_trend: 'Food Cost Trend',
  booking_seasonality: 'Booking Seasonality',
  yoy_comparison: 'Year-over-Year',
  overdue_installments: 'Overdue Installments',
  dormant_clients_list: 'Dormant Clients',
  live_inbox: 'Live Inbox',
  active_shopping_list: 'Shopping List',
  quick_expense: 'Quick Expense',
  quick_availability: 'Availability Check',
  invoice_pulse: 'Invoice Pulse',
  recipe_capture: 'Recipe Quick Capture',
  client_lookup: 'Client Quick Lookup',
  smart_hours: 'Smart Hours',
  inline_aar: 'Quick Debrief',
  quick_create: 'Quick Create',
}

// Legacy alias kept for compatibility with older code paths.
export type SpecialtyStore = DefaultStore

// Menu engine feature toggle keys
export const MENU_ENGINE_FEATURE_KEYS = [
  'seasonal_warnings',
  'prep_estimate',
  'client_taste',
  'menu_history',
  'vendor_hints',
  'allergen_validation',
  'stock_alerts',
  'scale_mismatch',
  'inquiry_link',
  'budget_compliance',
  'dietary_conflicts',
  'quadrant_badges',
] as const

export type MenuEngineFeatureKey = (typeof MENU_ENGINE_FEATURE_KEYS)[number]

export interface MenuEngineFeatures {
  seasonal_warnings: boolean
  prep_estimate: boolean
  client_taste: boolean
  menu_history: boolean
  vendor_hints: boolean
  allergen_validation: boolean
  stock_alerts: boolean
  scale_mismatch: boolean
  inquiry_link: boolean
  budget_compliance: boolean
  dietary_conflicts: boolean
  quadrant_badges: boolean
}

export const DEFAULT_MENU_ENGINE_FEATURES: MenuEngineFeatures = {
  seasonal_warnings: true,
  prep_estimate: true,
  client_taste: true,
  menu_history: true,
  vendor_hints: true,
  allergen_validation: true,
  stock_alerts: true,
  scale_mismatch: true,
  inquiry_link: true,
  budget_compliance: true,
  dietary_conflicts: true,
  quadrant_badges: true,
}

/** Human-readable labels for menu engine features */
export const MENU_ENGINE_FEATURE_LABELS: Record<
  MenuEngineFeatureKey,
  { label: string; description: string }
> = {
  seasonal_warnings: {
    label: 'Seasonal Ingredient Warnings',
    description: 'Flags out-of-season ingredients with expected cost impact based on event date.',
  },
  prep_estimate: {
    label: 'Prep Time Estimate',
    description:
      'Shows estimated prep and service hours based on guest count and similar past events.',
  },
  client_taste: {
    label: 'Client Taste Profile',
    description:
      'Surfaces linked client preferences (loved/disliked items, cuisine preferences) in the menu editor.',
  },
  menu_history: {
    label: 'Menu Performance History',
    description:
      'Shows how many times this menu has been used, average margin, and last usage date.',
  },
  vendor_hints: {
    label: 'Vendor Best-Price Hints',
    description:
      'Compares ingredient prices against vendor alternatives and highlights savings over 5%.',
  },
  allergen_validation: {
    label: 'Allergen Conflict Validation',
    description:
      'Cross-checks menu ingredients against the linked client dietary restrictions and allergies.',
  },
  stock_alerts: {
    label: 'Ingredient Stock Alerts',
    description:
      'Checks menu ingredients against current inventory levels and flags low or out-of-stock items.',
  },
  scale_mismatch: {
    label: 'Guest Count Scale Mismatch',
    description: 'Warns when menu guest count differs from the linked event guest count.',
  },
  inquiry_link: {
    label: 'Inquiry Cross-Reference',
    description:
      'Shows a link to the originating inquiry when the menu is connected to one via events.',
  },
  budget_compliance: {
    label: 'Budget Compliance Check',
    description:
      'Compares food cost against the quoted event price and warns when profit margin is too thin.',
  },
  dietary_conflicts: {
    label: 'Active Dietary Conflict Detection',
    description:
      'Cross-checks menu ingredients against client disliked items and flags contradictions.',
  },
  quadrant_badges: {
    label: 'Menu Engineering Badges',
    description:
      'Shows Star/Plowhorse/Puzzle/Dog quadrant classification for each recipe in the menu sidebar.',
  },
}

export interface ChefPreferences {
  id: string
  chef_id: string

  // Home base
  home_address: string | null
  home_city: string | null
  home_state: string | null
  home_zip: string | null

  // Default stores
  default_stores: DefaultStore[]

  // Legacy categorized stores (kept for compatibility).
  default_grocery_store: string | null
  default_grocery_address: string | null
  default_liquor_store: string | null
  default_liquor_address: string | null
  default_specialty_stores: DefaultStore[]

  // Timing defaults
  default_buffer_minutes: number
  default_prep_hours: number
  default_shopping_minutes: number
  default_packing_minutes: number

  // Financial
  target_margin_percent: number
  target_monthly_revenue_cents: number
  target_annual_revenue_cents: number | null
  revenue_goal_program_enabled: boolean
  revenue_goal_nudge_level: 'gentle' | 'standard' | 'aggressive'
  revenue_goal_custom: RevenueGoalCustom[]

  // DOP preferences
  shop_day_before: boolean

  // Dashboard customization
  dashboard_widgets: DashboardWidgetPreference[]

  // Navigation customization (empty = use platform default primary shortcuts)
  primary_nav_hrefs: string[]

  // Menu engine feature toggles (all default true, operators opt out)
  menu_engine_features: MenuEngineFeatures
}

export const DEFAULT_PREFERENCES: Omit<ChefPreferences, 'id' | 'chef_id'> = {
  home_address: null,
  home_city: null,
  home_state: null,
  home_zip: null,
  default_stores: [],
  default_grocery_store: null,
  default_grocery_address: null,
  default_liquor_store: null,
  default_liquor_address: null,
  default_specialty_stores: [],
  default_buffer_minutes: 30,
  default_prep_hours: 3,
  default_shopping_minutes: 60,
  default_packing_minutes: 30,
  target_margin_percent: 60,
  target_monthly_revenue_cents: 1000000,
  target_annual_revenue_cents: null,
  revenue_goal_program_enabled: false,
  revenue_goal_nudge_level: 'gentle',
  revenue_goal_custom: [],
  shop_day_before: true,
  dashboard_widgets: DEFAULT_DASHBOARD_WIDGETS.map((widget) => ({ ...widget })),
  primary_nav_hrefs: [],
  menu_engine_features: { ...DEFAULT_MENU_ENGINE_FEATURES },
}

export interface RevenueGoalCustom {
  id: string
  label: string
  target_cents: number
  period_start: string
  period_end: string
  enabled: boolean
}

// ============================================
// ENRICHED TODAY'S SCHEDULE (Widget Intelligence)
// ============================================

export type EventPhase =
  | 'pre_event'
  | 'shopping'
  | 'prep'
  | 'packing'
  | 'travel'
  | 'service'
  | 'cleanup'
  | 'post_event'

export interface EnrichedTodaySchedule {
  event: SchedulingEvent
  timeline: EventTimeline
  dop: DOPSchedule
  currentPhase: EventPhase
  nextMilestone: { label: string; time: string; minutesUntil: number } | null
  departureTime: string | null
  minutesUntilDeparture: number | null
  clientContext: ClientEventContext | null
  prepGate: PrepGate
  weatherAlerts: WeatherAlert[]
}

export interface ClientEventContext {
  name: string
  dietaryRestrictions: string | null
  allergies: string | null
  pastEventCount: number
  lastEventDate: string | null
  lastOccasion: string | null
}

export interface PrepGate {
  progress: number // 0-1
  total: number
  completed: number
  blockers: { label: string; category: DOPTaskCategory; deadline: string | null }[]
}

export interface WeatherAlert {
  severity: 'info' | 'warning' | 'critical'
  message: string
}

// ============================================
// TIMELINE
// ============================================

export type TimelineItemType =
  | 'wake'
  | 'prep'
  | 'shopping'
  | 'packing'
  | 'departure'
  | 'arrival'
  | 'service'
  | 'milestone'

export interface TimelineItem {
  id: string
  time: string // "HH:MM" format
  label: string
  description: string
  type: TimelineItemType
  isDeadline: boolean // true for arrival, departure
  isFlexible: boolean // true for wake up, false for arrival
}

export interface RouteStop {
  name: string
  address: string
  purpose: string // "Store", "Event location", etc.
  estimatedMinutes: number
}

export interface EventTimeline {
  eventId: string
  eventDate: string
  timeline: TimelineItem[]
  route: {
    stops: RouteStop[]
    totalDriveMinutes: number
  }
  warnings: string[]
}

// ============================================
// DEFAULT OPERATING PROCEDURES
// ============================================

export type DOPTaskCategory = 'documents' | 'shopping' | 'prep' | 'packing' | 'admin' | 'reset'

export interface DOPTask {
  id: string
  label: string
  description: string
  category: DOPTaskCategory
  isComplete: boolean
  completedAt: string | null
  isOverdue: boolean
  deadline: string | null
  dependsOn: string[]
}

export type DOPPhaseStatus = 'complete' | 'pending' | 'overdue' | 'upcoming' | 'not_applicable'

export interface DOPPhase {
  date?: string
  time?: string
  tasks: DOPTask[]
  status: DOPPhaseStatus
}

export interface DOPSchedule {
  eventId: string
  eventDate: string
  leadTimeDays: number
  isCompressed: boolean
  schedule: {
    atBooking: DOPPhase
    dayBefore: DOPPhase
    morningOf: DOPPhase
    preDeparture: DOPPhase
    postService: DOPPhase
  }
  overrides: string[]
}

// ============================================
// PREP PROMPTS
// ============================================

export type PromptUrgency = 'actionable' | 'upcoming' | 'overdue'
export type PromptCategory = 'documents' | 'shopping' | 'prep' | 'packing' | 'admin'

export interface PrepPrompt {
  eventId: string
  eventOccasion: string
  eventDate: string
  clientName: string
  urgency: PromptUrgency
  message: string
  action: string
  actionUrl: string
  daysUntilEvent: number
  category: PromptCategory
}

// ============================================
// SCHEDULING CONTEXT (for engine inputs)
// ============================================

export interface SchedulingEvent {
  id: string
  occasion: string | null
  event_date: string
  serve_time: string
  arrival_time: string | null
  travel_time_minutes: number | null
  guest_count: number
  status: string
  location_address: string | null
  location_city: string | null

  // Readiness flags
  grocery_list_ready: boolean
  prep_list_ready: boolean
  packing_list_ready: boolean
  equipment_list_ready: boolean
  timeline_ready: boolean
  execution_sheet_ready: boolean
  non_negotiables_checked: boolean
  car_packed: boolean

  // Execution timestamps
  shopping_completed_at: string | null
  prep_completed_at: string | null

  // Post-event
  aar_filed: boolean
  reset_complete: boolean
  follow_up_sent: boolean
  financially_closed: boolean

  // Client
  client: {
    full_name: string
  } | null

  // Menu info (component count)
  menuComponentCount?: number
  hasAlcohol?: boolean
}

// ============================================
// WEEKLY VIEW
// ============================================

export type DayType = 'event' | 'prep' | 'admin' | 'free'

export interface WeekDay {
  date: string // ISO date
  dayOfWeek: string // "Monday", etc.
  dayType: DayType
  events: {
    id: string
    occasion: string | null
    clientName: string
    serveTime: string
    guestCount: number
    status: string
    prepStatus: 'ready' | 'partial' | 'not_started'
  }[]
  isPrepDayFor?: string[] // event IDs this is a prep day for
}

export interface WeekSchedule {
  weekStart: string // ISO date of Monday
  weekEnd: string // ISO date of Sunday
  days: WeekDay[]
  warnings: string[]
}

// ============================================
// PREP BLOCKS (year/week scheduling system)
// ============================================

export type PrepBlockType =
  | 'grocery_run'
  | 'specialty_sourcing'
  | 'prep_session'
  | 'packing'
  | 'travel_to_event'
  | 'mental_prep'
  | 'equipment_prep'
  | 'admin'
  | 'cleanup'
  | 'custom'

export const PREP_BLOCK_TYPE_LABELS: Record<PrepBlockType, string> = {
  grocery_run: 'Grocery Run',
  specialty_sourcing: 'Specialty Sourcing',
  prep_session: 'Prep Session',
  packing: 'Packing',
  travel_to_event: 'Travel to Event',
  mental_prep: 'Mental Prep',
  equipment_prep: 'Equipment Prep',
  admin: 'Admin / Follow-up',
  cleanup: 'Cleanup',
  custom: 'Custom',
}

// A persisted prep block (from DB)
export interface PrepBlock {
  id: string
  chef_id: string
  event_id: string | null
  block_date: string // "YYYY-MM-DD"
  start_time: string | null // "HH:MM" or null (date-only)
  end_time: string | null // "HH:MM" or null
  block_type: PrepBlockType
  title: string
  notes: string | null
  store_name: string | null
  store_address: string | null
  estimated_duration_minutes: number | null
  actual_duration_minutes: number | null
  is_completed: boolean
  completed_at: string | null
  is_system_generated: boolean
  created_at: string
  updated_at: string
}

// Engine output - not yet saved to DB. Shown to chef for review before confirming.
export interface PrepBlockSuggestion {
  block_type: PrepBlockType
  title: string
  suggested_date: string // "YYYY-MM-DD"
  suggested_start_time: string | null // "HH:MM" or null
  estimated_duration_minutes: number
  notes: string
  store_name: string | null
  store_address: string | null
  reason: string // human-readable explanation shown in confirm dialog
}

// An event with one or more required prep blocks missing
export interface SchedulingGap {
  event_id: string
  event_date: string
  event_occasion: string | null
  client_name: string
  days_until_event: number
  missing_block_types: PrepBlockType[]
  severity: 'critical' | 'warning' | 'info'
  // critical = < 48 hours away, warning = < 7 days, info = 7+ days
}

// One cell in the year view grid
export interface YearWeekSummary {
  week_number: number // 1–52
  week_start: string // ISO date of Monday
  week_end: string // ISO date of Sunday
  event_count: number
  scheduled_block_count: number
  gap_count: number // events with ≥1 missing required block
  has_gaps: boolean
}

// Full 52-week summary for the year view
export interface YearSummary {
  year: number
  weeks: YearWeekSummary[]
  total_events: number
  total_gaps: number
}

// Input for creating a single prep block
export interface CreatePrepBlockInput {
  event_id?: string | null
  block_date: string
  start_time?: string | null
  end_time?: string | null
  block_type: PrepBlockType
  title: string
  notes?: string | null
  store_name?: string | null
  store_address?: string | null
  estimated_duration_minutes?: number | null
  is_system_generated?: boolean
}

// Input for updating a prep block
export interface UpdatePrepBlockInput {
  block_date?: string
  start_time?: string | null
  end_time?: string | null
  block_type?: PrepBlockType
  title?: string
  notes?: string | null
  store_name?: string | null
  store_address?: string | null
  estimated_duration_minutes?: number | null
  actual_duration_minutes?: number | null
}
