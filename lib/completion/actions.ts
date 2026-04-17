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
  return evaluateCompletion(entityType, entityId, user.tenantId!)
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
  const events = await pgClient<{ id: string; title: string | null; event_date: string | null }[]>`
    SELECT id, title, event_date
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
    const result = await evaluateCompletion('event', ev.id, tenantId, { shallow: true })
    if (result) {
      results.push({
        eventId: ev.id,
        eventName: ev.title || 'Untitled event',
        eventDate: ev.event_date,
        score: result.score,
        status: result.status,
        nextAction: result.nextAction,
      })
    }
  }

  // Sort: blocking (lowest score) first
  results.sort((a, b) => a.score - b.score)
  return results
}
