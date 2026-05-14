import type { DinnerFulfillmentMode } from './fulfillment-mode-contract'

export type DinnerRotationMemoryEntry = {
  id: string
  mode: Exclude<DinnerFulfillmentMode, 'either'>
  cuisine?: string | null
  conceptKey?: string | null
  chefId?: string | null
  operatorId?: string | null
  menuId?: string | null
  enjoyed?: boolean | null
  occurredAt: string
  tags?: readonly string[]
}

export type DinnerRotationCandidate = {
  id: string
  mode: Exclude<DinnerFulfillmentMode, 'either'>
  cuisine?: string | null
  conceptKey?: string | null
  chefId?: string | null
  operatorId?: string | null
  menuId?: string | null
  baseScore: number
}

export type RankedDinnerRotationCandidate = DinnerRotationCandidate & {
  freshnessScore: number
  repeatPenalty: number
  reasonCodes: string[]
}

export type DinnerRotationOptions = {
  now?: string
  cooldownDays?: number
  favoriteCandidateIds?: readonly string[]
}

function key(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function daysSince(occurredAt: string, now: string): number {
  const occurred = Date.parse(occurredAt)
  const current = Date.parse(now)
  if (!Number.isFinite(occurred) || !Number.isFinite(current)) return Number.POSITIVE_INFINITY
  return Math.max(0, (current - occurred) / 86_400_000)
}

export function rankDinnerRotationCandidates(
  candidates: readonly DinnerRotationCandidate[],
  memory: readonly DinnerRotationMemoryEntry[],
  options: DinnerRotationOptions = {}
): RankedDinnerRotationCandidate[] {
  const now = options.now ?? new Date().toISOString()
  const cooldownDays = options.cooldownDays ?? 14
  const favorites = new Set(options.favoriteCandidateIds ?? [])

  return candidates
    .map((candidate) => {
      let repeatPenalty = 0
      const reasonCodes: string[] = []

      for (const entry of memory) {
        const recent = daysSince(entry.occurredAt, now) <= cooldownDays
        if (!recent) continue

        if (key(candidate.conceptKey) && key(candidate.conceptKey) === key(entry.conceptKey)) {
          repeatPenalty += 0.45
          reasonCodes.push('recent_concept_repeat')
        }
        if (key(candidate.cuisine) && key(candidate.cuisine) === key(entry.cuisine)) {
          repeatPenalty += 0.2
          reasonCodes.push('recent_cuisine_repeat')
        }
        if (
          candidate.mode === 'eat_out' &&
          key(candidate.operatorId) &&
          key(candidate.operatorId) === key(entry.operatorId)
        ) {
          repeatPenalty += 0.25
          reasonCodes.push('recent_operator_repeat')
        }
        if (
          candidate.mode === 'eat_in' &&
          key(candidate.menuId) &&
          key(candidate.menuId) === key(entry.menuId)
        ) {
          repeatPenalty += 0.25
          reasonCodes.push('recent_menu_repeat')
        }
      }

      if (favorites.has(candidate.id)) {
        repeatPenalty = Math.max(0, repeatPenalty - 0.2)
        reasonCodes.push('favorite_softens_cooldown')
      }

      if (reasonCodes.length === 0) reasonCodes.push('fresh_rotation_slot')

      const freshnessScore = Math.max(0, Math.min(1, candidate.baseScore - repeatPenalty))
      return {
        ...candidate,
        repeatPenalty: Number(repeatPenalty.toFixed(2)),
        freshnessScore: Number(freshnessScore.toFixed(2)),
        reasonCodes: [...new Set(reasonCodes)],
      }
    })
    .sort((left, right) => right.freshnessScore - left.freshnessScore)
}

export type RebookingIntent =
  | 'same_chef'
  | 'similar_menu'
  | 'same_cuisine'
  | 'seasonal_version'
  | 'larger_group_version'

export type RebookingIntelligenceInput = {
  previous: DinnerRotationMemoryEntry
  targetGroupSize?: number | null
  currentMonth?: number | null
  requestedIntents?: readonly RebookingIntent[]
}

export type RebookingOption = {
  intent: RebookingIntent
  available: boolean
  confidence: number
  reasonCodes: string[]
}

export type RebookingIntelligence = {
  status: 'ready' | 'blocked'
  options: RebookingOption[]
  blockers: string[]
}

const DEFAULT_REBOOKING_INTENTS: RebookingIntent[] = [
  'same_chef',
  'similar_menu',
  'same_cuisine',
  'seasonal_version',
  'larger_group_version',
]

export function buildRebookingIntelligence(
  input: RebookingIntelligenceInput
): RebookingIntelligence {
  if (input.previous.enjoyed === false) {
    return {
      status: 'blocked',
      options: [],
      blockers: ['previous_experience_not_positive'],
    }
  }

  const intents = input.requestedIntents?.length
    ? [...input.requestedIntents]
    : DEFAULT_REBOOKING_INTENTS
  const options = intents.map((intent): RebookingOption => {
    if (intent === 'same_chef') {
      return {
        intent,
        available: Boolean(input.previous.chefId),
        confidence: input.previous.chefId ? 0.92 : 0.2,
        reasonCodes: input.previous.chefId ? ['chef_known'] : ['chef_missing'],
      }
    }
    if (intent === 'similar_menu') {
      return {
        intent,
        available: Boolean(input.previous.menuId || input.previous.conceptKey),
        confidence: input.previous.menuId ? 0.85 : input.previous.conceptKey ? 0.68 : 0.2,
        reasonCodes: input.previous.menuId ? ['menu_known'] : ['concept_only'],
      }
    }
    if (intent === 'same_cuisine') {
      return {
        intent,
        available: Boolean(input.previous.cuisine),
        confidence: input.previous.cuisine ? 0.75 : 0.15,
        reasonCodes: input.previous.cuisine ? ['cuisine_known'] : ['cuisine_missing'],
      }
    }
    if (intent === 'seasonal_version') {
      return {
        intent,
        available: Boolean(input.previous.cuisine || input.previous.conceptKey),
        confidence: 0.7,
        reasonCodes: ['seasonal_refresh_allowed'],
      }
    }

    return {
      intent,
      available: (input.targetGroupSize ?? 0) > 0,
      confidence: (input.targetGroupSize ?? 0) > 0 ? 0.72 : 0.25,
      reasonCodes:
        (input.targetGroupSize ?? 0) > 0
          ? ['target_group_size_known']
          : ['target_group_size_missing'],
    }
  })

  const blockers = options.every((option) => !option.available)
    ? ['no_repeat_anchor_available']
    : []

  return {
    status: blockers.length ? 'blocked' : 'ready',
    options,
    blockers,
  }
}
