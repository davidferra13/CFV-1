// Prep Timeline - Deterministic Schedule Builder
// Works backward from event time using recipe prep times + standard buffers.
// This is how every chef has planned prep since before computers existed:
// start from service time, subtract, add buffers, create the schedule.

// ── Types (match the AI version exactly) ───────────────────────────────────

export type PrepStep = {
  time: string
  task: string
  duration: string
  category: 'shopping' | 'prep' | 'cooking' | 'plating' | 'service' | 'cleanup' | 'transport'
  notes?: string
}

export type PrepTimeline = {
  eventName: string
  eventDate: string | null
  guestCount: number | null
  serviceTime: string | null
  steps: PrepStep[]
  totalPrepHours: number
  summary: string
}

// ── Input types ────────────────────────────────────────────────────────────

export type TimelineVars = {
  eventName: string
  eventDate: string | null
  guestCount: number | null
  serviceTime: string | null // e.g. "18:00", "6:00 PM"
  menuItems: string[]
  isOffsite: boolean
  notes?: string
}

// ── Time helpers ───────────────────────────────────────────────────────────

/**
 * Parses a time string like "18:00" or "6:00 PM" into 24h hours.
 */
function parseTimeToHours(timeStr: string): number {
  const lower = timeStr.toLowerCase().trim()

  // Try 24h format: "18:00"
  const match24 = lower.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return parseInt(match24[1], 10) + parseInt(match24[2], 10) / 60
  }

  // Try 12h format: "6:00 PM"
  const match12 = lower.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = parseInt(match12[2] ?? '0', 10)
    if (match12[3].toLowerCase() === 'pm' && hours !== 12) hours += 12
    if (match12[3].toLowerCase() === 'am' && hours === 12) hours = 0
    return hours + minutes / 60
  }

  return 18 // Default: 6 PM
}

/**
 * Formats decimal hours back to "h:MM AM/PM" format.
 */
function formatTime(hours: number): string {
  // Handle negative (day before) and >24 (next day)
  while (hours < 0) hours += 24
  while (hours >= 24) hours -= 24

  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Scale factors ──────────────────────────────────────────────────────────

/**
 * Guest count affects prep time. Standard baseline = 8 guests.
 * Scale factor increases prep proportionally but not linearly
 * (economies of scale - doubling guests doesn't double prep).
 */
function guestScaleFactor(guestCount: number): number {
  if (guestCount <= 4) return 0.8
  if (guestCount <= 8) return 1.0
  if (guestCount <= 15) return 1.3
  if (guestCount <= 25) return 1.5
  if (guestCount <= 40) return 1.8
  if (guestCount <= 60) return 2.0
  return 2.5 // 60+
}

// ── Timeline Builder ───────────────────────────────────────────────────────

/**
 * Builds a prep timeline working backward from service time.
 * Pure math + standard catering buffers - no AI, no network.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function buildPrepTimelineFormula(v: TimelineVars): PrepTimeline {
  const serviceHour = v.serviceTime ? parseTimeToHours(v.serviceTime) : 18
  const guestCount = v.guestCount ?? 8
  const scale = guestScaleFactor(guestCount)
  const courseCount = v.menuItems.length || 3

  const steps: PrepStep[] = []

  // ── Work backward from service time ────────────────────────────────

  let currentTime = serviceHour

  // SERVICE: First course goes out
  steps.push({
    time: formatTime(currentTime),
    task: 'First course goes out - service begins',
    duration: '-',
    category: 'service',
  })

  // PLATING: 15–30 min before service
  const platingTime = courseCount <= 3 ? 0.25 : 0.5
  currentTime -= platingTime
  steps.push({
    time: formatTime(currentTime),
    task: 'Final plating and garnish prep',
    duration: formatDuration(platingTime),
    category: 'plating',
    notes: 'Plates staged, garnishes ready, sauces warm.',
  })

  // QUALITY CHECK: 15 min before plating
  currentTime -= 0.25
  steps.push({
    time: formatTime(currentTime),
    task: 'Quality check - taste everything, adjust seasoning',
    duration: '15 min',
    category: 'cooking',
  })

  // COOKING: Main protein + sides (scaled)
  const cookingTime = Math.round(1.5 * scale * 100) / 100
  currentTime -= cookingTime
  steps.push({
    time: formatTime(currentTime),
    task: `Main cooking phase - proteins, sides, sauces (${v.menuItems.length || 'multiple'} dishes)`,
    duration: formatDuration(cookingTime),
    category: 'cooking',
    notes: `Scaled for ${guestCount} guests.`,
  })

  // PREP: Mise en place (scaled)
  const prepTime = Math.round(1.0 * scale * 100) / 100
  currentTime -= prepTime
  steps.push({
    time: formatTime(currentTime),
    task: 'Mise en place - all chopping, portioning, measuring, marinating',
    duration: formatDuration(prepTime),
    category: 'prep',
    notes: 'Everything prepped before any cooking starts.',
  })

  // SETUP: Kitchen setup + equipment check
  const setupTime = v.isOffsite ? 0.75 : 0.5
  currentTime -= setupTime
  steps.push({
    time: formatTime(currentTime),
    task: `Kitchen setup - unpack, organize station, equipment check${v.isOffsite ? ', familiarize with venue kitchen' : ''}`,
    duration: formatDuration(setupTime),
    category: 'prep',
  })

  // TRANSPORT: If offsite, add travel buffer
  if (v.isOffsite) {
    currentTime -= 0.5
    steps.push({
      time: formatTime(currentTime),
      task: 'Depart for venue - all equipment and ingredients packed',
      duration: '30 min buffer',
      category: 'transport',
      notes: 'Adjust based on actual drive time. Always add 15 min buffer.',
    })
  }

  // ── Earlier in the day ──────────────────────────────────────────────

  // SHOPPING: Morning or day before (estimate)
  const shoppingTime = Math.round(1.0 * scale * 100) / 100
  steps.push({
    time: 'Day before or AM',
    task: 'Grocery shopping - all fresh ingredients',
    duration: formatDuration(shoppingTime),
    category: 'shopping',
    notes: 'Check inventory first. Buy proteins and seafood last (cold chain).',
  })

  // Any items that can be prepped ahead
  if (courseCount >= 3) {
    steps.push({
      time: 'Day before (optional)',
      task: 'Advance prep - stocks, sauces, marinades, doughs that benefit from overnight rest',
      duration: '1–2h',
      category: 'prep',
      notes: 'Anything that improves with time. Label and date everything.',
    })
  }

  // ── Post-service ────────────────────────────────────────────────────

  const cleanupTime = v.isOffsite ? 1.0 : 0.75
  steps.push({
    time: `After service`,
    task: 'Kitchen cleanup, pack-out, leftover labeling',
    duration: formatDuration(cleanupTime),
    category: 'cleanup',
    notes: 'Leave the kitchen cleaner than you found it.',
  })

  // Reverse so earliest is first
  // Keep shopping and advance prep at top, then chronological day-of
  const dayBefore = steps.filter((s) => s.time.includes('Day before') || s.time.includes('AM'))
  const dayOf = steps
    .filter(
      (s) => !s.time.includes('Day before') && !s.time.includes('AM') && !s.time.includes('After')
    )
    .sort((a, b) => {
      const aH = a.time.includes(':') ? parseTimeToHours(a.time) : 99
      const bH = b.time.includes(':') ? parseTimeToHours(b.time) : 99
      return aH - bH
    })
  const afterService = steps.filter((s) => s.time.includes('After'))

  const orderedSteps = [...dayBefore, ...dayOf, ...afterService]

  // Calculate total prep hours (excluding shopping and cleanup)
  const totalPrepHours =
    Math.round((prepTime + cookingTime + platingTime + setupTime + 0.25) * 100) / 100

  const summary = `${courseCount} course${courseCount > 1 ? 's' : ''} for ${guestCount} guests. Estimated ${formatDuration(totalPrepHours)} active prep/cooking time${v.isOffsite ? ' (offsite event - transport included)' : ''}.`

  return {
    eventName: v.eventName,
    eventDate: v.eventDate,
    guestCount,
    serviceTime: v.serviceTime,
    steps: orderedSteps,
    totalPrepHours,
    summary,
  }
}
