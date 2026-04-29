'use server'

import { revalidateTag } from 'next/cache'
import { requireOperationalTelemetryActor } from './auth'
import { createTelemetryEvent } from './store'
import type { TelemetryActorRole, TelemetryEventType } from './types'

export type CreateTelemetryEventActionInput = {
  tenant_id?: string | null
  target_id?: string | null
  target_role?: TelemetryActorRole | null
  event_type: TelemetryEventType
  context_id?: string | null
  timestamp?: Date | string | null
  metadata?: Record<string, unknown> | null
  idempotency_key?: string | null
}

export async function createTelemetryEventAction(
  input: CreateTelemetryEventActionInput
): Promise<{ success: true; event_id: string; inserted: boolean } | { success: false; error: string }> {
  try {
    const actor = await requireOperationalTelemetryActor()
    const tenantId = actor.tenant_id ?? input.tenant_id

    if (!tenantId) {
      throw new Error('tenant_id is required')
    }

    if (actor.actor_role !== 'admin' && tenantId !== actor.tenant_id) {
      throw new Error('Cannot record telemetry outside the authenticated tenant')
    }

    const result = await createTelemetryEvent({
      tenant_id: tenantId,
      actor_id: actor.actor_id,
      actor_role: actor.actor_role,
      target_id: input.target_id,
      target_role: input.target_role,
      event_type: input.event_type,
      context_id: input.context_id,
      timestamp: input.timestamp,
      metadata: input.metadata,
      idempotency_key: input.idempotency_key,
    })

    revalidateTag(`operational-telemetry-${tenantId}`)

    return {
      success: true,
      event_id: result.event_id,
      inserted: result.inserted,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create telemetry event',
    }
  }
}
