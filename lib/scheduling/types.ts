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
] as const

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number]

export interface DashboardWidgetPreference {
  id: DashboardWidgetId
  enabled: boolean
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetPreference[] = DASHBOARD_WIDGET_IDS.map(
  (id) => ({
    id,
    enabled: true,
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
}

// Legacy alias kept for compatibility with older code paths.
export type SpecialtyStore = DefaultStore

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

// Engine output — not yet saved to DB. Shown to chef for review before confirming.
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
