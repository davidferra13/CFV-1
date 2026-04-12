// Prep Block Engine
// Pure computation - zero DB calls. All data is passed in.
// Mirrors the pattern of timeline.ts and dop.ts.
//
// Answers two questions:
//   1. Given an event, what prep blocks SHOULD exist? (suggestPrepBlocks)
//   2. Given all upcoming events + existing blocks, what's MISSING? (detectGaps)

import type {
  ChefPreferences,
  SchedulingEvent,
  PrepBlock,
  PrepBlockSuggestion,
  PrepBlockType,
  SchedulingGap,
  MenuComponent,
} from './types'
import { generateTimeline } from './timeline'
import { DEFAULT_PREFERENCES } from './types'

// ============================================
// CONSTANTS
// ============================================

/** Required for every event - used for gap detection. */
const REQUIRED_BLOCK_TYPES: PrepBlockType[] = [
  'grocery_run',
  'prep_session',
  'packing',
  'equipment_prep',
  'admin',
]

const DEFAULT_EQUIPMENT_PREP_MINUTES = 30
const DEFAULT_ADMIN_MINUTES = 45
const DEFAULT_SPECIALTY_SOURCING_MINUTES = 45
const DEFAULT_COMPONENT_PREP_MINUTES = 60 // fallback when recipe has no prep time

// ============================================
// HELPERS
// ============================================

/**
 * Parse "HH:MM" to minutes since midnight.
 */
function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Format minutes since midnight to "h:MM AM/PM".
 */
function formatTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

/**
 * Add N days to an ISO date string "YYYY-MM-DD".
 * Uses pure arithmetic to avoid locale/timezone issues.
 */
function addDays(isoDate: string, days: number): string {
  const [y, mo, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, mo - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Days between today (UTC) and an ISO date string.
 * Positive = future, negative = past.
 */
function daysFromNow(isoDate: string): number {
  const today = new Date()
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const [y, mo, d] = isoDate.split('-').map(Number)
  const targetUTC = Date.UTC(y, mo - 1, d)
  return Math.round((targetUTC - todayUTC) / 86400000)
}

/**
 * Returns true if any non-completed block of blockType exists for eventId.
 */
function isCovered(eventId: string, blockType: PrepBlockType, blocks: PrepBlock[]): boolean {
  return blocks.some((b) => b.event_id === eventId && b.block_type === blockType && !b.is_completed)
}

/**
 * Given event and prefs, compute the departure time in "HH:MM".
 * Derived from generateTimeline - finds the 'departure' item.
 */
function getDepartureTime(event: SchedulingEvent, prefs: ChefPreferences | null): string {
  const timeline = generateTimeline(event, prefs)
  const dep = timeline.timeline.find((t) => t.id === 'departure')
  return dep?.time ?? '14:00'
}

// ============================================
// PUBLIC: REQUIRED BLOCK TYPES
// ============================================

/**
 * Returns which block types are required for any given event.
 * This is the source of truth for gap detection.
 */
export function getRequiredBlockTypes(_event: SchedulingEvent): PrepBlockType[] {
  return [...REQUIRED_BLOCK_TYPES]
}

// ============================================
// COMPONENT-AWARE SCHEDULING
// ============================================

/** Map prep_time_of_day enum values to suggested start times. */
const PREP_TIME_OF_DAY_MAP: Record<string, string> = {
  early_morning: '7:00 AM',
  morning: '9:00 AM',
  afternoon: '1:00 PM',
  evening: '5:00 PM',
}

/**
 * Generate component-specific prep block suggestions from menu components.
 * Pure computation - no DB calls.
 *
 * For each make-ahead component:
 *   - prep_day_offset takes priority over make_ahead_window_hours
 *   - Components with prep_time_of_day = 'service' are day-of (skipped here)
 *   - Components with no offset and no hours are day-of (skipped here)
 *   - Past dates are clamped to today with a warning
 */
function suggestComponentBlocks(
  eventDate: string,
  components: MenuComponent[],
  existingBlocks: PrepBlock[],
  eventId: string
): PrepBlockSuggestion[] {
  const suggestions: PrepBlockSuggestion[] = []
  const _pb = new Date()
  const todayStr = `${_pb.getFullYear()}-${String(_pb.getMonth() + 1).padStart(2, '0')}-${String(_pb.getDate()).padStart(2, '0')}`

  // Build a set of component names already covered by existing blocks
  const coveredTitles = new Set(
    existingBlocks
      .filter((b) => b.event_id === eventId && b.block_type === 'prep_session' && !b.is_completed)
      .map((b) => b.title.toLowerCase())
  )

  for (const comp of components) {
    // Skip service/day-of components (no separate block needed)
    if (comp.prep_time_of_day === 'service') continue

    // Determine block date from offset or hours
    let blockDate: string | null = null
    let reason = ''

    if (comp.prep_day_offset != null && comp.prep_day_offset < 0) {
      blockDate = addDays(eventDate, comp.prep_day_offset)
      const daysBefore = Math.abs(comp.prep_day_offset)
      reason = `${daysBefore} day${daysBefore > 1 ? 's' : ''} before event based on prep offset.`
    } else if (comp.make_ahead_window_hours != null && comp.make_ahead_window_hours > 0) {
      const daysBefore = Math.ceil(comp.make_ahead_window_hours / 24)
      blockDate = addDays(eventDate, -daysBefore)
      reason = `${comp.make_ahead_window_hours}h lead time (${daysBefore} day${daysBefore > 1 ? 's' : ''} before).`
    }

    // Skip components with no scheduling data (they're day-of, handled by Main Prep Session)
    if (!blockDate) continue

    // Skip if already covered by an existing block with the same title
    if (coveredTitles.has(comp.name.toLowerCase())) continue

    // Clamp past dates to today
    let warning = ''
    if (blockDate < todayStr) {
      blockDate = todayStr
      warning = ' (lead time already passed)'
    }

    // Determine start time from prep_time_of_day
    const startTime = comp.prep_time_of_day
      ? (PREP_TIME_OF_DAY_MAP[comp.prep_time_of_day] ?? null)
      : null

    // Determine duration from recipe or fallback
    const durationMinutes = comp.recipe_prep_time_minutes ?? DEFAULT_COMPONENT_PREP_MINUTES

    // Build notes
    const noteParts: string[] = []
    if (comp.prep_station) noteParts.push(`Station: ${comp.prep_station}`)
    if (comp.storage_notes) noteParts.push(`Storage: ${comp.storage_notes}`)

    suggestions.push({
      block_type: 'prep_session',
      title: comp.name,
      suggested_date: blockDate,
      suggested_start_time: startTime,
      estimated_duration_minutes: durationMinutes,
      notes: noteParts.join('. ') || `Prep for ${comp.name}.`,
      store_name: null,
      store_address: null,
      reason: reason + warning,
      component_id: comp.id,
    })
  }

  // Sort by date (earliest first), then by start time
  return suggestions.sort((a, b) => {
    if (a.suggested_date !== b.suggested_date)
      return a.suggested_date.localeCompare(b.suggested_date)
    if (a.suggested_start_time && b.suggested_start_time)
      return a.suggested_start_time.localeCompare(b.suggested_start_time)
    return 0
  })
}

// ============================================
// PUBLIC: SUGGEST PREP BLOCKS
// ============================================

/**
 * Generate prep block suggestions for a single event.
 * Skips types already covered by existingBlocks.
 * Returns suggestions only - caller must persist after chef confirms.
 * NEVER saves to DB.
 *
 * When menu components are provided, generates component-specific prep blocks
 * for make-ahead items (mapped to real calendar dates via prep_day_offset or
 * make_ahead_window_hours). The generic "Main Prep Session" is kept for day-of
 * prep but its duration is reduced by the total time of component blocks
 * scheduled on event day.
 *
 * Timing algorithm (all times derived from generateTimeline):
 *   - grocery_run: event_date-1 (if shop_day_before) or event_date, flexible time
 *   - specialty_sourcing: one per store in prefs.default_specialty_stores, same date as grocery_run
 *   - prep_session: event_date, start = departure - packing_min - prep_hours
 *     If menuComponentCount > 8: also suggest an early prep session on the day before
 *   - packing: event_date, start = departure - packing_min
 *   - equipment_prep: event_date-2, flexible time
 *   - admin: event_date+1, flexible time (post-event admin)
 *   - mental_prep: event_date-1, evening (20:00), optional (not in required list)
 */
export function suggestPrepBlocks(
  event: SchedulingEvent,
  existingBlocks: PrepBlock[],
  prefs: ChefPreferences | null,
  components?: MenuComponent[]
): PrepBlockSuggestion[] {
  const p = prefs ?? { ...DEFAULT_PREFERENCES, id: '', chef_id: '' }
  const suggestions: PrepBlockSuggestion[] = []

  const departureTime = getDepartureTime(event, p)
  const departureMinutes = parseTime(departureTime)
  const packingMin = p.default_packing_minutes
  const prepHours = p.default_prep_hours
  const shoppingMin = p.default_shopping_minutes
  const shopDayBefore = p.shop_day_before
  const eventDate = event.event_date
  const dayBefore = addDays(eventDate, -1)
  const twoDaysBefore = addDays(eventDate, -2)
  const dayAfter = addDays(eventDate, 1)

  // ── 1. GROCERY RUN ────────────────────────────────────────────────────────
  if (!isCovered(event.id, 'grocery_run', existingBlocks)) {
    suggestions.push({
      block_type: 'grocery_run',
      title: 'Grocery Run',
      suggested_date: shopDayBefore ? dayBefore : eventDate,
      suggested_start_time: null,
      estimated_duration_minutes: shoppingMin,
      notes: 'Perishables, proteins, produce. Check list before leaving.',
      store_name: p.default_grocery_store ?? null,
      store_address: p.default_grocery_address ?? null,
      reason: shopDayBefore
        ? 'Scheduled day before so you can prep with fresh ingredients in the morning.'
        : 'Scheduled morning-of based on your shopping preference.',
    })
  }

  // ── 2. SPECIALTY SOURCING ─────────────────────────────────────────────────
  // One block per specialty store (farmers market, fishmonger, etc.)
  const specialtyStores = [
    ...(p.default_specialty_stores ?? []),
    ...(p.default_stores ?? []).filter(
      (s) => s.name !== p.default_grocery_store && s.name !== p.default_liquor_store
    ),
  ]
  // Deduplicate by name
  const seenStoreNames = new Set<string>()
  for (const store of specialtyStores) {
    const name = store.name?.trim()
    if (!name || seenStoreNames.has(name.toLowerCase())) continue
    seenStoreNames.add(name.toLowerCase())

    if (!isCovered(event.id, 'specialty_sourcing', existingBlocks)) {
      suggestions.push({
        block_type: 'specialty_sourcing',
        title: `Sourcing - ${store.name}`,
        suggested_date: shopDayBefore ? dayBefore : eventDate,
        suggested_start_time: null,
        estimated_duration_minutes: DEFAULT_SPECIALTY_SOURCING_MINUTES,
        notes: `Pick up specialty items from ${store.name}.`,
        store_name: store.name,
        store_address: store.address ?? null,
        reason: `Sourcing from ${store.name} - plan this alongside your grocery run.`,
      })
    }
  }

  // ── 3. PREP SESSION ───────────────────────────────────────────────────────
  if (!isCovered(event.id, 'prep_session', existingBlocks)) {
    const prepStartMinutes = departureMinutes - packingMin - prepHours * 60
    const prepStartTime = formatTime(prepStartMinutes)

    suggestions.push({
      block_type: 'prep_session',
      title: 'Main Prep Session',
      suggested_date: eventDate,
      suggested_start_time: prepStartTime,
      estimated_duration_minutes: prepHours * 60,
      notes: 'Sauces, proteins, veg prep. Work prep sheet top-to-bottom.',
      store_name: null,
      store_address: null,
      reason: `Timed to finish ${packingMin} min before departure at ${departureTime}.`,
    })

    // High-component events: also suggest early prep session the night/day before
    if ((event.menuComponentCount ?? 0) > 8) {
      suggestions.push({
        block_type: 'prep_session',
        title: 'Early Prep Session',
        suggested_date: dayBefore,
        suggested_start_time: '16:00',
        estimated_duration_minutes: 120,
        notes: 'Doughs, marinades, purees, sauces - anything that holds well overnight.',
        store_name: null,
        store_address: null,
        reason: `${event.menuComponentCount} components detected - splitting prep across two sessions reduces day-of stress.`,
      })
    }
  }

  // ── 4. PACKING ────────────────────────────────────────────────────────────
  if (!isCovered(event.id, 'packing', existingBlocks)) {
    const packStartMinutes = departureMinutes - packingMin
    suggestions.push({
      block_type: 'packing',
      title: 'Pack the Car',
      suggested_date: eventDate,
      suggested_start_time: formatTime(packStartMinutes),
      estimated_duration_minutes: packingMin,
      notes: 'Load coolers, equipment, non-perishables. Run through packing list.',
      store_name: null,
      store_address: null,
      reason: `Immediately before departure at ${departureTime}.`,
    })
  }

  // ── 5. EQUIPMENT PREP ─────────────────────────────────────────────────────
  if (!isCovered(event.id, 'equipment_prep', existingBlocks)) {
    suggestions.push({
      block_type: 'equipment_prep',
      title: 'Equipment Check',
      suggested_date: twoDaysBefore,
      suggested_start_time: null,
      estimated_duration_minutes: DEFAULT_EQUIPMENT_PREP_MINUTES,
      notes: 'Check, clean, and stage all equipment. Charge devices. Replace anything worn.',
      store_name: null,
      store_address: null,
      reason: 'Two days out - enough lead time to source replacements if anything is missing.',
    })
  }

  // ── 6. POST-EVENT ADMIN ───────────────────────────────────────────────────
  if (!isCovered(event.id, 'admin', existingBlocks)) {
    suggestions.push({
      block_type: 'admin',
      title: 'Post-Event Admin',
      suggested_date: dayAfter,
      suggested_start_time: null,
      estimated_duration_minutes: DEFAULT_ADMIN_MINUTES,
      notes: 'Upload receipt photos, file AAR, send client follow-up, close financials.',
      store_name: null,
      store_address: null,
      reason: 'Do this within 24 hours while the event is fresh.',
    })
  }

  // ── 7. COMPONENT-SPECIFIC BLOCKS ──────────────────────────────────────────
  // Generate from menu components if provided.
  // These are make-ahead items mapped to real calendar days.
  if (components && components.length > 0) {
    const componentBlocks = suggestComponentBlocks(eventDate, components, existingBlocks, event.id)
    suggestions.push(...componentBlocks)
  }

  return suggestions
}

// ============================================
// PUBLIC: DETECT GAPS
// ============================================

/**
 * Scan all upcoming events and find which required blocks are missing.
 * Returns one SchedulingGap per event that has at least one missing block.
 *
 * Events are filtered to non-terminal, upcoming (today or future) statuses only.
 * Terminal states (completed, cancelled) are skipped.
 */
export function detectGaps(
  events: SchedulingEvent[],
  existingBlocks: PrepBlock[],
  _prefs: ChefPreferences | null
): SchedulingGap[] {
  const terminalStatuses = new Set(['completed', 'cancelled'])
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const gaps: SchedulingGap[] = []

  for (const event of events) {
    if (terminalStatuses.has(event.status)) continue
    if (event.event_date < todayStr) continue

    const requiredTypes = getRequiredBlockTypes(event)
    const missingTypes = requiredTypes.filter((type) => !isCovered(event.id, type, existingBlocks))

    if (missingTypes.length === 0) continue

    const days = daysFromNow(event.event_date)
    const severity: SchedulingGap['severity'] =
      days < 2 ? 'critical' : days < 7 ? 'warning' : 'info'

    gaps.push({
      event_id: event.id,
      event_date: event.event_date,
      event_occasion: event.occasion,
      client_name: event.client?.full_name ?? 'Unknown Client',
      days_until_event: days,
      missing_block_types: missingTypes,
      severity,
    })
  }

  // Sort: critical first, then warning, then info; within each by soonest event
  return gaps.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    const sv = severityOrder[a.severity] - severityOrder[b.severity]
    if (sv !== 0) return sv
    return a.days_until_event - b.days_until_event
  })
}
