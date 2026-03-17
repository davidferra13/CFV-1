import type { ActivityEventType } from './types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ActivityPayloadInput = {
  eventType: ActivityEventType
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export function buildActivityTrackPayload({
  eventType,
  entityType,
  entityId,
  metadata,
}: ActivityPayloadInput) {
  const nextMetadata = { ...(metadata ?? {}) }
  const payload: {
    event_type: ActivityEventType
    entity_type?: string
    entity_id?: string
    metadata: Record<string, unknown>
  } = {
    event_type: eventType,
    metadata: nextMetadata,
  }

  if (entityType) {
    payload.entity_type = entityType
  }

  if (entityId) {
    if (UUID_PATTERN.test(entityId)) {
      payload.entity_id = entityId
    } else if (nextMetadata.entity_key === undefined) {
      nextMetadata.entity_key = entityId
    }
  }

  return payload
}
