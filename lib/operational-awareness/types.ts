export const telemetryActorRoles = [
  'admin',
  'chef_owner',
  'chef_staff',
  'client_owner',
  'client_delegate',
  'guest',
  'vendor',
] as const

export const telemetryEventTypes = [
  'inquiry_received',
  'inquiry_responded',
  'booking_created',
  'booking_confirmed',
  'booking_cancelled',
  'session_active',
  'session_idle',
  'menu_submitted',
  'payment_completed',
] as const

export type TelemetryActorRole = (typeof telemetryActorRoles)[number]
export type TelemetryEventType = (typeof telemetryEventTypes)[number]

export type TelemetryEvent = {
  id: string
  tenant_id: string
  actor_id: string
  actor_role: TelemetryActorRole
  target_id: string | null
  target_role: TelemetryActorRole | null
  event_type: TelemetryEventType
  context_id: string | null
  timestamp: string
  metadata: Record<string, unknown>
}

export type TelemetryEventInput = {
  tenant_id: string
  actor_id: string
  actor_role: TelemetryActorRole
  target_id?: string | null
  target_role?: TelemetryActorRole | null
  event_type: TelemetryEventType
  context_id?: string | null
  timestamp?: Date | string | null
  metadata?: Record<string, unknown> | null
  idempotency_key?: string | null
}

export type NormalizedTelemetryEventInput = Omit<TelemetryEventInput, 'timestamp' | 'metadata'> & {
  target_id: string | null
  target_role: TelemetryActorRole | null
  context_id: string | null
  timestamp: string
  metadata: Record<string, unknown>
  idempotency_key: string | null
}

export type TelemetryEventCategory =
  | 'client_interaction'
  | 'booking'
  | 'engagement'
  | 'operations'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAFE_IDEMPOTENCY_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,119}$/i
const MAX_METADATA_BYTES = 8192

const forbiddenMetadataKeys = new Set([
  'body',
  'content',
  'message',
  'messages',
  'text',
  'transcript',
  'raw_message',
  'message_body',
  'email_body',
  'sms_body',
  'chat_body',
])

export function getTelemetryEventCategory(eventType: TelemetryEventType): TelemetryEventCategory {
  if (eventType === 'inquiry_received' || eventType === 'inquiry_responded') {
    return 'client_interaction'
  }

  if (
    eventType === 'booking_created' ||
    eventType === 'booking_confirmed' ||
    eventType === 'booking_cancelled'
  ) {
    return 'booking'
  }

  if (eventType === 'session_active' || eventType === 'session_idle') {
    return 'engagement'
  }

  return 'operations'
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string | null {
  const normalized = typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
  if (normalized !== null && !UUID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be a UUID`)
  }

  return normalized
}

function requireUuid(value: string | null | undefined, fieldName: string): string {
  const normalized = normalizeUuid(value, fieldName)
  if (!normalized) {
    throw new Error(`${fieldName} is required`)
  }

  return normalized
}

function normalizeTimestamp(value: Date | string | null | undefined): string {
  const date = value ? (value instanceof Date ? value : new Date(value)) : new Date()
  if (Number.isNaN(date.getTime())) {
    throw new Error('timestamp must be a valid timestamp')
  }

  return date.toISOString()
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  const normalized =
    typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null
  if (normalized && !SAFE_IDEMPOTENCY_PATTERN.test(normalized)) {
    throw new Error('idempotency_key must use a stable token format')
  }

  return normalized
}

function sanitizeMetadataValue(value: unknown, path: string): unknown {
  if (value === undefined) {
    return undefined
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value
      .map((entry, index) => sanitizeMetadataValue(entry, `${path}[${index}]`))
      .filter((entry) => entry !== undefined)
  }

  if (!isPlainRecord(value)) {
    throw new Error(`${path} must contain JSON-safe values`)
  }

  const output: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.trim()
    if (!normalizedKey) {
      throw new Error(`${path} contains an empty metadata key`)
    }

    if (forbiddenMetadataKeys.has(normalizedKey.toLowerCase())) {
      throw new Error('telemetry metadata cannot include private message content')
    }

    const sanitizedValue = sanitizeMetadataValue(nestedValue, `${path}.${normalizedKey}`)
    if (sanitizedValue !== undefined) {
      output[normalizedKey] = sanitizedValue
    }
  }

  return output
}

export function sanitizeTelemetryMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const sanitized = sanitizeMetadataValue(metadata ?? {}, 'metadata')
  if (!isPlainRecord(sanitized)) {
    throw new Error('metadata must be an object')
  }

  const serialized = JSON.stringify(sanitized)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_BYTES) {
    throw new Error('metadata exceeds the telemetry size limit')
  }

  return sanitized
}

export function normalizeTelemetryEventInput(
  input: TelemetryEventInput
): NormalizedTelemetryEventInput {
  if (!telemetryActorRoles.includes(input.actor_role)) {
    throw new Error('actor_role is not supported')
  }

  if (!telemetryEventTypes.includes(input.event_type)) {
    throw new Error('event_type is not supported')
  }

  if (input.target_role && !telemetryActorRoles.includes(input.target_role)) {
    throw new Error('target_role is not supported')
  }

  const targetId = normalizeUuid(input.target_id, 'target_id')
  const targetRole = input.target_role ?? null
  if ((targetId && !targetRole) || (!targetId && targetRole)) {
    throw new Error('target_id and target_role must be provided together')
  }

  return {
    tenant_id: requireUuid(input.tenant_id, 'tenant_id'),
    actor_id: requireUuid(input.actor_id, 'actor_id'),
    actor_role: input.actor_role,
    target_id: targetId,
    target_role: targetRole,
    event_type: input.event_type,
    context_id: normalizeUuid(input.context_id, 'context_id'),
    timestamp: normalizeTimestamp(input.timestamp),
    metadata: sanitizeTelemetryMetadata(input.metadata),
    idempotency_key: normalizeIdempotencyKey(input.idempotency_key),
  }
}
