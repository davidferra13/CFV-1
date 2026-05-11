'use server'

// Completion Contract - Server Actions
// Public API for UI consumption. All actions require auth + tenant scoping.

import { requireChef } from '@/lib/auth/get-user'
import { evaluateCompletion } from './engine'
import type { EntityType, CompletionResult } from './types'
import { pgClient } from '@/lib/db/index'

export async function getCompletionForEntity(
  entityType: EntityType,
  entityId: string
): Promise<CompletionResult | null> {
  const user = await requireChef()
  try {
    return await evaluateCompletion(entityType, entityId, user.tenantId!)
  } catch (err) {
    console.error(`[Completion] ${entityType}/${entityId} failed:`, err)
    return null
  }
}

export async function getEventCompletionDeep(eventId: string): Promise<CompletionResult | null> {
  const user = await requireChef()
  return evaluateCompletion('event', eventId, user.tenantId!, { shallow: false })
}

interface DashboardEventCompletion {
  eventId: string
  eventName: string
  eventDate: string | null
  score: number
  status: 'incomplete' | 'partial' | 'complete'
  nextAction: { label: string; url: string } | null
}

export async function getDashboardCompletionSummary(): Promise<DashboardEventCompletion[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Upcoming events in next 30 days (shallow eval for performance)
  const events = await pgClient<
    { id: string; occasion: string | null; event_date: string | null }[]
  >`
    SELECT id, occasion, event_date
    FROM events
    WHERE tenant_id = ${tenantId}
      AND status NOT IN ('completed', 'cancelled')
      AND event_date >= CURRENT_DATE
      AND event_date <= CURRENT_DATE + INTERVAL '30 days'
      AND deleted_at IS NULL
    ORDER BY event_date ASC
    LIMIT 10
  `

  const results: DashboardEventCompletion[] = []
  for (const ev of events) {
    try {
      const result = await evaluateCompletion('event', ev.id, tenantId, { shallow: true })
      if (result) {
        results.push({
          eventId: ev.id,
          eventName: ev.occasion || 'Untitled event',
          eventDate: ev.event_date,
          score: result.score,
          status: result.status,
          nextAction: result.nextAction,
        })
      }
    } catch (err) {
      console.error(`[Completion] dashboard event ${ev.id} failed:`, err)
    }
  }

  // Sort: blocking (lowest score) first
  results.sort((a, b) => a.score - b.score)
  return results
}

/**
 * Batch completeness scores for a list of entities.
 * Returns a map of entityId -> { score, status }.
 * Uses shallow evaluation for performance.
 */
export async function getBatchCompleteness(
  entityType: EntityType,
  ids: string[]
): Promise<Record<string, { score: number; status: 'incomplete' | 'partial' | 'complete' }>> {
  if (ids.length === 0) return {}
  const user = await requireChef()
  const tenantId = user.tenantId!
  const results: Record<string, { score: number; status: 'incomplete' | 'partial' | 'complete' }> =
    {}

  // Cap at 50 to avoid request overload
  const capped = ids.slice(0, 50)
  for (const id of capped) {
    try {
      const result = await evaluateCompletion(entityType, id, tenantId, { shallow: true })
      if (result) {
        results[id] = { score: result.score, status: result.status }
      }
    } catch (err) {
      console.error(`[Completion] batch ${entityType}/${id} failed:`, err)
    }
  }
  return results
}
