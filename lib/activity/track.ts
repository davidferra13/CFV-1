// Activity tracking write utility.
// Uses admin client and never throws (non-blocking).

import { createServerClient } from '@/lib/db/server'
import type { TablesInsert } from '@/types/database'
import type { ActorType, ActivityEventType } from './types'
import { incrementMetric, logActivityEvent } from './observability'
import { triggerVisitorAlert } from './visitor-alert'

export async function trackActivity(input: {
  tenantId: string
  actorType: ActorType
  actorId?: string
  clientId?: string
  eventType: ActivityEventType
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const db = createServerClient({ admin: true })

    const payload: TablesInsert<'activity_events'> = {
      tenant_id: input.tenantId,
      actor_type: input.actorType,
      actor_id: input.actorId || null,
      client_id: input.clientId || null,
      event_type: input.eventType,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      metadata: (input.metadata || {}) as TablesInsert<'activity_events'>['metadata'],
    }

    const { error } = await db.from('activity_events').insert(payload)
    if (error) {
      incrementMetric('activity.track.failure')
      logActivityEvent('error', 'trackActivity insert failed', {
        error: error.message,
        eventType: input.eventType,
      })
      return
    }

    incrementMetric('activity.track.success')

    // Non-blocking visitor alert - notify chef when a client is on the site
    if (input.actorType === 'client' && input.clientId) {
      triggerVisitorAlert({
        tenantId: input.tenantId,
        clientId: input.clientId,
        clientName: (input.metadata?.clientName as string) || 'A client',
        eventType: input.eventType,
      }).catch((err) => {
        console.error('[non-blocking] triggerVisitorAlert failed:', err)
      })
    }
  } catch (err) {
    incrementMetric('activity.track.failure')
    logActivityEvent('error', 'trackActivity failed (non-fatal)', {
      eventType: input.eventType,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
