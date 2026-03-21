// Weather Risk Assessment - Deterministic Formula
// Pure math. No AI. Scores weather conditions 0-100 for outdoor event safety.
// Higher score = more weather-related risk for the event.

import type { DailyForecast } from '@/lib/weather/open-meteo'

// ── Types ────────────────────────────────────────────────────────────────────

export type WeatherRiskLevel = 'low' | 'moderate' | 'high' | 'severe'

export type WeatherRiskResult = {
  /** Overall risk score, 0-100 */
  score: number
  /** Categorical risk level */
  riskLevel: WeatherRiskLevel
  /** Human-readable warnings for the chef */
  warnings: string[]
}

// ── Thresholds ───────────────────────────────────────────────────────────────

function getLevel(score: number): WeatherRiskLevel {
  if (score <= 20) return 'low'
  if (score <= 40) return 'moderate'
  if (score <= 60) return 'high'
  return 'severe'
}

// ── Calculator ───────────────────────────────────────────────────────────────

/**
 * Assess weather risk for a single day's forecast.
 * Returns a deterministic score (0-100) with warnings.
 */
export function assessWeatherRisk(forecast: DailyForecast): WeatherRiskResult {
  let score = 0
  const warnings: string[] = []

  // Precipitation probability
  if (forecast.precipProbability > 70) {
    score += 30
    warnings.push(`High chance of rain (${forecast.precipProbability}%)`)
  } else if (forecast.precipProbability > 40) {
    score += 15
    warnings.push(`Moderate rain chance (${forecast.precipProbability}%)`)
  }

  // Wind speed
  if (forecast.windSpeedMph > 25) {
    score += 25
    warnings.push(`Strong winds (${forecast.windSpeedMph} mph)`)
  } else if (forecast.windSpeedMph > 15) {
    score += 10
  }

  // Extreme heat
  if (forecast.tempHighF > 95) {
    score += 20
    warnings.push(`Extreme heat (${forecast.tempHighF}F)`)
  }

  // Freezing temperatures
  if (forecast.tempLowF < 32) {
    score += 20
    warnings.push(`Freezing temperatures (${forecast.tempLowF}F low)`)
  }

  // Thunderstorms (weather code 95-99)
  if (forecast.weatherCode >= 95) {
    score += 30
    warnings.push('Thunderstorms forecast')
  }

  // Snow (weather code 71-77)
  if (forecast.weatherCode >= 71 && forecast.weatherCode <= 77) {
    score += 25
    warnings.push('Snow forecast')
  }

  // Clamp to 0-100
  const finalScore = Math.min(100, Math.max(0, score))

  return {
    score: finalScore,
    riskLevel: getLevel(finalScore),
    warnings,
  }
}
