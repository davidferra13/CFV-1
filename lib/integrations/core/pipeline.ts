import { createServerClient } from '@/lib/supabase/server'
import type { IntegrationProvider, IntegrationSyncStatus } from './types'

function canonicalizeEventType(sourceEventType: string): string {
  const normalized = sourceEventType.toLowerCase()

  if (normalized.includes('lead')) return 'lead_created'
  if (normalized.includes('appointment') || normalized.includes('booking'))
    return 'appointment_booked'
  if (normalized.includes('cancel')) return 'appointment_canceled'
  if (normalized.includes('order')) return 'order_created'
  if (normalized.includes('payment') || normalized.includes('charge')) return 'payment_captured'
  if (normalized.includes('refund')) return 'payment_refunded'
  if (normalized.includes('message')) return 'message_received'

  return 'unknown'
}

function extractId(payload: Record<string, unknown>, fallbackPrefix: string): string {
  const candidates = [
    payload.id,
    payload.event_id,
    payload.eventId,
    payload.webhook_id,
    payload.webhookId,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
    if (typeof candidate === 'number') return String(candidate)
  }

  const hashSeed = JSON.stringify(payload)
  let hash = 0
  for (let i = 0; i < hashSeed.length; i++) {
    hash = (hash * 31 + hashSeed.charCodeAt(i)) | 0
  }

  return `${fallbackPrefix}_${Math.abs(hash)}`
}

function extractType(payload: Record<string, unknown>): string {
  const candidates = [
    payload.type,
    payload.event_type,
    payload.eventType,
    payload.topic,
    payload.action,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
  }

  return 'unknown'
}

function extractOccurredAt(payload: Record<string, unknown>): string | null {
  const candidates = [
    payload.occurred_at,
    payload.occurredAt,
    payload.created_at,
    payload.createdAt,
    payload.timestamp,
    payload.time,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && !Number.isNaN(Date.parse(candidate))) {
      return new Date(candidate).toISOString()
    }
  }

  return null
}

function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const occurredAt = extractOccurredAt(payload)
  const eventType = extractType(payload)

  return {
    inferred_event_type: eventType,
    inferred_canonical_event_type: canonicalizeEventType(eventType),
    inferred_occurred_at: occurredAt,
    keys: Object.keys(payload),
  }
}

export async function createIntegrationEventFromWebhook(input: {
  tenantId: string
  provider: IntegrationProvider
  connectionId?: string | null
  payload: Record<string, unknown>
}) {
  const supabase: any = createServerClient({ admin: true })

  const sourceEventId = extractId(input.payload, input.provider)
  const sourceEventType = extractType(input.payload)
  const occurredAt = extractOccurredAt(input.payload)
  const canonicalEventType = canonicalizeEventType(sourceEventType)

  const { data, error } = await supabase
    .from('integration_events')
    .insert({
      tenant_id: input.tenantId,
      connection_id: input.connectionId || null,
      provider: input.provider,
      source_event_id: sourceEventId,
      source_event_type: sourceEventType,
      canonical_event_type: canonicalEventType,
      occurred_at: occurredAt,
      raw_payload: input.payload,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('integration_events')
        .select('id')
        .eq('tenant_id', input.tenantId)
        .eq('provider', input.provider)
        .eq('source_event_id', sourceEventId)
        .single()

      return {
        id: existing?.id || null,
        cached: true,
      }
    }

    throw new Error(`Failed to store integration event: ${error.message}`)
  }

  return {
    id: data.id as string,
    cached: false,
  }
}

export async function processIntegrationEvent(eventId: string) {
  const supabase: any = createServerClient({ admin: true })

  const { data: event, error } = await supabase
    .from('integration_events')
    .select('id, status, processing_attempts, source_event_type, raw_payload')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    throw new Error('Integration event not found')
  }

  if (event.status === 'completed' || event.status === 'duplicate') {
    return { id: event.id as string, status: event.status as IntegrationSyncStatus }
  }

  const { error: markProcessingError } = await supabase
    .from('integration_events')
    .update({
      status: 'processing',
      processing_attempts: Number(event.processing_attempts || 0) + 1,
    })
    .eq('id', eventId)

  if (markProcessingError) {
    throw new Error(`Failed to mark integration event processing: ${markProcessingError.message}`)
  }

  try {
    const payload = (event.raw_payload || {}) as Record<string, unknown>
    const sourceEventType = String(event.source_event_type || 'unknown')

    const { error: completeError } = await supabase
      .from('integration_events')
      .update({
        status: 'completed',
        canonical_event_type: canonicalizeEventType(sourceEventType),
        normalized_payload: normalizePayload(payload),
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', eventId)

    if (completeError) {
      throw new Error(`Failed to mark integration event completed: ${completeError.message}`)
    }

    return { id: eventId, status: 'completed' as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown processing error'

    const { error: failUpdateError } = await supabase
      .from('integration_events')
      .update({
        status: 'failed',
        error: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (failUpdateError) {
      throw new Error(
        `Integration processing failed ("${message}") and failure status update failed: ${failUpdateError.message}`
      )
    }

    return { id: eventId, status: 'failed' as const, error: message }
  }
}

export async function processPendingIntegrationEvents(limit = 100) {
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('integration_events')
    .select('id')
    .in('status', ['pending', 'failed'])
    .lt('processing_attempts', 5)
    .order('received_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 500)))

  if (error) {
    throw new Error(`Failed to load pending events: ${error.message}`)
  }

  let completed = 0
  let failed = 0

  for (const event of (data || []) as Array<{ id: string }>) {
    const result = await processIntegrationEvent(event.id)
    if (result.status === 'completed') completed += 1
    if (result.status === 'failed') failed += 1
  }

  return {
    processed: (data || []).length,
    completed,
    failed,
  }
}

export async function createIntegrationPullJob(input: {
  tenantId: string
  provider: IntegrationProvider
  connectionId?: string | null
  cursorBefore?: string | null
}) {
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('integration_sync_jobs')
    .insert({
      tenant_id: input.tenantId,
      provider: input.provider,
      connection_id: input.connectionId || null,
      job_type: 'pull_incremental',
      cursor_before: input.cursorBefore || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to enqueue pull job: ${error.message}`)
  }

  return data.id as string
}
