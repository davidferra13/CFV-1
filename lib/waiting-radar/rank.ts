// Waiting State Radar - Ranking
// Sorts waiting items by overdue status, revenue risk, event proximity, and age.

import type { WaitingItem, WaitingRadarSummary, WaitingRadarResult } from './types'

const RISK_WEIGHT: Record<string, number> = {
  critical: 1000,
  high: 700,
  medium: 400,
  low: 100,
}

function overduePenalty(item: WaitingItem): number {
  if (!item.followUpAt) return 0
  const now = Date.now()
  const followUp = new Date(item.followUpAt).getTime()
  if (followUp > now) return 0
  const overdueHours = (now - followUp) / (1000 * 60 * 60)
  return Math.min(overdueHours * 10, 500)
}

function revenueWeight(item: WaitingItem): number {
  if (!item.revenueCents) return 0
  const dollars = item.revenueCents / 100
  if (dollars > 2000) return 300
  if (dollars > 500) return 200
  if (dollars > 100) return 100
  return 50
}

function ageWeight(item: WaitingItem): number {
  const ageHours = (Date.now() - new Date(item.waitingSince).getTime()) / (1000 * 60 * 60)
  if (ageHours > 168) return 200
  if (ageHours > 72) return 100
  if (ageHours > 24) return 50
  return 0
}

function scoreItem(item: WaitingItem): number {
  return (
    RISK_WEIGHT[item.riskLevel] +
    overduePenalty(item) +
    revenueWeight(item) +
    ageWeight(item)
  )
}

function computeSummary(items: WaitingItem[]): WaitingRadarSummary {
  const now = Date.now()
  const soon = now + 48 * 60 * 60 * 1000

  let overdue = 0
  let dueSoon = 0
  let waitingOnClient = 0
  let waitingOnChef = 0
  let waitingOnSystem = 0
  let waitingOnVendor = 0
  let waitingOnPayment = 0

  for (const item of items) {
    if (item.followUpAt) {
      const t = new Date(item.followUpAt).getTime()
      if (t < now) overdue++
      else if (t < soon) dueSoon++
    }
    if (item.waitingOn === 'client') waitingOnClient++
    if (item.waitingOn === 'chef') waitingOnChef++
    if (item.waitingOn === 'system') waitingOnSystem++
    if (item.waitingOn === 'vendor') waitingOnVendor++
    if (item.waitingOn === 'payment') waitingOnPayment++
  }

  return {
    total: items.length,
    overdue,
    dueSoon,
    waitingOnClient,
    waitingOnChef,
    waitingOnSystem,
    waitingOnVendor,
    waitingOnPayment,
  }
}

/**
 * Rank and summarize waiting items. Returns full radar result.
 */
export function rankWaitingItems(items: WaitingItem[]): WaitingRadarResult {
  const scored = items
    .map((item) => ({ item, score: scoreItem(item) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item)

  return {
    items: scored,
    summary: computeSummary(scored),
    computedAt: new Date().toISOString(),
  }
}
