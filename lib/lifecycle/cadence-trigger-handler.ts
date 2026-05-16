// Cadence Trigger Handler
// Connects the trigger engine's 'schedule_cadence' action to the cadence scheduler.
// Called when evaluateTriggers produces a fired schedule_cadence action.

'use server'

import { createServerClient } from '@/lib/db/server'
import { initializeConfidenceCadence } from './confidence-cadence'
import type { TriggerResult } from './trigger-engine'

/**
 * Process fired trigger results and execute cadence scheduling.
 * Call this after evaluateTriggers() returns results with type 'schedule_cadence'.
 */
export async function executeCadenceTrigger(
  chefId: string,
  eventId: string,
  results: TriggerResult[]
): Promise<{ scheduled: boolean; created?: number; skipped?: number }> {
  const cadenceTrigger = results.find(
    (r) => r.fired && r.action.type === 'schedule_cadence' && r.consent === 'auto'
  )

  if (!cadenceTrigger) {
    return { scheduled: false }
  }

  const db = createServerClient()

  // Get event date
  const { data: event } = await db
    .from('events')
    .select('event_date, serve_time')
    .eq('id', eventId)
    .eq('tenant_id', chefId)
    .single()

  if (!event) {
    return { scheduled: false }
  }

  const eventDate = event.event_date || event.serve_time
  if (!eventDate) {
    return { scheduled: false }
  }

  const result = await initializeConfidenceCadence(chefId, eventId, eventDate)
  return { scheduled: true, created: result.created, skipped: result.skipped }
}
