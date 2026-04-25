import { createElement } from 'react'
import { createAdminClient } from '@/lib/db/admin'
import { sendEmail } from '@/lib/email/send'
import { PlatformObservabilityAlertEmail } from '@/lib/email/templates/platform-observability-alert'
import { getDeveloperNotificationRecipients } from '@/lib/platform/owner-account'
import { buildPlatformObservabilityMetadata } from './context'
import {
  getPlatformObservabilityDefinition,
  type PlatformObservabilityEventKey,
  type PlatformObservabilitySeverity,
  type PlatformObservabilityScope,
} from './taxonomy'

export type PlatformObservabilityActorType =
  | 'anonymous'
  | 'auth_user'
  | 'chef'
  | 'client'
  | 'system'

export type PlatformObservabilityAlertStatus = 'not_applicable' | 'sent' | 'suppressed' | 'failed'

export type PlatformObservabilityEventRecord = {
  id: string
  event_key: PlatformObservabilityEventKey
  severity: PlatformObservabilitySeverity
  source: string
  scope: PlatformObservabilityScope
  summary: string
  details: string | null
  actor_type: PlatformObservabilityActorType
  actor_id: string | null
  auth_user_id: string | null
  tenant_id: string | null
  subject_type: string | null
  subject_id: string | null
  metadata: Record<string, unknown>
  occurred_at: string
  realtime_alert_enabled: boolean
  daily_digest_enabled: boolean
  alert_dedupe_key: string | null
  realtime_alert_sent_at: string | null
  realtime_alert_status: PlatformObservabilityAlertStatus
  created_at: string
}

export type RecordPlatformEventInput = {
  eventKey: PlatformObservabilityEventKey
  source: string
  actorType?: PlatformObservabilityActorType
  actorId?: string | null
  authUserId?: string | null
  tenantId?: string | null
  subjectType?: string | null
  subjectId?: string | null
  summary?: string | null
  details?: string | null
  metadata?: Record<string, unknown>
  occurredAt?: string
  alertDedupeKey?: string | null
}

const PLATFORM_ALERT_RECIPIENTS = getDeveloperNotificationRecipients()

function sanitizeSingleLine(value: string | null | undefined, maxLength = 200): string | null {
  if (!value) return null
  return (
    value
      .replace(/[\r\n\t]+/g, ' ')
      .trim()
      .slice(0, maxLength) || null
  )
}

function sanitizeMultiline(value: string | null | undefined, maxLength = 1200): string | null {
  if (!value) return null
  return (
    value
      .replace(/\u0000/g, '')
      .trim()
      .slice(0, maxLength) || null
  )
}

function buildDefaultSummary(eventKey: PlatformObservabilityEventKey): string {
  return getPlatformObservabilityDefinition(eventKey).label
}

export function buildDefaultAlertDedupeKey(input: RecordPlatformEventInput): string | null {
  const definition = getPlatformObservabilityDefinition(input.eventKey)
  if (!definition.realtimeAlert) return null
  if (definition.alertDedupMinutes <= 0) return null

  const parts = [
    input.eventKey,
    input.source,
    input.actorType ?? null,
    input.actorId ?? null,
    input.subjectType ?? null,
    input.subjectId ?? null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(':') : input.eventKey
}

async function hasRecentRealtimeAlert(
  db: any,
  dedupeKey: string,
  cutoff: string
): Promise<boolean> {
  const { data, error } = await db
    .from('platform_observability_events')
    .select('id')
    .eq('alert_dedupe_key', dedupeKey)
    .gte('realtime_alert_sent_at', cutoff)
    .limit(1)

  if (error) {
    console.error('[platform-observability] realtime dedupe lookup failed:', error)
    return false
  }

  return Boolean(data && data.length > 0)
}

async function updateRealtimeAlertStatus(
  db: any,
  eventId: string,
  status: PlatformObservabilityAlertStatus,
  sentAt?: string | null
): Promise<void> {
  const patch: Record<string, unknown> = {
    realtime_alert_status: status,
  }

  if (sentAt !== undefined) {
    patch.realtime_alert_sent_at = sentAt
  }

  const { error } = await db.from('platform_observability_events').update(patch).eq('id', eventId)

  if (error) {
    console.error('[platform-observability] realtime alert status update failed:', error)
  }
}

function buildAlertContext(input: RecordPlatformEventInput) {
  const definition = getPlatformObservabilityDefinition(input.eventKey)
  const metadata = input.metadata ?? {}
  const context: Record<string, string> = {
    event_key: input.eventKey,
    source: input.source,
    scope: definition.scope,
    actor_type: input.actorType ?? 'anonymous',
  }

  if (input.actorId) context.actor_id = input.actorId
  if (input.authUserId) context.auth_user_id = input.authUserId
  if (input.tenantId) context.tenant_id = input.tenantId
  if (input.subjectType) context.subject_type = input.subjectType
  if (input.subjectId) context.subject_id = input.subjectId

  for (const [key, value] of Object.entries(metadata)) {
    if (value == null) continue
    const normalized =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value)
    if (normalized.length === 0) continue
    context[key] = normalized.slice(0, 160)
    if (Object.keys(context).length >= 12) break
  }

  return context
}

async function sendRealtimeAlert(
  definition: ReturnType<typeof getPlatformObservabilityDefinition>,
  input: RecordPlatformEventInput,
  occurredAt: string
): Promise<boolean> {
  const { isDeveloperAlertsEnabled } = await import('@/lib/email/developer-alerts')
  if (!isDeveloperAlertsEnabled()) {
    console.log(`[platform-obs] Alerts disabled, skipping: ${definition.label}`)
    return false
  }

  const react = createElement(PlatformObservabilityAlertEmail, {
    severity: definition.severity,
    label: definition.label,
    summary: sanitizeSingleLine(input.summary) ?? buildDefaultSummary(input.eventKey),
    details: sanitizeMultiline(input.details),
    eventKey: input.eventKey,
    source: input.source,
    scope: definition.scope,
    occurredAt,
    context: buildAlertContext(input),
  })

  return sendEmail({
    to: PLATFORM_ALERT_RECIPIENTS,
    subject: `[${definition.severity.toUpperCase()}] ${definition.label}`,
    react,
  })
}

export async function recordPlatformEvent(input: RecordPlatformEventInput): Promise<void> {
  try {
    const definition = getPlatformObservabilityDefinition(input.eventKey)
    const db: any = createAdminClient()
    const occurredAt = input.occurredAt ?? new Date().toISOString()
    const alertDedupeKey = input.alertDedupeKey ?? buildDefaultAlertDedupeKey(input)
    const summary = sanitizeSingleLine(input.summary) ?? buildDefaultSummary(input.eventKey)
    const details = sanitizeMultiline(input.details)
    const metadata = buildPlatformObservabilityMetadata(input.metadata)
    const initialAlertStatus: PlatformObservabilityAlertStatus = definition.realtimeAlert
      ? 'failed'
      : 'not_applicable'

    const { data: inserted, error: insertError } = await db
      .from('platform_observability_events')
      .insert({
        event_key: input.eventKey,
        severity: definition.severity,
        source: sanitizeSingleLine(input.source, 120) ?? 'unknown',
        scope: definition.scope,
        summary,
        details,
        actor_type: input.actorType ?? 'anonymous',
        actor_id: input.actorId ?? null,
        auth_user_id: input.authUserId ?? null,
        tenant_id: input.tenantId ?? null,
        subject_type: input.subjectType ?? null,
        subject_id: input.subjectId ?? null,
        metadata,
        occurred_at: occurredAt,
        realtime_alert_enabled: definition.realtimeAlert,
        daily_digest_enabled: definition.dailyDigest,
        alert_dedupe_key: alertDedupeKey,
        realtime_alert_status: initialAlertStatus,
      })
      .select('id')
      .single()

    if (insertError || !inserted?.id) {
      console.error('[platform-observability] event insert failed:', insertError)
      return
    }

    if (!definition.realtimeAlert) {
      return
    }

    if (alertDedupeKey && definition.alertDedupMinutes > 0) {
      const cutoff = new Date(Date.now() - definition.alertDedupMinutes * 60_000).toISOString()
      const shouldSuppress = await hasRecentRealtimeAlert(db, alertDedupeKey, cutoff)
      if (shouldSuppress) {
        await updateRealtimeAlertStatus(db, inserted.id, 'suppressed')
        return
      }
    }

    const sent = await sendRealtimeAlert(definition, input, occurredAt)
    await updateRealtimeAlertStatus(
      db,
      inserted.id,
      sent ? 'sent' : 'failed',
      sent ? occurredAt : null
    )
  } catch (error) {
    console.error('[platform-observability] failed to record event:', error)
  }
}
