/**
 * Vendor Routing Utilities
 *
 * Pure scoring and classification functions for vendor call metrics.
 * No database access, no server actions. Used by vendor-memory.ts
 * for smart queue ranking.
 */

import type { VendorCallMetric } from '@/types/vendor-memory'

const DEPRIORITIZE_THRESHOLD = 5

/**
 * Score a vendor based on their call history metrics.
 *
 * Weights:
 *   - Answer rate: weight 3 (most important; vendors who pick up are gold)
 *   - Response quality: weight 2 (how helpful they are when they answer)
 *   - Price competitiveness: weight 1 (nice-to-have bonus)
 *   - Call window match: +10 bonus if current hour falls in best_call_window
 *   - Deprioritized: forced to -100 (pushed to bottom)
 *
 * Returns a score from -100 to ~100. Higher is better.
 */
export function scoreVendor(metrics: VendorCallMetric | null, currentHour: number): number {
  if (!metrics) return 0

  if (shouldDeprioritize(metrics)) return -100

  const answerRate =
    metrics.total_calls > 0 ? (metrics.answered_calls / metrics.total_calls) * 10 : 5 // neutral for unknown vendors
  const qualityScore = metrics.avg_response_quality
  const priceScore = metrics.avg_price_competitiveness

  let score = answerRate * 3 + qualityScore * 2 + priceScore * 1

  // Bonus if we are calling during their best window
  if (metrics.best_call_window) {
    const inWindow = isInCallWindow(metrics.best_call_window, currentHour)
    if (inWindow) score += 10
  }

  return Math.round(score * 100) / 100
}

/**
 * Determine the best call window from a list of answer times (HH:MM format).
 *
 * Strategy: find the 2-hour window with the most answers. If fewer than 3
 * data points, return null (not enough signal).
 */
export function computeBestCallWindow(answerTimes: string[]): string | null {
  if (answerTimes.length < 3) return null

  // Bucket answers by hour
  const hourCounts: Record<number, number> = {}
  for (const time of answerTimes) {
    const hour = parseHour(time)
    if (hour === null) continue
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  // Find the hour with the most answers, then build a 2-hour window around it
  let bestHour = -1
  let bestCount = 0
  for (const [hourStr, count] of Object.entries(hourCounts)) {
    const hour = Number(hourStr)
    // Count this hour + next hour as a window
    const windowCount = count + (hourCounts[(hour + 1) % 24] || 0)
    if (windowCount > bestCount) {
      bestCount = windowCount
      bestHour = hour
    }
  }

  if (bestHour < 0) return null

  const endHour = (bestHour + 2) % 24
  return `${padHour(bestHour)}:00-${padHour(endHour)}:00`
}

/**
 * Check if a vendor should be deprioritized (5+ consecutive no-answers).
 */
export function shouldDeprioritize(metrics: VendorCallMetric): boolean {
  return metrics.consecutive_no_answers >= DEPRIORITIZE_THRESHOLD
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Check if a given hour falls within a call window string like "06:00-08:00".
 */
function isInCallWindow(window: string, currentHour: number): boolean {
  const parts = window.split('-')
  if (parts.length !== 2) return false

  const startHour = parseHour(parts[0])
  const endHour = parseHour(parts[1])
  if (startHour === null || endHour === null) return false

  if (startHour <= endHour) {
    return currentHour >= startHour && currentHour < endHour
  }
  // Wraps midnight (e.g. "22:00-02:00")
  return currentHour >= startHour || currentHour < endHour
}

function parseHour(timeStr: string): number | null {
  const trimmed = timeStr.trim()
  const match = trimmed.match(/^(\d{1,2})/)
  if (!match) return null
  const h = parseInt(match[1], 10)
  if (h < 0 || h > 23) return null
  return h
}

function padHour(h: number): string {
  return h.toString().padStart(2, '0')
}
