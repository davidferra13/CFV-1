import type {
  GodModeResolvedItem,
  GodModeRailResult,
  GodModeStripResult,
  RailTier,
} from './god-mode-types'
import { TIER_ORDER, compareTiers } from './god-mode-types'

const LOOP_STATE_WEIGHT: Partial<Record<NonNullable<GodModeResolvedItem['loopState']>, number>> = {
  active: 12,
  waiting: 16,
  blocked: 20,
  uncertain: 10,
  stale: -10,
  snoozed: -20,
  dismissed: -40,
  done: -60,
}

const EVIDENCE_WEIGHT: Partial<Record<NonNullable<GodModeResolvedItem['evidenceLabel']>, number>> =
  {
    confirmed: 12,
    computed: 8,
    user_entered: 6,
    inferred: 2,
    claimed: 0,
    unknown: -4,
    stale: -8,
    disputed: -16,
  }

const SOURCE_WEIGHT: Partial<Record<NonNullable<GodModeResolvedItem['sourceKind']>, number>> = {
  inquiry: 12,
  message: 10,
  payment: 10,
  handoff: 9,
  event: 8,
  quote: 7,
  task: 6,
  reminder: 5,
  vendor: 5,
  notification: 4,
  client_profile: 3,
  menu: 3,
  recipe: 3,
  system: 1,
}

function hoursUntil(value: string | Date | null | undefined, now: Date): number | null {
  if (!value) return null
  const ms = value instanceof Date ? value.getTime() : Date.parse(value)
  if (!Number.isFinite(ms)) return null
  return (ms - now.getTime()) / 3_600_000
}

function stableItemKey(item: GodModeResolvedItem): string {
  const dataId =
    item.data?.handoffId ??
    item.data?.sourceId ??
    item.data?.sourceItemId ??
    item.data?.eventId ??
    item.data?.inquiryId ??
    item.data?.quoteId ??
    item.data?.paymentId ??
    item.data?.messageThreadId

  if (typeof dataId === 'string' && dataId.length > 0) {
    return `${item.sourceKind ?? item.definitionId}:${dataId}`
  }

  const routeKey = item.proofHref ?? item.destination
  return `${item.sourceKind ?? item.definitionId}:${routeKey}`
}

function chooseStrongerItem(
  current: GodModeResolvedItem,
  candidate: GodModeResolvedItem,
  now: Date
): GodModeResolvedItem {
  const tierDiff = compareTiers(candidate.tier, current.tier)
  if (tierDiff < 0) return mergeItemMemory(candidate, current)
  if (tierDiff > 0) return mergeItemMemory(current, candidate)

  const candidateScore = getOperatingLoopScore(candidate, now)
  const currentScore = getOperatingLoopScore(current, now)
  if (candidateScore > currentScore) return mergeItemMemory(candidate, current)
  return mergeItemMemory(current, candidate)
}

function mergeItemMemory(
  winner: GodModeResolvedItem,
  duplicate: GodModeResolvedItem
): GodModeResolvedItem {
  return {
    ...winner,
    context: winner.context || duplicate.context,
    nextAction: winner.nextAction ?? duplicate.nextAction ?? null,
    waitingOn: winner.waitingOn ?? duplicate.waitingOn ?? null,
    resumeContext: winner.resumeContext ?? duplicate.resumeContext ?? null,
    proofHref: winner.proofHref ?? duplicate.proofHref ?? null,
    evidenceLabel: winner.evidenceLabel ?? duplicate.evidenceLabel,
    confidence: winner.confidence ?? duplicate.confidence ?? null,
    data: {
      ...duplicate.data,
      ...winner.data,
      duplicateDefinitionIds: [
        ...new Set([
          ...((duplicate.data?.duplicateDefinitionIds as string[] | undefined) ?? []),
          duplicate.definitionId,
          ...((winner.data?.duplicateDefinitionIds as string[] | undefined) ?? []),
        ]),
      ],
    },
  }
}

export function getOperatingLoopScore(item: GodModeResolvedItem, now: Date): number {
  let score = item.score ?? 0

  if (item.loopState) score += LOOP_STATE_WEIGHT[item.loopState] ?? 0
  if (item.evidenceLabel) score += EVIDENCE_WEIGHT[item.evidenceLabel] ?? 0
  if (item.sourceKind) score += SOURCE_WEIGHT[item.sourceKind] ?? 0
  if (typeof item.confidence === 'number') score += Math.round(item.confidence * 10)
  if (item.nextAction) score += 4
  if (item.proofHref) score += 2

  const followUpHours = hoursUntil(item.waitingOn?.followUpAt ?? null, now)
  if (followUpHours !== null) {
    if (followUpHours <= 0) score += 24
    else if (followUpHours <= 24) score += 16
    else if (followUpHours <= 72) score += 8
  }

  const resumeAgeHours = hoursUntil(item.resumeContext?.timestamp ?? null, now)
  if (resumeAgeHours !== null && resumeAgeHours <= 0 && resumeAgeHours >= -48) {
    score += 6
  }

  return score
}

export function dedupeOperatingLoopItems(
  items: GodModeResolvedItem[],
  now: Date
): GodModeResolvedItem[] {
  const byKey = new Map<string, GodModeResolvedItem>()

  for (const item of items) {
    const key = stableItemKey(item)
    const current = byKey.get(key)
    byKey.set(key, current ? chooseStrongerItem(current, item, now) : item)
  }

  return Array.from(byKey.values())
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

const TIER_ABOVE: Record<RailTier, RailTier> = {
  p0: 'p0', // Can't go higher
  p1: 'p0',
  p2: 'p1',
  p3: 'p2',
  p4: 'p3',
}

export function applyEscalation(item: GodModeResolvedItem, now: Date): GodModeResolvedItem {
  if (!item.escalatesAt) return item
  if (item.escalatesAt.getTime() > now.getTime()) return item
  return { ...item, tier: TIER_ABOVE[item.tier] }
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function assembleGodModeRail(
  items: GodModeResolvedItem[],
  dismissedIds: Set<string>,
  now: Date
): GodModeRailResult {
  // 1. Filter dismissed
  const active = items.filter((item) => !dismissedIds.has(item.definitionId))

  // 2. Apply escalation
  const escalated = active.map((item) => applyEscalation(item, now))

  // 3. Filter expired
  const unexpired = escalated.filter((item) => {
    if (!item.expiresAt) return true
    return item.expiresAt.getTime() > now.getTime()
  })

  // 4. Collapse duplicate memories from overlapping resolvers.
  const deduped = dedupeOperatingLoopItems(unexpired, now)

  // 5. Group by tier
  const tiers: Record<RailTier, GodModeResolvedItem[]> = {
    p0: [],
    p1: [],
    p2: [],
    p3: [],
    p4: [],
  }

  for (const item of deduped) {
    tiers[item.tier].push(item)
  }

  // 6. Sort within each tier by operating-loop score.
  for (const tier of TIER_ORDER) {
    tiers[tier].sort((a, b) => getOperatingLoopScore(b, now) - getOperatingLoopScore(a, now))
  }

  return {
    tiers,
    totalItems: deduped.length,
    assembledAt: now.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Strip extraction (for compact bar)
// ---------------------------------------------------------------------------

export function extractStrip(
  items: GodModeResolvedItem[],
  now: Date,
  maxItems = 5
): GodModeStripResult {
  // Filter to P0 and P1 only
  const urgent = dedupeOperatingLoopItems(
    items.filter((item) => item.tier === 'p0' || item.tier === 'p1'),
    now
  )

  // Sort: P0 first, then P1, then by score within tier
  urgent.sort((a, b) => {
    const tierDiff = compareTiers(a.tier, b.tier)
    if (tierDiff !== 0) return tierDiff
    return getOperatingLoopScore(b, now) - getOperatingLoopScore(a, now)
  })

  return {
    items: urgent.slice(0, maxItems),
    hasP0: urgent.some((item) => item.tier === 'p0'),
    totalUrgent: urgent.length,
  }
}
