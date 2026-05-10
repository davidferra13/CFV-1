// CIL Signal Scoring - Deduplication, ranking, and capping
// Pure logic: no DB access, no side effects

import type { ProactiveSignal } from './types'

/**
 * Score, deduplicate, and rank proactive signals.
 * - Deduplicates: same entity + same domain within 24h = keep highest urgency
 * - Sorts: urgency DESC, confidence DESC
 * - Caps at maxSignals (default 20)
 */
export function scoreSignals(
  signals: ProactiveSignal[],
  opts: { maxSignals?: number; dismissedIds?: Set<string> } = {}
): ProactiveSignal[] {
  const { maxSignals = 20, dismissedIds } = opts

  // Filter dismissed
  let filtered = dismissedIds
    ? signals.filter((s) => !dismissedIds.has(s.id) && !s.dismissedAt)
    : signals.filter((s) => !s.dismissedAt)

  // Deduplicate: same primary entity + same domain within 24h
  const seen = new Map<string, ProactiveSignal>()
  const DAY_MS = 86_400_000

  for (const signal of filtered) {
    const primaryEntity = signal.entityIds[0] ?? 'none'
    const key = `${signal.domain}:${primaryEntity}`
    const existing = seen.get(key)

    if (existing) {
      // Keep the higher urgency signal, or the more recent one if equal
      if (
        signal.urgency > existing.urgency ||
        (signal.urgency === existing.urgency && signal.createdAt > existing.createdAt)
      ) {
        seen.set(key, signal)
      }
    } else {
      seen.set(key, signal)
    }
  }

  filtered = Array.from(seen.values())

  // Sort: urgency DESC, then confidence DESC, then recency DESC
  filtered.sort((a, b) => {
    if (b.urgency !== a.urgency) return b.urgency - a.urgency
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    return b.createdAt - a.createdAt
  })

  return filtered.slice(0, maxSignals)
}

/**
 * Calculate a composite priority score (0-100) for UI ordering.
 * Higher = more important.
 */
export function priorityScore(signal: ProactiveSignal): number {
  const urgencyWeight = signal.urgency * 18 // 18-90
  const confidenceWeight = signal.confidence * 10 // 0-10
  return Math.min(100, Math.round(urgencyWeight + confidenceWeight))
}
