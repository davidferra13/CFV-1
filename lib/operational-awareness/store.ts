import { createServerClient } from '@/lib/db/server'
import {
  getTelemetryEventCategory,
  normalizeTelemetryEventInput,
  type TelemetryEventInput,
} from './types'

export type TelemetryEventCreateResult = {
  event_id: string
  inserted: boolean
}

export async function createTelemetryEvent(
  event: TelemetryEventInput
): Promise<TelemetryEventCreateResult> {
  const normalized = normalizeTelemetryEventInput(event)
  const db = createServerClient({ admin: true })
  const { data, error } = await db
    .rpc('ingest_operational_telemetry_event', {
      p_tenant_id: normalized.tenant_id,
      p_chef_id: normalized.tenant_id,
      p_actor_role: normalized.actor_role,
      p_actor_entity_id: normalized.actor_id,
      p_actor_auth_user_id: null,
      p_event_category: getTelemetryEventCategory(normalized.event_type),
      p_event_name: normalized.event_type,
      p_event_status: 'observed',
      p_source: 'operational_awareness',
      p_subject_type: normalized.context_id ? 'context' : null,
      p_subject_id: normalized.context_id,
      p_target_role: normalized.target_role,
      p_target_entity_id: normalized.target_id,
      p_occurred_at: normalized.timestamp,
      p_idempotency_key: normalized.idempotency_key,
      p_attributes: normalized.metadata,
    })
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.event_id) {
    throw new Error('Telemetry event ingestion did not return an event id')
  }

  return {
    event_id: data.event_id,
    inserted: Boolean(data.inserted),
  }
}
