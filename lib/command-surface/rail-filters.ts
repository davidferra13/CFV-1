import type { RailTier } from '@/lib/discovery/god-mode-types'
import type { EvidenceLabel, LoopState } from '@/lib/operating-loop/types'
import {
  isCriticalCommandSurfaceItem,
  type CommandSurfaceItem,
  type CommandSurfaceSourceKind,
} from './types'

export type RailEvidenceFilter = EvidenceLabel | 'has_proof' | 'missing_proof'
export type RailConfidenceFilter = 'any' | 'known' | 'unknown' | 'high' | 'medium' | 'low'

export interface RailFilterState {
  tiers: readonly RailTier[]
  domains: readonly string[]
  sourceKinds: readonly CommandSurfaceSourceKind[]
  loopStates: readonly LoopState[]
  evidence: readonly RailEvidenceFilter[]
  confidence: RailConfidenceFilter
}

export interface RailFilterResult {
  items: CommandSurfaceItem[]
  totalCount: number
  visibleCount: number
  hiddenCount: number
  hiddenCriticalCount: number
  state: RailFilterState
}

export const LIVE_RAIL_LOOP_STATES: readonly LoopState[] = [
  'active',
  'waiting',
  'blocked',
  'stale',
  'uncertain',
]

export const DEFAULT_RAIL_FILTER_STATE: RailFilterState = Object.freeze({
  tiers: Object.freeze([]),
  domains: Object.freeze([]),
  sourceKinds: Object.freeze([]),
  loopStates: Object.freeze([...LIVE_RAIL_LOOP_STATES]),
  evidence: Object.freeze([]),
  confidence: 'any',
})

export function clearRailFilterState(): RailFilterState {
  return cloneRailFilterState(DEFAULT_RAIL_FILTER_STATE)
}

export function resetRailFilterState(): RailFilterState {
  return clearRailFilterState()
}

export function cloneRailFilterState(state: RailFilterState): RailFilterState {
  return {
    tiers: [...state.tiers],
    domains: [...state.domains],
    sourceKinds: [...state.sourceKinds],
    loopStates: [...state.loopStates],
    evidence: [...state.evidence],
    confidence: state.confidence,
  }
}

export function applyRailFilters(
  items: readonly CommandSurfaceItem[],
  state: RailFilterState = DEFAULT_RAIL_FILTER_STATE
): RailFilterResult {
  const normalized = normalizeRailFilterState(state)
  const visible = items.filter((item) => matchesRailFilters(item, normalized))
  const visibleIds = new Set(visible.map((item) => item.id))
  const hiddenCriticalCount = items.filter(
    (item) => isCriticalCommandSurfaceItem(item) && !visibleIds.has(item.id)
  ).length

  return {
    items: visible,
    totalCount: items.length,
    visibleCount: visible.length,
    hiddenCount: items.length - visible.length,
    hiddenCriticalCount,
    state: normalized,
  }
}

export function matchesRailFilters(item: CommandSurfaceItem, state: RailFilterState): boolean {
  const normalized = normalizeRailFilterState(state)
  const loopState = item.loopState ?? 'active'

  return (
    matchesSet(item.tier ?? null, normalized.tiers) &&
    matchesSet(item.domain, normalized.domains) &&
    matchesSet(item.sourceKind, normalized.sourceKinds) &&
    matchesSet(loopState, normalized.loopStates) &&
    matchesEvidenceFilter(item, normalized.evidence) &&
    matchesConfidenceFilter(item.confidence, normalized.confidence)
  )
}

export function serializeRailFilterState(state: RailFilterState): string {
  const normalized = normalizeRailFilterState(state)
  const params = new URLSearchParams()

  setJoinedParam(params, 'tier', normalized.tiers)
  setJoinedParam(params, 'domain', normalized.domains)
  setJoinedParam(params, 'source', normalized.sourceKinds)
  if (!sameValues(normalized.loopStates, DEFAULT_RAIL_FILTER_STATE.loopStates)) {
    setJoinedParam(params, 'loop', normalized.loopStates)
  }
  setJoinedParam(params, 'evidence', normalized.evidence)
  if (normalized.confidence !== DEFAULT_RAIL_FILTER_STATE.confidence) {
    params.set('confidence', normalized.confidence)
  }

  params.sort()
  return params.toString()
}

export function parseRailFilterState(serialized: string | URLSearchParams): RailFilterState {
  const params = typeof serialized === 'string' ? new URLSearchParams(serialized) : serialized
  return normalizeRailFilterState({
    tiers: parseListParam<RailTier>(params, 'tier'),
    domains: parseListParam<string>(params, 'domain'),
    sourceKinds: parseListParam<CommandSurfaceSourceKind>(params, 'source'),
    loopStates: parseListParam<LoopState>(params, 'loop'),
    evidence: parseListParam<RailEvidenceFilter>(params, 'evidence'),
    confidence: parseConfidence(params.get('confidence')),
  })
}

export function normalizeRailFilterState(state: RailFilterState): RailFilterState {
  const loopStates = dedupePreservingOrder(state.loopStates)
  return {
    tiers: dedupePreservingOrder(state.tiers),
    domains: dedupePreservingOrder(state.domains),
    sourceKinds: dedupePreservingOrder(state.sourceKinds),
    loopStates: loopStates.length > 0 ? loopStates : [...DEFAULT_RAIL_FILTER_STATE.loopStates],
    evidence: dedupePreservingOrder(state.evidence),
    confidence: state.confidence ?? DEFAULT_RAIL_FILTER_STATE.confidence,
  }
}

function matchesSet<T extends string>(value: T | null, selected: readonly T[]): boolean {
  return selected.length === 0 || (value !== null && selected.includes(value))
}

function matchesEvidenceFilter(
  item: CommandSurfaceItem,
  selected: readonly RailEvidenceFilter[]
): boolean {
  if (selected.length === 0) return true
  const hasProof = Boolean(item.proof?.present)
  const hasMissingProofRisk = item.riskSignals.some((signal) => signal.zone === 'missing_proof')

  return selected.some((filter) => {
    if (filter === 'has_proof') return hasProof
    if (filter === 'missing_proof') return !hasProof || hasMissingProofRisk
    return item.evidenceLabel === filter
  })
}

function matchesConfidenceFilter(confidence: number | null, filter: RailConfidenceFilter): boolean {
  switch (filter) {
    case 'any':
      return true
    case 'known':
      return confidence !== null
    case 'unknown':
      return confidence === null
    case 'high':
      return confidence !== null && confidence >= 0.75
    case 'medium':
      return confidence !== null && confidence >= 0.4 && confidence < 0.75
    case 'low':
      return confidence !== null && confidence < 0.4
  }
}

function setJoinedParam(params: URLSearchParams, key: string, values: readonly string[]): void {
  if (values.length > 0) params.set(key, [...values].sort().join(','))
}

function parseListParam<T extends string>(params: URLSearchParams, key: string): T[] {
  const raw = params.get(key)
  if (!raw) return []
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) as T[]
}

function parseConfidence(raw: string | null): RailConfidenceFilter {
  switch (raw) {
    case 'known':
    case 'unknown':
    case 'high':
    case 'medium':
    case 'low':
      return raw
    default:
      return DEFAULT_RAIL_FILTER_STATE.confidence
  }
}

function dedupePreservingOrder<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return sortedLeft.every((value, index) => value === sortedRight[index])
}
