// Travel Route Planning — Type Definitions
// Models the complete arc of chef travel for an event:
// specialty sourcing → grocery run → service travel → return home

// ============================================================
// CORE TYPES
// ============================================================

export type TravelLegType =
  | 'specialty_sourcing' // weeks before, specific ingredient sourcing
  | 'grocery_shopping' // main grocery run (day before or day of)
  | 'consolidated_shopping' // single run covering multiple events
  | 'service_travel' // travel to service venue
  | 'return_home' // travel from venue back home
  | 'other'

export type TravelLegStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export type TravelLocationType = 'home' | 'store' | 'venue' | 'other'

export type TravelIngredientStatus = 'to_source' | 'sourced' | 'unavailable'

// ============================================================
// STOP (ordered list within a leg)
// ============================================================

export interface TravelStop {
  order: number
  name: string
  address: string
  purpose: string // e.g. "Pick up A5 Wagyu", "Drop off extra equipment"
  estimated_minutes: number // time on-site
  notes?: string
  lat?: number
  lng?: number
}

// ============================================================
// LEG
// ============================================================

export interface TravelLeg {
  id: string
  chef_id: string
  tenant_id: string
  primary_event_id: string | null
  linked_event_ids: string[]

  leg_type: TravelLegType

  leg_date: string // ISO date: YYYY-MM-DD
  departure_time: string | null // HH:MM
  estimated_return_time: string | null // HH:MM

  origin_type: TravelLocationType | null
  origin_address: string | null
  origin_label: string | null

  destination_type: TravelLocationType | null
  destination_address: string | null
  destination_label: string | null

  stops: TravelStop[]

  total_drive_minutes: number | null
  total_stop_minutes: number | null
  total_estimated_minutes: number | null

  purpose_notes: string | null
  status: TravelLegStatus
  completed_at: string | null

  created_at: string
  updated_at: string
}

// ============================================================
// INGREDIENT SOURCING (specialty legs only)
// ============================================================

export interface TravelLegIngredient {
  id: string
  leg_id: string
  ingredient_id: string
  ingredient_name?: string // joined from ingredients table
  event_id: string | null
  quantity: number | null
  unit: string | null
  store_name: string | null
  notes: string | null
  status: TravelIngredientStatus
  sourced_at: string | null
  created_at: string
}

// ============================================================
// FULL TRAVEL PLAN (event-level aggregate)
// ============================================================

export interface TravelPlan {
  eventId: string
  legs: TravelLegWithIngredients[]
  // nearby events (for consolidation suggestions)
  nearbyEvents: NearbyEvent[]
}

export interface TravelLegWithIngredients extends TravelLeg {
  ingredients: TravelLegIngredient[]
  // For consolidated legs: brief info about each linked event
  linkedEvents?: LinkedEventSummary[]
}

export interface LinkedEventSummary {
  id: string
  occasion: string | null
  event_date: string
  client_name: string | null
}

export interface NearbyEvent {
  id: string
  occasion: string | null
  event_date: string
  client_name: string | null
  days_away: number
}

// ============================================================
// FORM INPUT TYPES (for server actions)
// ============================================================

export interface CreateTravelLegInput {
  primary_event_id?: string | null
  linked_event_ids?: string[]
  leg_type: TravelLegType
  leg_date: string
  departure_time?: string | null
  estimated_return_time?: string | null
  origin_type?: TravelLocationType
  origin_address?: string | null
  origin_label?: string | null
  destination_type?: TravelLocationType | null
  destination_address?: string | null
  destination_label?: string | null
  stops?: TravelStop[]
  total_drive_minutes?: number | null
  total_stop_minutes?: number | null
  total_estimated_minutes?: number | null
  purpose_notes?: string | null
}

export interface UpdateTravelLegInput extends Partial<CreateTravelLegInput> {
  id: string
}

export interface UpsertTravelLegIngredientInput {
  leg_id: string
  ingredient_id: string
  event_id?: string | null
  quantity?: number | null
  unit?: string | null
  store_name?: string | null
  notes?: string | null
  status?: TravelIngredientStatus
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

export const LEG_TYPE_LABELS: Record<TravelLegType, string> = {
  specialty_sourcing: 'Specialty Sourcing',
  grocery_shopping: 'Grocery Run',
  consolidated_shopping: 'Consolidated Shopping',
  service_travel: 'Travel to Venue',
  return_home: 'Return Home',
  other: 'Other Trip',
}

export const LEG_TYPE_DESCRIPTIONS: Record<TravelLegType, string> = {
  specialty_sourcing: 'Source specific ingredients (farms, specialty shops, markets)',
  grocery_shopping: 'Main grocery run for this event',
  consolidated_shopping: 'One shopping run covering multiple events',
  service_travel: 'Drive to the service venue',
  return_home: 'Drive home after service',
  other: 'Any other trip related to this event',
}

export const LEG_STATUS_LABELS: Record<TravelLegStatus, string> = {
  planned: 'Planned',
  in_progress: 'Underway',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const INGREDIENT_STATUS_LABELS: Record<TravelIngredientStatus, string> = {
  to_source: 'To Source',
  sourced: 'Sourced',
  unavailable: 'Unavailable',
}

/** Compute total estimated minutes from stops + drive time */
export function computeLegTotals(
  stops: TravelStop[],
  totalDriveMinutes: number | null
): { stop: number; drive: number; total: number } {
  const stop = stops.reduce((s, st) => s + (st.estimated_minutes ?? 0), 0)
  const drive = totalDriveMinutes ?? 0
  return { stop, drive, total: stop + drive }
}

/** Format "HH:MM" → "h:mm am/pm" */
export function formatLegTime(time: string | null): string {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'am' : 'pm'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

/** Format minutes → "Xh Ym" */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
