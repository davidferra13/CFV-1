// Calendar color system - single source of truth for all calendar item colors.
// Pure utility functions - no 'use server' needed (no DB calls, no async).
// Every type/status combination maps to a hex color.
// Import getItemColor() to get the color for any UnifiedCalendarItem.

export type CalendarCategory =
  | 'events'
  | 'prep'
  | 'calls'
  | 'personal'
  | 'business'
  | 'intentions'
  | 'leads'

export type CalendarLegendEntry = {
  label: string
  color: string
  category: CalendarCategory
  borderStyle?: 'solid' | 'dashed' | 'dotted'
}

// ------------------------------------------------------------------
// Raw color map - keyed by type identifier
// ------------------------------------------------------------------
export const CALENDAR_COLORS: Record<string, string> = {
  // ── Events ────────────────────────────────────────────────────
  event_confirmed: '#F59E0B', // amber - in_progress, confirmed, paid
  event_draft: '#FDE68A', // light amber - draft, proposed, accepted
  event_cancelled: '#D1D5DB', // gray - cancelled

  // ── Prep blocks (keyed by prep_block_type) ───────────────────
  grocery_run: '#16A34A', // green
  specialty_sourcing: '#65A30D', // lime
  prep_session: '#059669', // emerald
  packing: '#166534', // forest green
  travel_to_event: '#475569', // slate
  equipment_prep: '#6B7280', // gray
  mental_prep: '#4338CA', // indigo
  admin: '#78716C', // stone
  cleanup: '#737373', // neutral
  custom: '#737373', // neutral

  // ── Scheduled calls ──────────────────────────────────────────
  call: '#3B82F6', // blue

  // ── Personal calendar entries ─────────────────────────────────
  vacation: '#1E3A8A', // navy
  time_off: '#7C3AED', // purple
  personal: '#A78BFA', // lavender

  // ── Business calendar entries ─────────────────────────────────
  market: '#0D9488', // teal
  festival: '#059669', // emerald
  class: '#0891B2', // cyan
  photo_shoot: '#E11D48', // rose
  media: '#DB2777', // pink
  meeting: '#2563EB', // blue
  admin_block: '#78716C', // stone
  other: '#6B7280', // gray

  // ── Soft intentions ───────────────────────────────────────────
  target_booking: '#4ADE80', // sage green (dotted border in UI)
  soft_preference: '#7DD3FC', // sky blue (dashed border in UI)

  // ── Lead indicators ───────────────────────────────────────────
  inquiry: '#CA8A04', // amber/gold (dashed border in UI)
  waitlist: '#EA580C', // orange (dashed border in UI)

  // ── Availability blocks ───────────────────────────────────────
  availability_block: '#EF4444', // red
}

// ------------------------------------------------------------------
// Border styles - used by the UI to render dashed/dotted borders
// for non-blocking items
// ------------------------------------------------------------------
export const CALENDAR_BORDER_STYLES: Record<string, 'solid' | 'dashed' | 'dotted'> = {
  target_booking: 'dotted',
  soft_preference: 'dashed',
  inquiry: 'dashed',
  waitlist: 'dashed',
}

// ------------------------------------------------------------------
// Types → Category mapping
// ------------------------------------------------------------------
export const ENTRY_TYPE_CATEGORIES: Record<string, CalendarCategory> = {
  // Events
  event_confirmed: 'events',
  event_draft: 'events',
  event_cancelled: 'events',
  // Prep
  grocery_run: 'prep',
  specialty_sourcing: 'prep',
  prep_session: 'prep',
  packing: 'prep',
  travel_to_event: 'prep',
  equipment_prep: 'prep',
  mental_prep: 'prep',
  admin: 'prep',
  cleanup: 'prep',
  custom: 'prep',
  // Calls
  call: 'calls',
  // Personal
  vacation: 'personal',
  time_off: 'personal',
  personal: 'personal',
  // Business
  market: 'business',
  festival: 'business',
  class: 'business',
  photo_shoot: 'business',
  media: 'business',
  meeting: 'business',
  admin_block: 'business',
  other: 'business',
  // Intentions
  target_booking: 'intentions',
  soft_preference: 'intentions',
  // Leads
  inquiry: 'leads',
  waitlist: 'leads',
}

// ------------------------------------------------------------------
// Types that do NOT block bookings (soft intentions + leads)
// ------------------------------------------------------------------
export const NON_BLOCKING_TYPES = new Set([
  'target_booking',
  'soft_preference',
  'inquiry',
  'waitlist',
  'event_draft',
])

// ------------------------------------------------------------------
// Default blocking behavior by entry type (for auto-setting on create)
// ------------------------------------------------------------------
export const ENTRY_TYPE_BLOCKS_BOOKINGS: Record<string, boolean> = {
  vacation: true,
  time_off: true,
  personal: true,
  market: true,
  festival: true,
  class: true,
  photo_shoot: true,
  media: true,
  meeting: false, // meetings don't fully block a booking day
  admin_block: false, // admin blocks are reminders, not hard blocks
  other: false,
  target_booking: false,
  soft_preference: false,
}

// ------------------------------------------------------------------
// Revenue-capable entry types
// ------------------------------------------------------------------
export const REVENUE_CAPABLE_TYPES = new Set([
  'market',
  'festival',
  'class',
  'photo_shoot',
  'media',
  'other',
])

// ------------------------------------------------------------------
// Legend data - for rendering the color legend UI
// ------------------------------------------------------------------
export const CALENDAR_LEGEND: CalendarLegendEntry[] = [
  // Events
  { label: 'Confirmed Event', color: CALENDAR_COLORS.event_confirmed, category: 'events' },
  { label: 'Draft / Proposed', color: CALENDAR_COLORS.event_draft, category: 'events' },
  // Prep
  { label: 'Grocery Run', color: CALENDAR_COLORS.grocery_run, category: 'prep' },
  { label: 'Prep Session', color: CALENDAR_COLORS.prep_session, category: 'prep' },
  { label: 'Packing', color: CALENDAR_COLORS.packing, category: 'prep' },
  { label: 'Travel to Event', color: CALENDAR_COLORS.travel_to_event, category: 'prep' },
  { label: 'Equipment Prep', color: CALENDAR_COLORS.equipment_prep, category: 'prep' },
  { label: 'Mental Prep', color: CALENDAR_COLORS.mental_prep, category: 'prep' },
  { label: 'Admin (Prep)', color: CALENDAR_COLORS.admin, category: 'prep' },
  // Calls
  { label: 'Scheduled Call', color: CALENDAR_COLORS.call, category: 'calls' },
  // Personal
  { label: 'Vacation', color: CALENDAR_COLORS.vacation, category: 'personal' },
  { label: 'Time Off', color: CALENDAR_COLORS.time_off, category: 'personal' },
  { label: 'Personal Appt', color: CALENDAR_COLORS.personal, category: 'personal' },
  // Business
  { label: 'Farmers Market', color: CALENDAR_COLORS.market, category: 'business' },
  { label: 'Food Festival', color: CALENDAR_COLORS.festival, category: 'business' },
  { label: 'Class / Teaching', color: CALENDAR_COLORS.class, category: 'business' },
  { label: 'Photo Shoot', color: CALENDAR_COLORS.photo_shoot, category: 'business' },
  { label: 'Media / Press', color: CALENDAR_COLORS.media, category: 'business' },
  { label: 'Business Meeting', color: CALENDAR_COLORS.meeting, category: 'business' },
  { label: 'Admin Block', color: CALENDAR_COLORS.admin_block, category: 'business' },
  // Intentions
  {
    label: 'Seeking Booking',
    color: CALENDAR_COLORS.target_booking,
    category: 'intentions',
    borderStyle: 'dotted',
  },
  {
    label: 'Soft Day Pref',
    color: CALENDAR_COLORS.soft_preference,
    category: 'intentions',
    borderStyle: 'dashed',
  },
  // Leads
  {
    label: 'Inquiry (Targeted)',
    color: CALENDAR_COLORS.inquiry,
    category: 'leads',
    borderStyle: 'dashed',
  },
  {
    label: 'Waitlist Entry',
    color: CALENDAR_COLORS.waitlist,
    category: 'leads',
    borderStyle: 'dashed',
  },
]

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Get the hex color for a calendar item based on its type and status.
 * Falls back to a neutral gray if no match is found.
 */
export function getCalendarColor(
  type: string,
  subType?: string,
  status?: string,
  colorOverride?: string | null
): string {
  if (colorOverride) return colorOverride

  // Events: differentiate by status
  if (type === 'event') {
    if (status === 'cancelled') return CALENDAR_COLORS.event_cancelled
    if (status === 'draft' || status === 'proposed' || status === 'accepted') {
      return CALENDAR_COLORS.event_draft
    }
    return CALENDAR_COLORS.event_confirmed
  }

  // Prep blocks: key by block_type
  if (type === 'prep_block' && subType) {
    return CALENDAR_COLORS[subType] ?? CALENDAR_COLORS.custom
  }

  // Calls
  if (type === 'call') return CALENDAR_COLORS.call

  // Calendar entries: key by entry_type
  if (type === 'calendar_entry' && subType) {
    return CALENDAR_COLORS[subType] ?? CALENDAR_COLORS.other
  }

  // Leads
  if (type === 'inquiry') return CALENDAR_COLORS.inquiry
  if (type === 'waitlist') return CALENDAR_COLORS.waitlist

  // Availability blocks
  if (type === 'availability_block') return CALENDAR_COLORS.availability_block

  // Fallback
  return CALENDAR_COLORS[subType ?? ''] ?? '#6B7280'
}

/**
 * Get the border style for a calendar item (solid/dashed/dotted).
 * Non-blocking/intention types get visual distinction.
 */
export function getCalendarBorderStyle(
  type: string,
  subType?: string
): 'solid' | 'dashed' | 'dotted' {
  if (type === 'calendar_entry' && subType) {
    return CALENDAR_BORDER_STYLES[subType] ?? 'solid'
  }
  if (type === 'inquiry' || type === 'waitlist') return 'dashed'
  return 'solid'
}

/**
 * Group legend entries by category for rendering.
 */
export function getLegendByCategory(): Record<CalendarCategory, CalendarLegendEntry[]> {
  return CALENDAR_LEGEND.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = []
      acc[entry.category].push(entry)
      return acc
    },
    {} as Record<CalendarCategory, CalendarLegendEntry[]>
  )
}
