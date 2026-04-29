import { pgClient } from '@/lib/db'
import type { TelemetryActorRole, TelemetryEvent, TelemetryEventType } from './types'

export type OperationalAwarenessAggregate = {
  tenant_id: string
  chef_owner_id: string
  avg_response_time_ms: number | null
  response_rate: number | null
  booking_conversion_rate: number | null
  cancellation_rate: number | null
  client_wait_time_ms: number
  inactive_threads: number
  trace: {
    inquiries_received: number
    inquiries_responded: number
    response_pairs: number
    bookings_created: number
    bookings_confirmed: number
    bookings_cancelled: number
    pending_context_ids: string[]
    inactive_context_ids: string[]
  }
}

export type OperationalAwarenessAggregateResult = {
  tenant_aggregates: OperationalAwarenessAggregate[]
  chef_owner_aggregates: OperationalAwarenessAggregate[]
}

export type OperationalAwarenessAggregateOptions = {
  now?: Date | string
  inactiveThreadThresholdMs?: number
}

type EventByContext = {
  contextId: string
  timestampMs: number
}

type TelemetryEventRow = {
  id: string
  tenant_id: string
  actor_id: string
  actor_role: TelemetryActorRole
  target_id: string | null
  target_role: TelemetryActorRole | null
  event_type: TelemetryEventType
  context_id: string | null
  timestamp: Date | string
  metadata: Record<string, unknown> | null
}

const DEFAULT_INACTIVE_THREAD_THRESHOLD_MS = 24 * 60 * 60 * 1000

function toTimestampMs(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value)
  const timestampMs = date.getTime()
  if (Number.isNaN(timestampMs)) {
    throw new Error('Telemetry event has an invalid timestamp')
  }

  return timestampMs
}

function getContextId(event: Pick<TelemetryEvent, 'id' | 'context_id'>): string {
  return event.context_id ?? event.id
}

function uniqueContextCount(events: EventByContext[]): number {
  return new Set(events.map((event) => event.contextId)).size
}

function divideOrNull(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null
  }

  return numerator / denominator
}

function earliestByContext(events: EventByContext[]): Map<string, number> {
  const byContext = new Map<string, number>()

  for (const event of events) {
    const current = byContext.get(event.contextId)
    if (current === undefined || event.timestampMs < current) {
      byContext.set(event.contextId, event.timestampMs)
    }
  }

  return byContext
}

function calculateAggregateForTenant(
  tenantId: string,
  events: TelemetryEvent[],
  nowMs: number,
  inactiveThreadThresholdMs: number
): OperationalAwarenessAggregate {
  const scoped = events
    .filter((event) => event.tenant_id === tenantId)
    .sort((a, b) => toTimestampMs(a.timestamp) - toTimestampMs(b.timestamp))

  const inquiriesReceived: EventByContext[] = []
  const inquiriesResponded: EventByContext[] = []
  const bookingsCreated: EventByContext[] = []
  const bookingsConfirmed: EventByContext[] = []
  const bookingsCancelled: EventByContext[] = []

  for (const event of scoped) {
    const traceEvent = {
      contextId: getContextId(event),
      timestampMs: toTimestampMs(event.timestamp),
    }

    if (event.event_type === 'inquiry_received') {
      inquiriesReceived.push(traceEvent)
    } else if (event.event_type === 'inquiry_responded') {
      inquiriesResponded.push(traceEvent)
    } else if (event.event_type === 'booking_created') {
      bookingsCreated.push(traceEvent)
    } else if (event.event_type === 'booking_confirmed') {
      bookingsConfirmed.push(traceEvent)
    } else if (event.event_type === 'booking_cancelled') {
      bookingsCancelled.push(traceEvent)
    }
  }

  const receivedByContext = earliestByContext(inquiriesReceived)
  const respondedByContext = earliestByContext(inquiriesResponded)
  const responseTimes: number[] = []
  const pendingContextIds: string[] = []
  const inactiveContextIds: string[] = []
  let clientWaitTimeMs = 0

  for (const [contextId, receivedAtMs] of receivedByContext.entries()) {
    const respondedAtMs = respondedByContext.get(contextId)
    if (respondedAtMs !== undefined && respondedAtMs >= receivedAtMs) {
      responseTimes.push(respondedAtMs - receivedAtMs)
      continue
    }

    const waitTimeMs = Math.max(0, nowMs - receivedAtMs)
    clientWaitTimeMs = Math.max(clientWaitTimeMs, waitTimeMs)
    pendingContextIds.push(contextId)
    if (waitTimeMs > inactiveThreadThresholdMs) {
      inactiveContextIds.push(contextId)
    }
  }

  const inquiryCount = receivedByContext.size
  const respondedCount = responseTimes.length
  const createdBookingCount = uniqueContextCount(bookingsCreated)
  const confirmedBookingCount = uniqueContextCount(bookingsConfirmed)
  const cancelledBookingCount = uniqueContextCount(bookingsCancelled)

  return {
    tenant_id: tenantId,
    chef_owner_id: tenantId,
    avg_response_time_ms:
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : null,
    response_rate: divideOrNull(respondedCount, inquiryCount),
    booking_conversion_rate: divideOrNull(confirmedBookingCount, createdBookingCount),
    cancellation_rate: divideOrNull(cancelledBookingCount, createdBookingCount),
    client_wait_time_ms: clientWaitTimeMs,
    inactive_threads: inactiveContextIds.length,
    trace: {
      inquiries_received: inquiryCount,
      inquiries_responded: respondedCount,
      response_pairs: responseTimes.length,
      bookings_created: createdBookingCount,
      bookings_confirmed: confirmedBookingCount,
      bookings_cancelled: cancelledBookingCount,
      pending_context_ids: pendingContextIds.sort(),
      inactive_context_ids: inactiveContextIds.sort(),
    },
  }
}

function emptyAggregate(tenantId: string): OperationalAwarenessAggregate {
  return {
    tenant_id: tenantId,
    chef_owner_id: tenantId,
    avg_response_time_ms: null,
    response_rate: null,
    booking_conversion_rate: null,
    cancellation_rate: null,
    client_wait_time_ms: 0,
    inactive_threads: 0,
    trace: {
      inquiries_received: 0,
      inquiries_responded: 0,
      response_pairs: 0,
      bookings_created: 0,
      bookings_confirmed: 0,
      bookings_cancelled: 0,
      pending_context_ids: [],
      inactive_context_ids: [],
    },
  }
}

export function calculateOperationalAwarenessAggregates(
  events: TelemetryEvent[],
  options: OperationalAwarenessAggregateOptions = {}
): OperationalAwarenessAggregateResult {
  const nowMs = options.now ? toTimestampMs(options.now) : Date.now()
  const inactiveThreadThresholdMs =
    options.inactiveThreadThresholdMs ?? DEFAULT_INACTIVE_THREAD_THRESHOLD_MS
  const tenantIds = [...new Set(events.map((event) => event.tenant_id))].sort()

  const tenantAggregates = tenantIds.map((tenantId) =>
    calculateAggregateForTenant(tenantId, events, nowMs, inactiveThreadThresholdMs)
  )

  return {
    tenant_aggregates: tenantAggregates,
    chef_owner_aggregates: tenantAggregates.map((aggregate) => ({ ...aggregate })),
  }
}

export async function getTenantOperationalAwarenessAggregates(
  tenantId: string,
  options: OperationalAwarenessAggregateOptions = {}
): Promise<OperationalAwarenessAggregate> {
  const rows = await pgClient<TelemetryEventRow[]>`
    SELECT id, tenant_id, actor_id, actor_role, target_id, target_role, event_type, context_id, timestamp, metadata
    FROM operational_telemetry_event_model
    WHERE tenant_id = ${tenantId}
    ORDER BY timestamp ASC
  `

  const events = rows.map((row) => ({
    ...row,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    metadata: row.metadata ?? {},
  }))

  return calculateOperationalAwarenessAggregates(events, options).tenant_aggregates[0] ?? emptyAggregate(tenantId)
}

export async function getChefOwnerOperationalAwarenessAggregates(
  chefOwnerId: string,
  options: OperationalAwarenessAggregateOptions = {}
): Promise<OperationalAwarenessAggregate> {
  return getTenantOperationalAwarenessAggregates(chefOwnerId, options)
}
