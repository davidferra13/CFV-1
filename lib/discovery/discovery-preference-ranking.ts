const DISCOVERY_INTERACTION_HALF_LIFE_DAYS = 45

const ACTION_WEIGHTS: Record<string, number> = {
  impression: 0.08,
  ignore: -0.2,
  click: 3,
  select: 3,
  view: 0.15,
  love: 10,
  like: 10,
  save: 8,
  favorite: 8,
  share: 1.25,
  long_dwell: 2,
  search_submit: 2,
  inquiry: 7,
  inquiry_started: 7,
  inquiry_submitted: 12,
  book: 14,
  booking: 14,
  quick_back: -2,
  dismiss: -4,
  hate: -10,
  hide: -12,
  skip: -0.35,
  dislike: -10,
  remove: -8,
  not_interested: -10,
}

export type DiscoveryInteractionSignalRow = {
  item_type: string | null
  item_value: string | null
  action: string | null
  created_at: string | null
}

export type RankedDiscoveryPreference = {
  /** Discovery interaction item_type, e.g. cuisine, service, occasion. */
  itemType: string
  /** Canonical discovery value for the item_type. */
  itemValue: string
  /** Net score: positiveScore - negativeScore. */
  score: number
  /** Decayed positive action score. */
  positiveScore: number
  /** Decayed absolute negative action score. */
  negativeScore: number
  /** Total interactions contributing to this item_type/item_value pair. */
  interactionCount: number
  positiveInteractionCount: number
  negativeInteractionCount: number
  lastInteractedAt: string | null
}

/**
 * Scores discovery_interactions rows by item_type/item_value using action weights and time decay.
 * Kept pure so the personalization model can be regression-tested without a database.
 */
export function rankDiscoveryInteractionPreferences(
  rows: DiscoveryInteractionSignalRow[],
  now = new Date()
): RankedDiscoveryPreference[] {
  const grouped = new Map<
    string,
    Omit<RankedDiscoveryPreference, 'score'> & { latestTime: number }
  >()
  const nowMs = now.getTime()

  for (const row of rows) {
    const itemType = normalizePreferenceToken(row.item_type)
    const itemValue = normalizePreferenceToken(row.item_value)
    if (!itemType || !itemValue) continue

    const weight = getActionWeight(row.action)
    if (weight === 0) continue

    const interactedAt = parseInteractionDate(row.created_at)
    const ageDays = Math.max(0, (nowMs - interactedAt.getTime()) / 86_400_000)
    const decayedWeight = weight * Math.pow(0.5, ageDays / DISCOVERY_INTERACTION_HALF_LIFE_DAYS)
    const key = `${itemType}\u0000${itemValue}`
    const existing =
      grouped.get(key) ??
      ({
        itemType,
        itemValue,
        positiveScore: 0,
        negativeScore: 0,
        interactionCount: 0,
        positiveInteractionCount: 0,
        negativeInteractionCount: 0,
        lastInteractedAt: null,
        latestTime: 0,
      } satisfies Omit<RankedDiscoveryPreference, 'score'> & { latestTime: number })

    existing.interactionCount += 1
    if (decayedWeight > 0) {
      existing.positiveScore += decayedWeight
      existing.positiveInteractionCount += 1
    } else {
      existing.negativeScore += Math.abs(decayedWeight)
      existing.negativeInteractionCount += 1
    }

    if (interactedAt.getTime() > existing.latestTime) {
      existing.latestTime = interactedAt.getTime()
      existing.lastInteractedAt = interactedAt.toISOString()
    }

    grouped.set(key, existing)
  }

  return Array.from(grouped.values())
    .map(({ latestTime: _latestTime, ...preference }) => ({
      ...preference,
      positiveScore: roundScore(preference.positiveScore),
      negativeScore: roundScore(preference.negativeScore),
      score: roundScore(preference.positiveScore - preference.negativeScore),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.positiveScore !== a.positiveScore) return b.positiveScore - a.positiveScore
      return (b.lastInteractedAt ?? '').localeCompare(a.lastInteractedAt ?? '')
    })
}

export function normalizePreferenceToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function getActionWeight(action: string | null): number {
  if (!action) return ACTION_WEIGHTS.click
  return ACTION_WEIGHTS[normalizePreferenceToken(action)] ?? 0
}

function parseInteractionDate(value: string | null): Date {
  if (!value) return new Date(0)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

function roundScore(score: number): number {
  return Math.round(score * 1000) / 1000
}
