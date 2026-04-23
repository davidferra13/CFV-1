import { createServerClient } from '@/lib/db/server'
import type { CommunicationDeliveryStatus } from './types'

export type CommunicationDeliveryReconciliationKind =
  | 'send_success'
  | 'provider_update'
  | 'send_failure'

export type CommunicationEventDeliveryState = {
  providerDeliveryStatus: CommunicationDeliveryStatus | null
  providerStatus: string | null
  providerStatusUpdatedAt: string | null
  providerDeliveredAt: string | null
  providerReadAt: string | null
  providerFailedAt: string | null
  providerErrorCode: string | null
  providerErrorMessage: string | null
}

export type CommunicationThreadDeliveryState = {
  latestOutboundEventId: string | null
  latestOutboundAttemptedAt: string | null
  latestOutboundDeliveryStatus: CommunicationDeliveryStatus | null
  latestOutboundProviderStatus: string | null
  latestOutboundStatusUpdatedAt: string | null
  latestOutboundErrorCode: string | null
  latestOutboundErrorMessage: string | null
}

export type CommunicationDeliveryReconciliationInput = {
  tenantId: string
  threadId: string
  communicationEventId?: string | null
  kind: CommunicationDeliveryReconciliationKind
  providerName?: string | null
  rawProviderStatus?: string | null
  occurredAt?: string
  attemptedAt?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}

export type CommunicationDeliveryReconciliationResult = {
  communicationEventId: string | null
  threadId: string
  previousDeliveryStatus: CommunicationDeliveryStatus | null
  previousProviderStatus: string | null
  nextDeliveryStatus: CommunicationDeliveryStatus | null
  nextProviderStatus: string | null
  threadProjected: boolean
}

type EventStateInput = {
  kind: CommunicationDeliveryReconciliationKind
  occurredAt: string
  rawProviderStatus: string | null
  errorCode: string | null
  errorMessage: string | null
}

type ThreadProjectionInput = {
  kind: CommunicationDeliveryReconciliationKind
  communicationEventId: string | null
  attemptedAt: string
  occurredAt: string
  nextDeliveryStatus: CommunicationDeliveryStatus | null
  nextProviderStatus: string | null
  errorCode: string | null
  errorMessage: string | null
}

type DbEventRow = {
  id: string
  thread_id: string
  timestamp: string
  provider_delivery_status: CommunicationDeliveryStatus | null
  provider_status: string | null
  provider_status_updated_at: string | null
  provider_delivered_at: string | null
  provider_read_at: string | null
  provider_failed_at: string | null
  provider_error_code: string | null
  provider_error_message: string | null
}

type DbThreadRow = CommunicationThreadDeliveryState & {
  id: string
}

function normalizeProviderStatus(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized || null
}

function statusRank(status: CommunicationDeliveryStatus | null): number {
  switch (status) {
    case 'pending':
      return 10
    case 'sent':
      return 20
    case 'delivered':
      return 30
    case 'read':
      return 40
    default:
      return 0
  }
}

export function mapProviderStatusToDeliveryStatus(
  rawProviderStatus: string | null | undefined,
  fallback: CommunicationDeliveryStatus | null = null
): CommunicationDeliveryStatus | null {
  const normalized = normalizeProviderStatus(rawProviderStatus)
  if (!normalized) return fallback

  if (['accepted', 'queued', 'scheduled', 'sending', 'submitted'].includes(normalized)) {
    return 'pending'
  }
  if (normalized === 'sent') return 'sent'
  if (normalized === 'delivered') return 'delivered'
  if (normalized === 'read') return 'read'
  if (['failed', 'undelivered', 'rejected', 'cancelled', 'canceled'].includes(normalized)) {
    return 'failed'
  }

  return fallback
}

function shouldAdoptDeliveryStatus(
  currentStatus: CommunicationDeliveryStatus | null,
  nextStatus: CommunicationDeliveryStatus | null
): boolean {
  if (!nextStatus) return false
  if (currentStatus === nextStatus) return true

  if (nextStatus === 'failed') {
    return currentStatus === null || currentStatus === 'pending' || currentStatus === 'sent'
  }

  return statusRank(nextStatus) > statusRank(currentStatus)
}

export function reduceCommunicationEventDeliveryState(
  current: CommunicationEventDeliveryState,
  input: EventStateInput
): CommunicationEventDeliveryState {
  const rawProviderStatus = normalizeProviderStatus(input.rawProviderStatus)
  const nextDeliveryStatus =
    input.kind === 'send_failure'
      ? 'failed'
      : mapProviderStatusToDeliveryStatus(rawProviderStatus, input.kind === 'send_success' ? 'sent' : null)

  if (!shouldAdoptDeliveryStatus(current.providerDeliveryStatus, nextDeliveryStatus)) {
    return current
  }

  const next: CommunicationEventDeliveryState = {
    providerDeliveryStatus: nextDeliveryStatus,
    providerStatus: rawProviderStatus ?? current.providerStatus,
    providerStatusUpdatedAt: input.occurredAt,
    providerDeliveredAt: current.providerDeliveredAt,
    providerReadAt: current.providerReadAt,
    providerFailedAt: current.providerFailedAt,
    providerErrorCode: current.providerErrorCode,
    providerErrorMessage: current.providerErrorMessage,
  }

  if (nextDeliveryStatus === 'delivered') {
    next.providerDeliveredAt = current.providerDeliveredAt ?? input.occurredAt
    next.providerErrorCode = null
    next.providerErrorMessage = null
    return next
  }

  if (nextDeliveryStatus === 'read') {
    next.providerDeliveredAt = current.providerDeliveredAt ?? input.occurredAt
    next.providerReadAt = current.providerReadAt ?? input.occurredAt
    next.providerErrorCode = null
    next.providerErrorMessage = null
    return next
  }

  if (nextDeliveryStatus === 'failed') {
    next.providerFailedAt = current.providerFailedAt ?? input.occurredAt
    next.providerErrorCode = input.errorCode ?? current.providerErrorCode ?? null
    next.providerErrorMessage = input.errorMessage ?? current.providerErrorMessage ?? null
    return next
  }

  next.providerErrorCode = null
  next.providerErrorMessage = null
  return next
}

function toMillis(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function shouldProjectThreadDeliveryState(
  current: CommunicationThreadDeliveryState,
  input: ThreadProjectionInput
): boolean {
  if (!input.nextDeliveryStatus) return false

  if (input.kind === 'send_failure') {
    return true
  }

  if (current.latestOutboundEventId && input.communicationEventId) {
    if (current.latestOutboundEventId === input.communicationEventId) {
      return true
    }
  }

  return toMillis(input.attemptedAt) >= toMillis(current.latestOutboundAttemptedAt)
}

export function projectThreadDeliveryState(
  current: CommunicationThreadDeliveryState,
  input: ThreadProjectionInput
): CommunicationThreadDeliveryState {
  if (!shouldProjectThreadDeliveryState(current, input)) {
    return current
  }

  return {
    latestOutboundEventId: input.kind === 'send_failure' ? null : input.communicationEventId,
    latestOutboundAttemptedAt: input.attemptedAt,
    latestOutboundDeliveryStatus: input.nextDeliveryStatus,
    latestOutboundProviderStatus: input.nextProviderStatus,
    latestOutboundStatusUpdatedAt: input.occurredAt,
    latestOutboundErrorCode: input.nextDeliveryStatus === 'failed' ? input.errorCode : null,
    latestOutboundErrorMessage: input.nextDeliveryStatus === 'failed' ? input.errorMessage : null,
  }
}

function buildPatch<T extends Record<string, unknown>>(
  current: T,
  next: T,
  keys: Array<keyof T>
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  for (const key of keys) {
    if (current[key] !== next[key]) {
      patch[String(key)] = next[key]
    }
  }

  return patch
}

function buildEventUpdatePayload(patch: Record<string, unknown>) {
  const update: Record<string, unknown> = {}

  if ('providerDeliveryStatus' in patch) {
    update.provider_delivery_status = patch.providerDeliveryStatus
  }
  if ('providerStatus' in patch) {
    update.provider_status = patch.providerStatus
  }
  if ('providerStatusUpdatedAt' in patch) {
    update.provider_status_updated_at = patch.providerStatusUpdatedAt
  }
  if ('providerDeliveredAt' in patch) {
    update.provider_delivered_at = patch.providerDeliveredAt
  }
  if ('providerReadAt' in patch) {
    update.provider_read_at = patch.providerReadAt
  }
  if ('providerFailedAt' in patch) {
    update.provider_failed_at = patch.providerFailedAt
  }
  if ('providerErrorCode' in patch) {
    update.provider_error_code = patch.providerErrorCode
  }
  if ('providerErrorMessage' in patch) {
    update.provider_error_message = patch.providerErrorMessage
  }

  return update
}

function buildThreadUpdatePayload(patch: Record<string, unknown>) {
  const update: Record<string, unknown> = {}

  if ('latestOutboundEventId' in patch) {
    update.latest_outbound_event_id = patch.latestOutboundEventId
  }
  if ('latestOutboundAttemptedAt' in patch) {
    update.latest_outbound_attempted_at = patch.latestOutboundAttemptedAt
  }
  if ('latestOutboundDeliveryStatus' in patch) {
    update.latest_outbound_delivery_status = patch.latestOutboundDeliveryStatus
  }
  if ('latestOutboundProviderStatus' in patch) {
    update.latest_outbound_provider_status = patch.latestOutboundProviderStatus
  }
  if ('latestOutboundStatusUpdatedAt' in patch) {
    update.latest_outbound_status_updated_at = patch.latestOutboundStatusUpdatedAt
  }
  if ('latestOutboundErrorCode' in patch) {
    update.latest_outbound_error_code = patch.latestOutboundErrorCode
  }
  if ('latestOutboundErrorMessage' in patch) {
    update.latest_outbound_error_message = patch.latestOutboundErrorMessage
  }

  return update
}

export async function reconcileCommunicationDeliveryState(
  input: CommunicationDeliveryReconciliationInput
): Promise<CommunicationDeliveryReconciliationResult> {
  const db: any = createServerClient({ admin: true })
  const occurredAt = input.occurredAt || new Date().toISOString()

  const { data: thread } = await db
    .from('conversation_threads')
    .select(
      'id, latest_outbound_event_id, latest_outbound_attempted_at, latest_outbound_delivery_status, latest_outbound_provider_status, latest_outbound_status_updated_at, latest_outbound_error_code, latest_outbound_error_message'
    )
    .eq('id', input.threadId)
    .eq('tenant_id', input.tenantId)
    .single()

  if (!thread?.id) {
    throw new Error('Thread not found for delivery reconciliation')
  }

  let event: DbEventRow | null = null
  if (input.communicationEventId) {
    const { data } = await db
      .from('communication_events')
      .select(
        'id, thread_id, timestamp, provider_delivery_status, provider_status, provider_status_updated_at, provider_delivered_at, provider_read_at, provider_failed_at, provider_error_code, provider_error_message'
      )
      .eq('id', input.communicationEventId)
      .eq('tenant_id', input.tenantId)
      .maybeSingle()

    event = data || null
    if (input.communicationEventId && !event?.id) {
      throw new Error('Communication event not found for delivery reconciliation')
    }
  }

  const currentEventState: CommunicationEventDeliveryState | null = event
    ? {
        providerDeliveryStatus: event.provider_delivery_status || null,
        providerStatus: event.provider_status || null,
        providerStatusUpdatedAt: event.provider_status_updated_at || null,
        providerDeliveredAt: event.provider_delivered_at || null,
        providerReadAt: event.provider_read_at || null,
        providerFailedAt: event.provider_failed_at || null,
        providerErrorCode: event.provider_error_code || null,
        providerErrorMessage: event.provider_error_message || null,
      }
    : null

  const currentThreadState: CommunicationThreadDeliveryState = {
    latestOutboundEventId: thread.latest_outbound_event_id || null,
    latestOutboundAttemptedAt: thread.latest_outbound_attempted_at || null,
    latestOutboundDeliveryStatus: thread.latest_outbound_delivery_status || null,
    latestOutboundProviderStatus: thread.latest_outbound_provider_status || null,
    latestOutboundStatusUpdatedAt: thread.latest_outbound_status_updated_at || null,
    latestOutboundErrorCode: thread.latest_outbound_error_code || null,
    latestOutboundErrorMessage: thread.latest_outbound_error_message || null,
  }

  const reducedEventState =
    currentEventState && event
      ? reduceCommunicationEventDeliveryState(currentEventState, {
          kind: input.kind,
          occurredAt,
          rawProviderStatus: input.rawProviderStatus || null,
          errorCode: input.errorCode || null,
          errorMessage: input.errorMessage || null,
        })
      : null

  if (event && reducedEventState) {
    const eventPatch = buildPatch(
      currentEventState!,
      reducedEventState,
      [
        'providerDeliveryStatus',
        'providerStatus',
        'providerStatusUpdatedAt',
        'providerDeliveredAt',
        'providerReadAt',
        'providerFailedAt',
        'providerErrorCode',
        'providerErrorMessage',
      ]
    )

    if (Object.keys(eventPatch).length > 0) {
      await db
        .from('communication_events')
        .update(buildEventUpdatePayload(eventPatch))
        .eq('id', event.id)
        .eq('tenant_id', input.tenantId)
    }
  }

  const attemptedAt = input.attemptedAt || event?.timestamp || occurredAt
  const nextDeliveryStatus =
    reducedEventState?.providerDeliveryStatus ||
    (input.kind === 'send_failure'
      ? 'failed'
      : mapProviderStatusToDeliveryStatus(
          input.rawProviderStatus || null,
          input.kind === 'send_success' ? 'sent' : null
        ))
  const nextProviderStatus =
    reducedEventState?.providerStatus || normalizeProviderStatus(input.rawProviderStatus)

  const projectedThreadState = projectThreadDeliveryState(currentThreadState, {
    kind: input.kind,
    communicationEventId: event?.id || input.communicationEventId || null,
    attemptedAt,
    occurredAt,
    nextDeliveryStatus,
    nextProviderStatus,
    errorCode: input.errorCode || null,
    errorMessage: input.errorMessage || null,
  })

  const threadPatch = buildPatch(
    currentThreadState,
    projectedThreadState,
    [
      'latestOutboundEventId',
      'latestOutboundAttemptedAt',
      'latestOutboundDeliveryStatus',
      'latestOutboundProviderStatus',
      'latestOutboundStatusUpdatedAt',
      'latestOutboundErrorCode',
      'latestOutboundErrorMessage',
    ]
  )

  const threadProjected = Object.keys(threadPatch).length > 0
  if (threadProjected) {
    await db
      .from('conversation_threads')
      .update(buildThreadUpdatePayload(threadPatch))
      .eq('id', thread.id)
      .eq('tenant_id', input.tenantId)
  }

  return {
    communicationEventId: event?.id || input.communicationEventId || null,
    threadId: thread.id,
    previousDeliveryStatus:
      currentEventState?.providerDeliveryStatus || currentThreadState.latestOutboundDeliveryStatus,
    previousProviderStatus:
      currentEventState?.providerStatus || currentThreadState.latestOutboundProviderStatus,
    nextDeliveryStatus:
      reducedEventState?.providerDeliveryStatus || projectedThreadState.latestOutboundDeliveryStatus,
    nextProviderStatus:
      reducedEventState?.providerStatus || projectedThreadState.latestOutboundProviderStatus,
    threadProjected,
  }
}
