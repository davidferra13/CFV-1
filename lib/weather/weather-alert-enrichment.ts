// Weather Alert Enrichment
// Chef-specific, event-type-aware weather guidance.
// Pure functions, no DB dependency.

// ---- Types ----

export type EventType = 'outdoor' | 'indoor' | 'unknown'

export interface WeatherGuidance {
  /** Chef-specific actionable messages */
  tips: string[]
  /** Whether any guidance was generated */
  hasGuidance: boolean
}

export interface EnrichedWeatherAlert {
  alertLevel: 'info' | 'warning' | 'severe'
  alertMessage: string
  /** Chef-specific contextual guidance (outdoor/indoor aware) */
  chefGuidance: string[]
}

/** Minimal forecast shape needed for enrichment (decoupled from Remy internals) */
export interface EnrichableForecast {
  tempHighF: number
  tempLowF: number
  precipitationProbability: number
  precipitationMm: number
  weatherCode: number
  weatherDescription: string
  windSpeedKmh: number
}

// ---- Enrichment ----

/**
 * Generate chef-specific, event-type-aware weather guidance.
 * Pure function: no side effects, no DB access.
 *
 * Wind thresholds (outdoor/unknown only):
 *   >15mph: tent caution, burner windscreens
 *   >25mph: secure equipment, anchor stakes
 *   >40mph: cancel outdoor setup
 *
 * Heat thresholds:
 *   >85F (outdoor): shade placement, cooler timing
 *   >90F: cold chain risk, ice baths, dairy/seafood monitoring
 *   >100F: extreme cold chain, rotate perishables every 30 min
 *
 * Rain probability:
 *   >40% (outdoor): stage tarps
 *   >60%: tent recommendation (outdoor) or wet arrival plan (indoor)
 *
 * Freezing:
 *   <=32F: protect liquids, warm plating, sterno check
 *   <=15F: pipe risk, hot holding, transport insulation
 *
 * Special codes: thunderstorms, snow, fog
 */
export function enrichWeatherAlert(forecast: EnrichableForecast, eventType: EventType): string[] {
  const guidance: string[] = []
  const windMph = Math.round(forecast.windSpeedKmh * 0.621)
  const isOutdoor = eventType === 'outdoor' || eventType === 'unknown'

  // ---- Wind thresholds (tiered, outdoor-focused) ----
  if (isOutdoor) {
    if (windMph >= 40) {
      guidance.push(
        `Wind ${windMph}mph: cancel outdoor setup. Tents, chafing dishes, and signage become projectiles.`
      )
    } else if (windMph >= 25) {
      guidance.push(
        `Wind ${windMph}mph: outdoor service risk. Secure all tablecloths, use weighted covers, anchor tent stakes deep.`
      )
    } else if (windMph >= 15) {
      guidance.push(
        `Wind ${windMph}mph: tent caution. Use windscreens for burners, clip menus, weight napkins.`
      )
    }
  }

  // ---- Heat thresholds (food safety focused) ----
  if (forecast.tempHighF >= 100) {
    guidance.push(
      `Extreme heat ${forecast.tempHighF}F: cold chain critical. Double ice for all stations. ` +
        `Prep ice bath stations for holding. Rotate perishables every 30 min. Staff hydration mandatory.`
    )
  } else if (forecast.tempHighF >= 90) {
    guidance.push(
      `Heat ${forecast.tempHighF}F: cold chain risk. Prep ice bath stations for cold holds. ` +
        `Keep backup ice on hand. Dairy, seafood, and sauces need constant monitoring.`
    )
  } else if (forecast.tempHighF >= 85 && isOutdoor) {
    guidance.push(
      `Warm day ${forecast.tempHighF}F: keep proteins in coolers until last possible moment. ` +
        `Consider shade placement for buffet stations.`
    )
  }

  // ---- Freezing thresholds ----
  if (forecast.tempLowF <= 15) {
    guidance.push(
      `Dangerously cold ${forecast.tempLowF}F: pipes and water lines at risk. ` +
        `Hot holding gear essential. Transport insulation is critical.`
    )
  } else if (forecast.tempLowF <= 32) {
    guidance.push(
      `Freezing temps ${forecast.tempLowF}F: protect sauces and liquids during transport. ` +
        `Warm plating if serving outdoors. Sterno supply check.`
    )
  }

  // ---- Rain and precipitation ----
  if (forecast.precipitationProbability >= 70 || forecast.precipitationMm >= 10) {
    if (isOutdoor) {
      guidance.push(
        'High rain probability: cover all electronics and speakers. Bring tarps for setup area. ' +
          'Non-slip mats for serving stations. Tent sidewalls recommended.'
      )
    } else {
      guidance.push(
        'Rain expected: plan for wet guest arrivals. Entry mats, coat handling, umbrella storage.'
      )
    }
  } else if (forecast.precipitationProbability >= 40 && isOutdoor) {
    guidance.push(
      'Moderate rain chance: have tarps staged but not deployed. Quick-cover plan for equipment.'
    )
  }

  // ---- Thunderstorms ----
  if ([95, 96, 99].includes(forecast.weatherCode)) {
    guidance.push(
      'Thunderstorms forecast: mandatory indoor backup plan. No metal tent poles during lightning. ' +
        'Have a 30-minute shelter protocol ready for guests and staff.'
    )
  }

  // ---- Snow ----
  if ([71, 73, 75, 77, 85, 86].includes(forecast.weatherCode)) {
    if (isOutdoor) {
      guidance.push(
        'Snow expected: outdoor service not advisable. If proceeding, heated serving stations required. ' +
          'Salt walkways, clear paths frequently.'
      )
    } else {
      guidance.push(
        'Snow expected: guests may arrive late. Build 30-min buffer into timeline. ' +
          'Check delivery access and parking for your vehicle.'
      )
    }
  }

  // ---- Fog ----
  if ([45, 48].includes(forecast.weatherCode)) {
    guidance.push(
      'Fog expected: extra drive time for you and deliveries. Poor visibility for outdoor signage.'
    )
  }

  return guidance
}

/**
 * Convenience wrapper that returns a WeatherGuidance object.
 */
export function getWeatherGuidance(
  forecast: EnrichableForecast,
  eventType: EventType
): WeatherGuidance {
  const tips = enrichWeatherAlert(forecast, eventType)
  return { tips, hasGuidance: tips.length > 0 }
}

/**
 * Infer event type from occasion text. Simple keyword heuristic.
 */
export function inferEventType(occasion: string | null): EventType {
  if (!occasion) return 'unknown'
  const lower = occasion.toLowerCase()
  const outdoorKeywords = [
    'outdoor',
    'garden',
    'patio',
    'backyard',
    'bbq',
    'barbecue',
    'grill',
    'picnic',
    'farm',
    'vineyard',
    'rooftop',
    'poolside',
    'pool party',
    'beach',
    'lawn',
    'terrace',
    'courtyard',
    'tent',
    'al fresco',
  ]
  const indoorKeywords = [
    'indoor',
    'kitchen',
    'dining room',
    'restaurant',
    'studio',
    'apartment',
    'condo',
    'house',
    'home',
    'loft',
    'hall',
    'ballroom',
  ]

  if (outdoorKeywords.some((kw) => lower.includes(kw))) return 'outdoor'
  if (indoorKeywords.some((kw) => lower.includes(kw))) return 'indoor'
  return 'unknown'
}
