// Priority Queue — Builder
// Calls all providers in parallel, merges, deduplicates, sorts by score.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PriorityQueue, QueueItem, QueueDomain, QueueUrgency, QueueSummary } from './types'
import type { DashboardWorkSurface } from '@/lib/workflow/types'

import { getInquiryQueueItems } from './providers/inquiry'
import { getMessageQueueItems } from './providers/message'
import { getQuoteQueueItems } from './providers/quote'
import { convertWorkItemsToQueueItems } from './providers/event'
import { getFinancialQueueItems } from './providers/financial'
import { getPostEventQueueItems } from './providers/post-event'
import { getClientQueueItems } from './providers/client'
import { getCulinaryQueueItems } from './providers/culinary'
import { getContactQueueItems } from './providers/contact'

/**
 * Build the complete priority queue.
 *
 * - All providers run in parallel (Promise.all)
 * - Work Surface passed in (already fetched by caller)
 * - Items merged, deduplicated by id, sorted by score descending
 */
export async function buildPriorityQueue(
  supabase: SupabaseClient,
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
  const uniqueWorkItems = allWorkItems.filter(wi => {
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
    financialItems,
    postEventItems,
    clientItems,
    culinaryItems,
    contactItems,
  ] = await Promise.all([
    safeProvider('inquiry', () => getInquiryQueueItems(supabase, tenantId)),
    safeProvider('message', () => getMessageQueueItems(supabase, tenantId)),
    safeProvider('quote', () => getQuoteQueueItems(supabase, tenantId)),
    safeProvider('financial', () => getFinancialQueueItems(supabase, tenantId)),
    safeProvider('post_event', () => getPostEventQueueItems(supabase, tenantId)),
    safeProvider('client', () => getClientQueueItems(supabase, tenantId)),
    safeProvider('culinary', () => getCulinaryQueueItems(supabase, tenantId)),
    safeProvider('contact', () => getContactQueueItems(supabase, tenantId)),
  ])

  // Merge all items
  const merged = [
    ...eventItems,
    ...inquiryItems,
    ...messageItems,
    ...quoteItems,
    ...financialItems,
    ...postEventItems,
    ...clientItems,
    ...culinaryItems,
    ...contactItems,
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

  return {
    items: deduped,
    nextAction: deduped.length > 0 ? deduped[0] : null,
    summary,
    computedAt: now.toISOString(),
  }
}

function computeSummary(items: QueueItem[]): QueueSummary {
  const byDomain: Record<QueueDomain, number> = {
    inquiry: 0, message: 0, quote: 0, event: 0,
    financial: 0, post_event: 0, client: 0, culinary: 0,
  }
  const byUrgency: Record<QueueUrgency, number> = {
    critical: 0, high: 0, normal: 0, low: 0,
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

async function safeProvider(
  name: string,
  fn: () => Promise<QueueItem[]>
): Promise<QueueItem[]> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Queue] Provider "${name}" failed:`, err)
    return []
  }
}
