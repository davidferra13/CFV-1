// Activity Tracking — Lightweight tracker
// Callable from both server actions and API routes.
// Uses admin client so it works from any context (client portal, cron, webhook).
// Non-blocking: failures are logged but never thrown.

import { createServerClient } from '@/lib/supabase/server'
import type { ActorType, ActivityEventType } from './types'

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
    const supabase = createServerClient({ admin: true })

    await supabase.from('activity_events').insert({
      tenant_id: input.tenantId,
      actor_type: input.actorType,
      actor_id: input.actorId || null,
      client_id: input.clientId || null,
      event_type: input.eventType,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      metadata: input.metadata || {},
    })
  } catch (err) {
    // Non-blocking: activity tracking should never break the main flow
    console.error('[trackActivity] Failed (non-fatal):', err)
  }
}
