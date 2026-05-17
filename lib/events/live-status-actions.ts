'use server'

// Day-Of Live Client Status - Server Actions
// Client-facing complement to the Service Execution Tracker.
// Chef actions require auth; client view uses portal token.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getClientPortalAccess } from '@/lib/client-portal/actions'
import { UnknownAppError } from '@/lib/errors/app-error'
import { revalidatePath } from 'next/cache'
import { SERVICE_STAGES, STAGE_LABELS } from './service-tracker-types'
import type { ServiceStage } from './service-tracker-types'
import {
  CLIENT_STATUS_MESSAGES,
  CLIENT_NOTIFY_STAGES,
  DEFAULT_DELAY_THRESHOLD_MINUTES,
} from './live-status-types'
import type {
  ClientLiveStatus,
  ClientStatusTimelineEntry,
  StatusPublishResult,
  DelayCheckResult,
  AutoNotifyConfig,
} from './live-status-types'

// ── Client-Facing: Get Live Status (token-based, no login) ───────────────────

export async function getClientLiveStatus(
  eventId: string,
  clientToken: string
): Promise<ClientLiveStatus | null> {
  const access = await getClientPortalAccess(clientToken)
  if (!access) return null

  const db: any = createServerClient({ admin: true })

  // Verify the event belongs to this client's chef (tenant)
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id, event_date, arrival_time, serve_time')
    .eq('id', eventId)
    .eq('tenant_id', access.tenantId)
    .eq('client_id', access.clientId)
    .single()

  if (!event) return null

  // Get the service execution for this event
  const { data: execution } = await db
    .from('service_executions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', access.tenantId)
    .single()

  // No execution started yet (chef hasn't begun day-of tracking)
  if (!execution) {
    return {
      eventId,
      stage: null,
      stageLabel: 'Not Started',
      clientMessage: buildPreStartMessage(event.arrival_time),
      chefNote: null,
      eta: event.arrival_time || null,
      serveTime: event.serve_time || null,
      isActive: false,
      isComplete: false,
      isDelayed: false,
      delayMinutes: null,
      lastUpdatedAt: null,
    }
  }

  const stage = execution.current_stage as ServiceStage

  // Get latest transition for notes and timestamp
  const { data: latestTransition } = await db
    .from('service_stage_transitions')
    .select('notes, transitioned_at')
    .eq('execution_id', execution.id)
    .order('transitioned_at', { ascending: false })
    .limit(1)
    .single()

  // Check for delay
  const delay = checkDelay(event, execution)

  // Build client message with dynamic ETA/serve time
  let clientMessage = CLIENT_STATUS_MESSAGES[stage] || 'Status update in progress.'
  if (stage === 'en_route' && event.arrival_time) {
    clientMessage = `Your chef is on the way. ETA: ${formatTime(event.arrival_time)}.`
  }
  if (stage === 'prepping' && event.serve_time) {
    clientMessage = `Prep is underway. Dinner on track for ${formatTime(event.serve_time)}.`
  }

  return {
    eventId,
    stage,
    stageLabel: STAGE_LABELS[stage] || stage,
    clientMessage,
    chefNote: latestTransition?.notes || null,
    eta: event.arrival_time || null,
    serveTime: event.serve_time || null,
    isActive: stage !== 'done',
    isComplete: stage === 'done',
    isDelayed: delay.isDelayed,
    delayMinutes: delay.isDelayed ? delay.delayMinutes : null,
    lastUpdatedAt: latestTransition?.transitioned_at || execution.started_at,
  }
}

// ── Client-Facing: Get Status Timeline (token-based) ─────────────────────────

export async function getClientStatusTimeline(
  eventId: string,
  clientToken: string
): Promise<ClientStatusTimelineEntry[]> {
  const access = await getClientPortalAccess(clientToken)
  if (!access) return []

  const db: any = createServerClient({ admin: true })

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', access.tenantId)
    .eq('client_id', access.clientId)
    .single()

  if (!event) return []

  const { data: execution } = await db
    .from('service_executions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', access.tenantId)
    .single()

  if (!execution) return []

  const { data: transitions } = await db
    .from('service_stage_transitions')
    .select('to_stage, notes, transitioned_at')
    .eq('execution_id', execution.id)
    .order('transitioned_at', { ascending: true })

  if (!transitions) return []

  // Filter out same-stage note entries (from_stage === to_stage) for the timeline
  // but keep them if they have notes (chef messages to client)
  return (
    transitions as Array<{ to_stage: string; notes: string | null; transitioned_at: string }>
  ).map((t) => {
    const stage = t.to_stage as ServiceStage
    return {
      stage,
      stageLabel: STAGE_LABELS[stage] || stage,
      clientMessage: CLIENT_STATUS_MESSAGES[stage] || '',
      note: t.notes,
      occurredAt: t.transitioned_at,
    }
  })
}

// ── Chef Action: Publish Status to Client ────────────────────────────────────

export async function publishStatusToClient(
  eventId: string,
  stage: ServiceStage,
  message?: string
): Promise<StatusPublishResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Validate stage
  if (!SERVICE_STAGES.includes(stage)) {
    throw new UnknownAppError('Invalid service stage', {
      code: 'LIVE_STATUS_INVALID_STAGE',
    })
  }

  // Get or create execution
  let { data: execution } = await db
    .from('service_executions')
    .select('id, current_stage')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!execution) {
    // Auto-start execution if chef publishes status without starting tracker
    const { data: newExec, error: startErr } = await db
      .from('service_executions')
      .insert({
        event_id: eventId,
        tenant_id: tenantId,
        current_stage: stage,
      })
      .select()
      .single()

    if (startErr) {
      throw new UnknownAppError('Failed to start service execution', {
        code: 'LIVE_STATUS_START_FAILED',
      })
    }

    execution = newExec

    // Record initial transition
    await db.from('service_stage_transitions').insert({
      execution_id: execution.id,
      from_stage: null,
      to_stage: stage,
      notes: message || null,
    })
  } else {
    const previousStage = execution.current_stage as ServiceStage

    // Update the execution stage
    const updatePayload: Record<string, unknown> = { current_stage: stage }
    if (stage === 'done') {
      updatePayload.completed_at = new Date().toISOString()
    }

    const { error: updateErr } = await db
      .from('service_executions')
      .update(updatePayload)
      .eq('id', execution.id)
      .eq('tenant_id', tenantId)

    if (updateErr) {
      throw new UnknownAppError('Failed to update service status', {
        code: 'LIVE_STATUS_UPDATE_FAILED',
      })
    }

    // Record immutable transition with optional chef note
    await db.from('service_stage_transitions').insert({
      execution_id: execution.id,
      from_stage: previousStage,
      to_stage: stage,
      notes: message || null,
    })
  }

  // Log client notification if this is a notify-worthy stage
  const shouldNotify = CLIENT_NOTIFY_STAGES.includes(stage)
  if (shouldNotify) {
    await logClientNotification(db, eventId, tenantId, stage, message || null)
  }

  revalidatePath(`/events/${eventId}`)
  return {
    success: true,
    stage,
    notifiedClient: shouldNotify,
  }
}

// ── Chef Action: Enable Auto Status Updates ──────────────────────────────────

export async function enableAutoStatusUpdates(eventId: string): Promise<AutoNotifyConfig> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    throw new UnknownAppError('Event not found', {
      code: 'LIVE_STATUS_EVENT_NOT_FOUND',
    })
  }

  // Upsert auto-notify config
  const { error } = await db.from('client_status_config').upsert(
    {
      event_id: eventId,
      tenant_id: tenantId,
      auto_notify_enabled: true,
      delay_threshold_minutes: DEFAULT_DELAY_THRESHOLD_MINUTES,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  )

  if (error) {
    throw new UnknownAppError('Failed to enable auto status updates', {
      code: 'LIVE_STATUS_AUTO_ENABLE_FAILED',
    })
  }

  revalidatePath(`/events/${eventId}`)
  return {
    eventId,
    enabled: true,
    delayThresholdMinutes: DEFAULT_DELAY_THRESHOLD_MINUTES,
  }
}

// ── Chef Action: Set Delay Threshold ─────────────────────────────────────────

export async function setStatusDelay(
  eventId: string,
  delayMinutes: number
): Promise<AutoNotifyConfig> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (delayMinutes < 1 || delayMinutes > 120) {
    throw new UnknownAppError('Delay must be between 1 and 120 minutes', {
      code: 'LIVE_STATUS_INVALID_DELAY',
    })
  }

  // Upsert with custom delay
  const { error } = await db.from('client_status_config').upsert(
    {
      event_id: eventId,
      tenant_id: tenantId,
      auto_notify_enabled: true,
      delay_threshold_minutes: delayMinutes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  )

  if (error) {
    throw new UnknownAppError('Failed to set delay threshold', {
      code: 'LIVE_STATUS_DELAY_SET_FAILED',
    })
  }

  revalidatePath(`/events/${eventId}`)
  return {
    eventId,
    enabled: true,
    delayThresholdMinutes: delayMinutes,
  }
}

// ── Chef Action: Check Delay Status ──────────────────────────────────────────

export async function checkDelayStatus(eventId: string): Promise<DelayCheckResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, event_date, arrival_time')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    return { isDelayed: false, delayMinutes: 0, expectedArrival: null, lastChefUpdate: null }
  }

  const { data: execution } = await db
    .from('service_executions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  const delay = checkDelay(event, execution)

  // Get last transition time
  let lastUpdate: string | null = null
  if (execution) {
    const { data: latest } = await db
      .from('service_stage_transitions')
      .select('transitioned_at')
      .eq('execution_id', execution.id)
      .order('transitioned_at', { ascending: false })
      .limit(1)
      .single()
    lastUpdate = latest?.transitioned_at || null
  }

  return {
    isDelayed: delay.isDelayed,
    delayMinutes: delay.delayMinutes,
    expectedArrival: event.arrival_time || null,
    lastChefUpdate: lastUpdate,
  }
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

function buildPreStartMessage(arrivalTime: string | null): string {
  if (arrivalTime) {
    return `Your chef is preparing for tonight. Arrival expected at ${formatTime(arrivalTime)}.`
  }
  return 'Your chef is preparing for tonight.'
}

function formatTime(timeStr: string): string {
  // time column stores HH:MM:SS or HH:MM format
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr

  const hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${ampm}`
}

function checkDelay(
  event: { event_date: string; arrival_time?: string | null },
  execution: { current_stage: string; started_at: string } | null
): { isDelayed: boolean; delayMinutes: number } {
  if (!event.arrival_time || !event.event_date) {
    return { isDelayed: false, delayMinutes: 0 }
  }

  // If execution exists and chef has moved past en_route, no delay
  if (execution && execution.current_stage !== 'en_route') {
    const arrivedOrBeyond = SERVICE_STAGES.indexOf(execution.current_stage as ServiceStage)
    const arrivedIdx = SERVICE_STAGES.indexOf('arrived')
    if (arrivedOrBeyond >= arrivedIdx) {
      return { isDelayed: false, delayMinutes: 0 }
    }
  }

  // Build expected arrival datetime
  const expectedArrival = new Date(`${event.event_date}T${event.arrival_time}`)
  if (isNaN(expectedArrival.getTime())) {
    return { isDelayed: false, delayMinutes: 0 }
  }

  const now = new Date()
  const diffMs = now.getTime() - expectedArrival.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes > DEFAULT_DELAY_THRESHOLD_MINUTES) {
    return { isDelayed: true, delayMinutes: diffMinutes }
  }

  return { isDelayed: false, delayMinutes: Math.max(0, diffMinutes) }
}

async function logClientNotification(
  db: any,
  eventId: string,
  tenantId: string,
  stage: ServiceStage,
  message: string | null
): Promise<void> {
  try {
    await db.from('client_status_notifications').insert({
      event_id: eventId,
      tenant_id: tenantId,
      notification_type: stage === 'done' ? 'completion' : 'arrival',
      stage,
      message,
    })
  } catch {
    // Non-critical; log notification is best-effort
  }
}
