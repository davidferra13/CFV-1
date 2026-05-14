import type {
  ChefRailAction,
  ChefRailCandidate,
  ChefRailCategory,
  ChefRailSettings,
  ChefRailState,
  RankedChefRailItem,
} from './chef-rail-contracts'
import { CHEF_RAIL_ALLOWED_ACTIONS } from './chef-rail-contracts'

const DEFAULT_CATEGORY_WEIGHT: Record<ChefRailCategory, number> = {
  opening: 0.95,
  follow_up: 1,
  event_risk: 1.15,
  menu_opportunity: 0.75,
  partner_lead: 0.6,
}

const SUPPRESSED_STATES = new Set(['dismissed', 'resolved', 'converted', 'expired', 'suppressed'])

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function daysSince(dateIso: string, now: Date): number {
  const timestamp = Date.parse(dateIso)
  if (!Number.isFinite(timestamp)) return 90
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000))
}

function isSnoozed(state: ChefRailState | undefined, now: Date): boolean {
  if (!state || state.state !== 'snoozed') return false
  if (!state.snoozedUntil) return true
  return Date.parse(state.snoozedUntil) > now.getTime()
}

export function validateChefRailAction(
  category: ChefRailCategory,
  action: ChefRailAction
): boolean {
  return CHEF_RAIL_ALLOWED_ACTIONS[category].includes(action)
}

export function scoreChefRailCandidate(
  candidate: ChefRailCandidate,
  settings: ChefRailSettings = { enabledCategories: {}, categoryWeights: {} },
  now: Date = new Date()
): number {
  const categoryWeight =
    settings.categoryWeights[candidate.category] ?? DEFAULT_CATEGORY_WEIGHT[candidate.category]
  const agePenalty = Math.min(18, daysSince(candidate.createdAt, now) * 1.5)
  const expiresSoonBoost =
    candidate.expiresAt && Date.parse(candidate.expiresAt) - now.getTime() < 2 * 86_400_000 ? 8 : 0
  const raw =
    candidate.urgency * 0.22 +
    candidate.moneyImpact * 0.16 +
    candidate.eventRisk * 0.2 +
    candidate.relationshipValue * 0.12 +
    candidate.confidence * 0.1 +
    candidate.freshness * 0.08 +
    candidate.actionability * 0.12 +
    expiresSoonBoost -
    agePenalty

  return Math.round(clampScore(raw * categoryWeight))
}

export function rankChefRailCandidates({
  candidates,
  states = [],
  settings = { enabledCategories: {}, categoryWeights: {} },
  now = new Date(),
  limit = 8,
}: {
  candidates: ChefRailCandidate[]
  states?: ChefRailState[]
  settings?: ChefRailSettings
  now?: Date
  limit?: number
}): RankedChefRailItem[] {
  const stateById = new Map(states.map((state) => [state.itemId, state]))

  return candidates
    .filter((candidate) => settings.enabledCategories[candidate.category] !== false)
    .filter((candidate) => validateChefRailAction(candidate.category, candidate.action))
    .filter((candidate) => candidate.tenantId.trim().length > 0)
    .filter((candidate) => {
      const state = stateById.get(candidate.id)
      if (!state) return true
      if (state.tenantId !== candidate.tenantId) return false
      if (SUPPRESSED_STATES.has(state.state)) return false
      return !isSnoozed(state, now)
    })
    .map((candidate) => ({
      ...candidate,
      score: scoreChefRailCandidate(candidate, settings, now),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
    )
    .slice(0, limit)
}

export function transitionChefRailState({
  current,
  nextState,
  now = new Date(),
  snoozedUntil = null,
}: {
  current: ChefRailState
  nextState: ChefRailState['state']
  now?: Date
  snoozedUntil?: string | null
}): ChefRailState {
  if (current.state === 'converted' && nextState !== 'converted') {
    return current
  }

  return {
    ...current,
    state: nextState,
    updatedAt: now.toISOString(),
    snoozedUntil: nextState === 'snoozed' ? snoozedUntil : null,
  }
}
