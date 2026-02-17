// Scheduling Engine - Type Definitions
// Pure types for timeline generation, DOPs, and prep prompts.

// ============================================
// CHEF PREFERENCES
// ============================================

export interface SpecialtyStore {
  name: string
  address: string
  notes: string
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
  default_grocery_store: string | null
  default_grocery_address: string | null
  default_liquor_store: string | null
  default_liquor_address: string | null
  default_specialty_stores: SpecialtyStore[]

  // Timing defaults
  default_buffer_minutes: number
  default_prep_hours: number
  default_shopping_minutes: number
  default_packing_minutes: number

  // Financial
  target_margin_percent: number

  // DOP preferences
  shop_day_before: boolean
  wake_time_earliest: string // "HH:MM"
  wake_time_latest: string   // "HH:MM"
}

export const DEFAULT_PREFERENCES: Omit<ChefPreferences, 'id' | 'chef_id'> = {
  home_address: null,
  home_city: null,
  home_state: 'MA',
  home_zip: null,
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
  shop_day_before: true,
  wake_time_earliest: '08:00',
  wake_time_latest: '10:00',
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
  purpose: string        // "Groceries", "Liquor", "Client"
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
