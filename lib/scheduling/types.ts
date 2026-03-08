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
  'onboarding_accelerator',
  'todays_schedule',
  'next_action',
  'week_strip',
  'priority_queue',
  'prep_prompts',
  'service_quality',
  'business_snapshot',
  'career_growth',
  'hours',
  'activity',
  'todo_list',
  'capacity',
] as const

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number]

export interface DashboardWidgetPreference {
  id: DashboardWidgetId
  enabled: boolean
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetPreference[] = DASHBOARD_WIDGET_IDS.map((id) => ({
  id,
  enabled: true,
}))

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  onboarding_accelerator: 'Onboarding Accelerator',
  todays_schedule: "Today's Schedule",
  next_action: 'Next Action',
  week_strip: 'Week at a Glance',
  priority_queue: 'Priority Queue',
  prep_prompts: 'Preparation Prompts',
  service_quality: 'Service Quality',
  business_snapshot: 'Business Snapshot',
  career_growth: 'Career Growth',
  hours: 'Hours',
  activity: 'Activity',
  todo_list: 'To Do List',
  capacity: 'Capacity Planning',
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
  time: string           // "HH:MM" format
  label: string
  description: string
  type: TimelineItemType
  isDeadline: boolean    // true for arrival, departure
  isFlexible: boolean    // true for wake up, false for arrival
}

export interface RouteStop {
  name: string
  address: string
  purpose: string        // "Store", "Event location", etc.
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

export type DOPTaskCategory =
  | 'documents'
  | 'shopping'
  | 'prep'
  | 'packing'
  | 'admin'
  | 'reset'

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

export type DOPPhaseStatus =
  | 'complete'
  | 'pending'
  | 'overdue'
  | 'upcoming'
  | 'not_applicable'

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
  date: string         // ISO date
  dayOfWeek: string    // "Monday", etc.
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
  weekStart: string    // ISO date of Monday
  weekEnd: string      // ISO date of Sunday
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
  block_date: string                       // "YYYY-MM-DD"
  start_time: string | null                // "HH:MM" or null (date-only)
  end_time: string | null                  // "HH:MM" or null
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
  suggested_date: string                   // "YYYY-MM-DD"
  suggested_start_time: string | null      // "HH:MM" or null
  estimated_duration_minutes: number
  notes: string
  store_name: string | null
  store_address: string | null
  reason: string                           // human-readable explanation shown in confirm dialog
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
  week_number: number                      // 1–52
  week_start: string                       // ISO date of Monday
  week_end: string                         // ISO date of Sunday
  event_count: number
  scheduled_block_count: number
  gap_count: number                        // events with ≥1 missing required block
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
