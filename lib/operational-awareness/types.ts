export const operationalTelemetryActorRoles = [
  'admin',
  'chef_owner',
  'chef_staff',
  'client_owner',
  'client_delegate',
  'guest',
  'vendor',
  'system',
] as const

export const operationalTelemetryEventCategories = [
  'auth',
  'engagement',
  'client_interaction',
  'booking',
  'operations',
  'finance',
  'safety',
  'system',
] as const

export const operationalTelemetryEventStatuses = [
  'observed',
  'started',
  'completed',
  'failed',
  'blocked',
  'cancelled',
] as const

export type OperationalTelemetryActorRole = (typeof operationalTelemetryActorRoles)[number]
export type OperationalTelemetryEventCategory = (typeof operationalTelemetryEventCategories)[number]
export type OperationalTelemetryEventStatus = (typeof operationalTelemetryEventStatuses)[number]

export type OperationalTelemetryActor = {
  actorRole: OperationalTelemetryActorRole
  actorEntityId: string | null
  actorAuthUserId: string | null
  tenantId: string | null
}

export type OperationalTelemetrySubject = {
  type: string
  id: string
}

export type OperationalTelemetryTarget = {
  role?: OperationalTelemetryActorRole | null
  entityId?: string | null
}

export type OperationalTelemetryEventInput = {
  tenantId?: string | null
  chefId?: string | null
  eventCategory: OperationalTelemetryEventCategory
  eventName: string
  eventStatus?: OperationalTelemetryEventStatus
  source: string
  subject?: OperationalTelemetrySubject | null
  target?: OperationalTelemetryTarget | null
  occurredAt?: Date | string | null
  idempotencyKey?: string | null
  attributes?: Record<string, unknown> | null
}

export type NormalizedOperationalTelemetryEvent = {
  tenantId: string | null
  chefId: string | null
  eventCategory: OperationalTelemetryEventCategory
  eventName: string
  eventStatus: OperationalTelemetryEventStatus
  source: string
  subjectType: string | null
  subjectId: string | null
  targetRole: OperationalTelemetryActorRole | null
  targetEntityId: string | null
  occurredAt: string | null
  idempotencyKey: string | null
  attributes: Record<string, unknown>
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAFE_TOKEN_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,119}$/i
const MAX_ATTRIBUTES_BYTES = 8192

const forbiddenAttributeKeys = new Set([
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertUuid(value: string | null, fieldName: string): void {
  if (value !== null && !UUID_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a UUID`)
  }
}

function assertSafeToken(value: string, fieldName: string): void {
  if (!SAFE_TOKEN_PATTERN.test(value)) {
    throw new Error(`${fieldName} must use a stable token format`)
  }
}

function normalizeOptionalUuid(value: string | null | undefined, fieldName: string): string | null {
  const normalized = typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
  assertUuid(normalized, fieldName)
  return normalized
}

function normalizeOptionalToken(
  value: string | null | undefined,
  fieldName: string
): string | null {
  const normalized =
    typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null
  if (normalized) {
    assertSafeToken(normalized, fieldName)
  }
  return normalized
}

function normalizeTimestamp(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('occurredAt must be a valid timestamp')
  }

  return date.toISOString()
}

function sanitizeTelemetryValue(value: unknown, path: string): unknown {
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
      .map((entry, index) => sanitizeTelemetryValue(entry, `${path}[${index}]`))
      .filter((entry) => entry !== undefined)
  }

  if (!isPlainRecord(value)) {
    throw new Error(`${path} must contain JSON-safe values`)
  }

  const output: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.trim()
    const lowerKey = normalizedKey.toLowerCase()

    if (!normalizedKey) {
      throw new Error(`${path} contains an empty attribute key`)
    }

    if (forbiddenAttributeKeys.has(lowerKey)) {
      throw new Error('operational telemetry attributes cannot include private message content')
    }

    const sanitizedValue = sanitizeTelemetryValue(nestedValue, `${path}.${normalizedKey}`)
    if (sanitizedValue !== undefined) {
      output[normalizedKey] = sanitizedValue
    }
  }

  return output
}

export function sanitizeOperationalTelemetryAttributes(
  attributes: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const sanitized = sanitizeTelemetryValue(attributes ?? {}, 'attributes')
  if (!isPlainRecord(sanitized)) {
    throw new Error('attributes must be an object')
  }

  const serialized = JSON.stringify(sanitized)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_ATTRIBUTES_BYTES) {
    throw new Error('attributes exceed the operational telemetry size limit')
  }

  return sanitized
}

export function normalizeOperationalTelemetryEvent(
  input: OperationalTelemetryEventInput
): NormalizedOperationalTelemetryEvent {
  if (!operationalTelemetryEventCategories.includes(input.eventCategory)) {
    throw new Error('eventCategory is not supported')
  }

  const eventStatus = input.eventStatus ?? 'observed'
  if (!operationalTelemetryEventStatuses.includes(eventStatus)) {
    throw new Error('eventStatus is not supported')
  }

  const eventName = input.eventName.trim().toLowerCase()
  assertSafeToken(eventName, 'eventName')

  const source = input.source.trim().toLowerCase()
  assertSafeToken(source, 'source')

  const subjectType = normalizeOptionalToken(input.subject?.type, 'subject.type')
  const subjectId = normalizeOptionalUuid(input.subject?.id, 'subject.id')
  if ((subjectType && !subjectId) || (!subjectType && subjectId)) {
    throw new Error('subject requires both type and id')
  }

  const targetRole = input.target?.role ?? null
  if (targetRole && !operationalTelemetryActorRoles.includes(targetRole)) {
    throw new Error('target role is not supported')
  }

  return {
    tenantId: normalizeOptionalUuid(input.tenantId, 'tenantId'),
    chefId: normalizeOptionalUuid(input.chefId, 'chefId'),
    eventCategory: input.eventCategory,
    eventName,
    eventStatus,
    source,
    subjectType,
    subjectId,
    targetRole,
    targetEntityId: normalizeOptionalUuid(input.target?.entityId, 'target.entityId'),
    occurredAt: normalizeTimestamp(input.occurredAt),
    idempotencyKey: normalizeOptionalToken(input.idempotencyKey, 'idempotencyKey'),
    attributes: sanitizeOperationalTelemetryAttributes(input.attributes),
  }
}
