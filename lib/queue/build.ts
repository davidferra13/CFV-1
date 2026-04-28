// Priority Queue - Builder
// Calls all providers in parallel, merges, deduplicates, sorts by score.

import type { PriorityQueue, QueueItem, QueueDomain, QueueUrgency, QueueSummary } from './types'
import type { DashboardWorkSurface } from '@/lib/workflow/types'

import { getInquiryQueueItems } from './providers/inquiry'
import { getMessageQueueItems } from './providers/message'
import { getQuoteQueueItems } from './providers/quote'
import { convertWorkItemsToQueueItems } from './providers/event'
import { getTaskQueueItems } from './providers/task'
import { getFinancialQueueItems } from './providers/financial'
import { getPostEventQueueItems } from './providers/post-event'
import { getClientQueueItems } from './providers/client'
import { getCulinaryQueueItems } from './providers/culinary'
import { getContactQueueItems } from './providers/contact'
import { getNetworkQueueItems } from './providers/network'

/**
 * Build the complete priority queue.
 *
 * - All providers run in parallel (Promise.all)
 * - Work Surface passed in (already fetched by caller)
 * - Items merged, deduplicated by id, sorted by score descending
 */
export async function buildPriorityQueue(
  db: any,
  tenantId: string,
  workSurface: DashboardWorkSurface
): Promise<PriorityQueue> {
  const now = new Date()

  // Convert existing work items (stages 1-13 only, synchronous)
  const allWorkItems = [
    ...workSurface.fragile,
    ...workSurface.preparable,
    ...workSurface.blocked,
    ...workSurface.optionalEarly,
  ]
  // Deduplicate work items (fragile is a subset of preparable)
  const seenWorkIds = new Set<string>()
  const uniqueWorkItems = allWorkItems.filter((wi) => {
    if (seenWorkIds.has(wi.id)) return false
    seenWorkIds.add(wi.id)
    return true
  })
  const eventItems = convertWorkItemsToQueueItems(uniqueWorkItems)

  // Fetch all other domain items in parallel
  const [
    inquiryItems,
    messageItems,
    quoteItems,
    taskItems,
    financialItems,
    postEventItems,
    clientItems,
    culinaryItems,
    contactItems,
    networkItems,
  ] = await Promise.all([
    safeProvider('inquiry', () => getInquiryQueueItems(db, tenantId)),
    safeProvider('message', () => getMessageQueueItems(db, tenantId)),
    safeProvider('quote', () => getQuoteQueueItems(db, tenantId)),
    safeProvider('task', () => getTaskQueueItems(db, tenantId)),
    safeProvider('financial', () => getFinancialQueueItems(db, tenantId)),
    safeProvider('post_event', () => getPostEventQueueItems(db, tenantId)),
    safeProvider('client', () => getClientQueueItems(db, tenantId)),
    safeProvider('culinary', () => getCulinaryQueueItems(db, tenantId)),
    safeProvider('contact', () => getContactQueueItems(db, tenantId)),
    safeProvider('network', () => getNetworkQueueItems(db, tenantId)),
  ])

  // Merge all items
  const merged = [
    ...eventItems,
    ...inquiryItems,
    ...messageItems,
    ...quoteItems,
    ...taskItems,
    ...financialItems,
    ...postEventItems,
    ...clientItems,
    ...culinaryItems,
    ...contactItems,
    ...networkItems,
  ]

  // Deduplicate by ID (first occurrence wins)
  const seen = new Set<string>()
  const deduped: QueueItem[] = []
  for (const item of merged) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      deduped.push(item)
    }
  }

  // Sort by score descending
  deduped.sort((a, b) => b.score - a.score)

  const summary = computeSummary(deduped)

  // Time-aware next action selection
  const nextAction = selectNextAction(deduped, now)

  return {
    items: deduped,
    nextAction,
    summary,
    computedAt: now.toISOString(),
  }
}

/**
 * Select the best next action using time-of-day weighting.
 * Morning: prioritize prep/shopping. Afternoon: communication/admin. Evening: planning.
 */
function selectNextAction(items: QueueItem[], now: Date): QueueItem | null {
  if (items.length === 0) return null

  const hour = now.getHours()

  // Time-based preference weights by domain
  const timeWeights: Partial<Record<QueueDomain, number>> = {}

  if (hour >= 6 && hour < 12) {
    // Morning: prep, shopping, culinary work
    timeWeights.event = 1.2
    timeWeights.task = 1.2
    timeWeights.culinary = 1.2
  } else if (hour >= 12 && hour < 17) {
    // Afternoon: communication and admin
    timeWeights.inquiry = 1.3
    timeWeights.message = 1.3
    timeWeights.client = 1.2
    timeWeights.financial = 1.2
    timeWeights.network = 1.1
  } else if (hour >= 17) {
    // Evening: next-day prep and post-event follow-ups
    timeWeights.event = 1.3
    timeWeights.task = 1.25
    timeWeights.post_event = 1.2
  }

  // Only apply time weighting if top items are close in score (within 15%)
  const topScore = items[0].score
  const candidates = items.filter((item) => item.score >= topScore * 0.85)

  if (candidates.length <= 1) return items[0]

  // Reweight candidates
  const reweighted = candidates.map((item) => ({
    item,
    adjustedScore: item.score * (timeWeights[item.domain] ?? 1.0),
  }))

  reweighted.sort((a, b) => b.adjustedScore - a.adjustedScore)
  return reweighted[0].item
}

function computeSummary(items: QueueItem[]): QueueSummary {
  const byDomain: Record<QueueDomain, number> = {
    inquiry: 0,
    message: 0,
    quote: 0,
    event: 0,
    task: 0,
    financial: 0,
    post_event: 0,
    client: 0,
    culinary: 0,
    network: 0,
  }
  const byUrgency: Record<QueueUrgency, number> = {
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  }

  for (const item of items) {
    byDomain[item.domain]++
    byUrgency[item.urgency]++
  }

  return {
    totalItems: items.length,
    byDomain,
    byUrgency,
    allCaughtUp: items.length === 0,
  }
}

async function safeProvider(name: string, fn: () => Promise<QueueItem[]>): Promise<QueueItem[]> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Queue] Provider "${name}" failed:`, err)
    return []
  }
}
