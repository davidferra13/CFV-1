// Weather-Conditional Pre-Event Checklist
// Generates actionable checklist items based on weather forecast for upcoming events.
// Only produces items for outdoor events; indoor events get an empty list.
// Capped at 5 items, sorted by priority (required before recommended).

import type { DailyForecast } from './open-meteo'

export type ChecklistCategory = 'equipment' | 'safety' | 'logistics'
export type ChecklistUrgency = 'required' | 'recommended'

export interface WeatherChecklistItem {
  text: string
  category: ChecklistCategory
  urgency: ChecklistUrgency
  /** Internal priority for sorting (lower = more important) */
  _priority: number
}

interface RuleMatch {
  text: string
  category: ChecklistCategory
  urgency: ChecklistUrgency
  priority: number
}

/**
 * Generate weather-conditional checklist items from a forecast.
 * Returns up to 5 items sorted by priority (required first, then recommended).
 * Indoor events always return an empty list.
 */
export function generateWeatherChecklist(
  forecast: DailyForecast,
  eventType: 'outdoor' | 'indoor' | 'unknown' = 'unknown'
): WeatherChecklistItem[] {
  // Indoor events do not need weather checklist items
  if (eventType === 'indoor') return []

  const matches: RuleMatch[] = []

  // Rain rules (precip probability > 40%)
  if (forecast.precipProbability > 40) {
    matches.push({
      text: 'Stage tarps and rain covers',
      category: 'equipment',
      urgency: 'required',
      priority: 1,
    })
    matches.push({
      text: 'Bring non-slip mats',
      category: 'safety',
      urgency: 'required',
      priority: 2,
    })
    matches.push({
      text: 'Protect electronics with covers',
      category: 'equipment',
      urgency: 'recommended',
      priority: 5,
    })
  }

  // Wind rules (> 15 mph)
  if (forecast.windSpeedMph > 15) {
    matches.push({
      text: 'Secure tablecloths with clips',
      category: 'equipment',
      urgency: 'recommended',
      priority: 6,
    })
    matches.push({
      text: 'Bring menu card holders',
      category: 'equipment',
      urgency: 'recommended',
      priority: 8,
    })
    matches.push({
      text: 'Check tent anchoring',
      category: 'safety',
      urgency: 'required',
      priority: 3,
    })
  }

  // Heat rules (> 90F)
  if (forecast.tempHighF > 90) {
    matches.push({
      text: 'Pack extra ice for cold chain',
      category: 'logistics',
      urgency: 'required',
      priority: 1,
    })
    matches.push({
      text: 'Bring shade canopy',
      category: 'equipment',
      urgency: 'recommended',
      priority: 7,
    })
    matches.push({
      text: 'Stock electrolytes for staff',
      category: 'safety',
      urgency: 'recommended',
      priority: 9,
    })
  }

  // Cold rules (< 40F)
  if (forecast.tempLowF < 40) {
    matches.push({
      text: 'Bring Sterno warmers',
      category: 'equipment',
      urgency: 'required',
      priority: 2,
    })
    matches.push({
      text: 'Pack insulated transport bags',
      category: 'logistics',
      urgency: 'required',
      priority: 3,
    })
    matches.push({
      text: 'Check propane levels',
      category: 'equipment',
      urgency: 'recommended',
      priority: 7,
    })
  }

  // Snow rules (condition contains "Snow")
  const isSnow = forecast.condition.toLowerCase().includes('snow')
  if (isSnow) {
    matches.push({
      text: 'Add 30min buffer to timeline',
      category: 'logistics',
      urgency: 'required',
      priority: 1,
    })
    matches.push({
      text: 'Bring rock salt for walkways',
      category: 'safety',
      urgency: 'required',
      priority: 2,
    })
  }

  // Thunderstorm rules
  const isThunderstorm = forecast.condition.toLowerCase().includes('thunderstorm')
  if (isThunderstorm) {
    matches.push({
      text: 'Prepare indoor fallback plan',
      category: 'logistics',
      urgency: 'required',
      priority: 1,
    })
  }

  // Sort: required first, then by priority number
  matches.sort((a, b) => {
    if (a.urgency === 'required' && b.urgency !== 'required') return -1
    if (a.urgency !== 'required' && b.urgency === 'required') return 1
    return a.priority - b.priority
  })

  // Deduplicate by text (same item can match multiple rules)
  const seen = new Set<string>()
  const deduped: RuleMatch[] = []
  for (const m of matches) {
    if (!seen.has(m.text)) {
      seen.add(m.text)
      deduped.push(m)
    }
  }

  // Cap at 5 items
  return deduped.slice(0, 5).map((m) => ({
    text: m.text,
    category: m.category,
    urgency: m.urgency,
    _priority: m.priority,
  }))
}

/**
 * Determine event type from weather_exposure and service_style fields.
 * weather_exposure comes from site assessments; service_style from event config.
 */
export function inferEventType(opts: {
  weatherExposure?: boolean | null
  hasOutdoorSpace?: boolean | null
  locationNotes?: string | null
}): 'outdoor' | 'indoor' | 'unknown' {
  // Explicit weather exposure flag from site assessment
  if (opts.weatherExposure === true) return 'outdoor'
  if (opts.weatherExposure === false && opts.hasOutdoorSpace === false) return 'indoor'

  // Check location notes for outdoor keywords
  if (opts.locationNotes) {
    const lower = opts.locationNotes.toLowerCase()
    const outdoorKeywords = [
      'outdoor',
      'patio',
      'garden',
      'backyard',
      'terrace',
      'rooftop',
      'lawn',
      'poolside',
      'deck',
    ]
    const indoorKeywords = [
      'indoor',
      'inside',
      'dining room',
      'kitchen',
      'ballroom',
      'banquet hall',
    ]

    if (outdoorKeywords.some((k) => lower.includes(k))) return 'outdoor'
    if (indoorKeywords.some((k) => lower.includes(k))) return 'indoor'
  }

  return 'unknown'
}
