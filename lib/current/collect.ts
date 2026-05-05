// The Current - Collection Orchestrator
// Pulls candidates from all 7 source systems in parallel, returns raw CurrentUnit[].
// No ranking or suppression here; that happens downstream.

import { requireChef } from '@/lib/auth/get-user'
import { getCILInsights } from '@/lib/cil/api'
import { getClientPulse } from '@/lib/clients/pulse-actions'
import { getNextBestActions } from '@/lib/clients/next-best-action'
import { evaluateCompletion } from '@/lib/completion/engine'
import { pgClient } from '@/lib/db/index'
import { getDecisionQueue } from '@/lib/decision-queue/actions'
import { getPriorityQueue } from '@/lib/queue/actions'

import { collectFromPriorityQueue } from './collectors/priority-queue'
import { collectFromDecisionQueue } from './collectors/decision-queue'
import { collectFromClientPulse } from './collectors/client-pulse'
import { collectFromNextBestActions } from './collectors/next-best-action'
import { collectFromCompletionResults } from './collectors/completion'
import { collectFromCIL } from './collectors/cil'
import type { CurrentUnit } from './types'

/**
 * Collect all candidate units from every source system.
 * Each source is fetched in parallel; failures are isolated (log + skip).
 */
export async function collectAll(): Promise<CurrentUnit[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Fetch upcoming events for completion evaluation
  const upcomingEventsPromise = pgClient<
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

  const [
    priorityQueueResult,
    decisionQueueResult,
    clientPulseResult,
    nextBestActionsResult,
    upcomingEventsResult,
    cilResult,
  ] = await Promise.allSettled([
    getPriorityQueue(),
    getDecisionQueue(),
    getClientPulse(),
    getNextBestActions(15),
    upcomingEventsPromise,
    getCILInsights(tenantId),
  ])

  const units: CurrentUnit[] = []

  // Priority Queue
  if (priorityQueueResult.status === 'fulfilled') {
    units.push(...collectFromPriorityQueue(priorityQueueResult.value))
  } else {
    console.error('[Current] Priority queue failed:', priorityQueueResult.reason)
  }

  // Decision Queue
  if (decisionQueueResult.status === 'fulfilled') {
    units.push(...collectFromDecisionQueue(decisionQueueResult.value))
  } else {
    console.error('[Current] Decision queue failed:', decisionQueueResult.reason)
  }

  // Client Pulse
  if (clientPulseResult.status === 'fulfilled') {
    units.push(...collectFromClientPulse(clientPulseResult.value))
  } else {
    console.error('[Current] Client pulse failed:', clientPulseResult.reason)
  }

  // Next Best Actions
  if (nextBestActionsResult.status === 'fulfilled') {
    units.push(...collectFromNextBestActions(nextBestActionsResult.value))
  } else {
    console.error('[Current] Next best actions failed:', nextBestActionsResult.reason)
  }

  // Completion Contract (evaluate each upcoming event)
  if (upcomingEventsResult.status === 'fulfilled') {
    const events = upcomingEventsResult.value
    const validResults: {
      result: NonNullable<Awaited<ReturnType<typeof evaluateCompletion>>>
      ctx: { eventId: string; eventName: string; eventDate: string | null }
    }[] = []

    const completionResults = await Promise.allSettled(
      events.map((ev) => evaluateCompletion('event', ev.id, tenantId, { shallow: true }))
    )

    for (let i = 0; i < completionResults.length; i++) {
      const r = completionResults[i]
      if (r.status === 'fulfilled' && r.value) {
        const ev = events[i]
        validResults.push({
          result: r.value,
          ctx: {
            eventId: ev.id,
            eventName: ev.occasion || 'Untitled event',
            eventDate: ev.event_date,
          },
        })
      }
    }

    units.push(...collectFromCompletionResults(validResults))
  } else {
    console.error('[Current] Upcoming events query failed:', upcomingEventsResult.reason)
  }

  // CIL Insights
  if (cilResult.status === 'fulfilled' && cilResult.value) {
    units.push(...collectFromCIL(cilResult.value.insights))
  }

  return units
}
