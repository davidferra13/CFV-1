import { createServerClient } from '@/lib/db/server'
import {
  normalizeOperationalTelemetryEvent,
  type OperationalTelemetryActor,
  type OperationalTelemetryEventInput,
} from './types'

export type OperationalTelemetryIngestResult = {
  eventId: string
  inserted: boolean
}

export async function recordOperationalTelemetryEvent(
  actor: OperationalTelemetryActor,
  input: OperationalTelemetryEventInput
): Promise<OperationalTelemetryIngestResult> {
  const normalized = normalizeOperationalTelemetryEvent(input)
  const tenantId = actor.tenantId ?? normalized.tenantId

  if (!tenantId) {
    throw new Error('tenantId is required for operational telemetry')
  }

  if (
    actor.actorRole !== 'admin' &&
    normalized.tenantId &&
    normalized.tenantId !== actor.tenantId
  ) {
    throw new Error('Cannot record operational telemetry outside the authenticated tenant')
  }

  if (actor.actorRole !== 'admin' && normalized.chefId && normalized.chefId !== tenantId) {
    throw new Error('Cannot aggregate operational telemetry outside the authenticated tenant')
  }

  const chefId = normalized.chefId ?? tenantId
  const db = createServerClient({ admin: true })
  const { data, error } = await db
    .rpc('ingest_operational_telemetry_event', {
      p_tenant_id: tenantId,
      p_chef_id: chefId,
      p_actor_role: actor.actorRole,
      p_actor_entity_id: actor.actorEntityId,
      p_actor_auth_user_id: actor.actorAuthUserId,
      p_event_category: normalized.eventCategory,
      p_event_name: normalized.eventName,
      p_event_status: normalized.eventStatus,
      p_source: normalized.source,
      p_subject_type: normalized.subjectType,
      p_subject_id: normalized.subjectId,
      p_target_role: normalized.targetRole,
      p_target_entity_id: normalized.targetEntityId,
      p_occurred_at: normalized.occurredAt,
      p_idempotency_key: normalized.idempotencyKey,
      p_attributes: normalized.attributes,
    })
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.event_id) {
    throw new Error('Operational telemetry ingestion did not return an event id')
  }

  return {
    eventId: data.event_id,
    inserted: Boolean(data.inserted),
  }
}
