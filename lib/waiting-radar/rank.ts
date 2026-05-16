import type { WaitingRadarItem, WaitingRadarRiskLevel } from './types'

const RISK_WEIGHT: Record<WaitingRadarRiskLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const SOURCE_WEIGHT: Partial<Record<WaitingRadarItem['sourceKind'], number>> = {
  payment: 0,
  quote: 1,
  event: 2,
  vendor: 3,
  system: 4,
  task: 5,
  reminder: 6,
  notification: 7,
}

export function rankWaitingRadarItems(
  items: WaitingRadarItem[],
  options?: { now?: Date }
): WaitingRadarItem[] {
  const now = options?.now ?? new Date()
  return [...items].sort((a, b) => {
    const overdueDiff = overdueWeight(a, now) - overdueWeight(b, now)
    if (overdueDiff !== 0) return overdueDiff

    const riskDiff = RISK_WEIGHT[a.riskLevel] - RISK_WEIGHT[b.riskLevel]
    if (riskDiff !== 0) return riskDiff

    const followUpDiff = nullableTime(a.followUpAt) - nullableTime(b.followUpAt)
    if (followUpDiff !== 0) return followUpDiff

    const sourceDiff = (SOURCE_WEIGHT[a.sourceKind] ?? 99) - (SOURCE_WEIGHT[b.sourceKind] ?? 99)
    if (sourceDiff !== 0) return sourceDiff

    return a.id.localeCompare(b.id)
  })
}

export function dedupeWaitingRadarItems(items: WaitingRadarItem[]): WaitingRadarItem[] {
  const winners = new Map<string, WaitingRadarItem>()

  for (const item of items) {
    const key = `${item.sourceKind}:${item.sourceId}`
    const current = winners.get(key)
    if (!current || isStronger(item, current)) {
      winners.set(key, item)
    }
  }

  return [...winners.values()]
}

function isStronger(candidate: WaitingRadarItem, current: WaitingRadarItem): boolean {
  const candidateRisk = RISK_WEIGHT[candidate.riskLevel]
  const currentRisk = RISK_WEIGHT[current.riskLevel]
  if (candidateRisk !== currentRisk) return candidateRisk < currentRisk

  if (candidate.followUpAt && current.followUpAt) {
    return new Date(candidate.followUpAt).getTime() < new Date(current.followUpAt).getTime()
  }

  if (candidate.followUpAt !== current.followUpAt) return !!candidate.followUpAt
  return candidate.proofHref.length > current.proofHref.length
}

function overdueWeight(item: WaitingRadarItem, now: Date): number {
  if (!item.followUpAt) return 2
  return new Date(item.followUpAt).getTime() <= now.getTime() ? 0 : 1
}

function nullableTime(value: string | null): number {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER
}
