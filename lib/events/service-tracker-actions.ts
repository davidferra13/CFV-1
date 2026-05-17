'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { UnknownAppError } from '@/lib/errors/app-error'
import { revalidatePath } from 'next/cache'
import type {
  ServiceStage,
  ServiceExecution,
  ServiceTimelineEntry,
} from './service-tracker-types'
import { SERVICE_STAGES } from './service-tracker-types'

// ── Start Service Execution ───────────────────────────────────────────────────

export async function startServiceExecution(eventId: string): Promise<ServiceExecution> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Idempotent: return existing execution if one exists
  const { data: existing } = await db
    .from('service_executions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (existing) return existing as ServiceExecution

  const { data: execution, error } = await db
    .from('service_executions')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      current_stage: 'en_route',
    })
    .select()
    .single()

  if (error) {
    throw new UnknownAppError('Failed to start service execution', {
      code: 'SERVICE_EXEC_START_FAILED',
    })
  }

  // Record initial transition
  await db.from('service_stage_transitions').insert({
    execution_id: execution.id,
    from_stage: null,
    to_stage: 'en_route',
  })

  revalidatePath(`/events/${eventId}`)
  return execution as ServiceExecution
}

// ── Advance Service Stage ─────────────────────────────────────────────────────

export async function advanceServiceStage(
  eventId: string,
  stage: ServiceStage
): Promise<ServiceExecution> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch current execution
  const { data: execution, error: fetchErr } = await db
    .from('service_executions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !execution) {
    throw new UnknownAppError('No active service execution found', {
      code: 'SERVICE_EXEC_NOT_FOUND',
    })
  }

  // Validate stage is in the allowed list
  if (!SERVICE_STAGES.includes(stage)) {
    throw new UnknownAppError('Invalid service stage', {
      code: 'SERVICE_EXEC_INVALID_STAGE',
    })
  }

  const previousStage = execution.current_stage as ServiceStage

  // Update execution current stage
  const updatePayload: Record<string, unknown> = { current_stage: stage }
  if (stage === 'done') {
    updatePayload.completed_at = new Date().toISOString()
  }

  const { data: updated, error: updateErr } = await db
    .from('service_executions')
    .update(updatePayload)
    .eq('id', execution.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateErr) {
    throw new UnknownAppError('Failed to advance service stage', {
      code: 'SERVICE_EXEC_ADVANCE_FAILED',
    })
  }

  // Record immutable transition
  await db.from('service_stage_transitions').insert({
    execution_id: execution.id,
    from_stage: previousStage,
    to_stage: stage,
  })

  revalidatePath(`/events/${eventId}`)
  return updated as ServiceExecution
}

// ── Get Service Status ────────────────────────────────────────────────────────

export async function getServiceStatus(
  eventId: string
): Promise<ServiceExecution | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('service_executions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null
  return data as ServiceExecution
}

// ── Get Service Timeline ──────────────────────────────────────────────────────

export async function getServiceTimeline(
  eventId: string
): Promise<ServiceTimelineEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // First get the execution to verify ownership
  const { data: execution } = await db
    .from('service_executions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!execution) return []

  const { data: transitions, error } = await db
    .from('service_stage_transitions')
    .select('*')
    .eq('execution_id', execution.id)
    .order('transitioned_at', { ascending: true })

  if (error || !transitions) return []
  return transitions as ServiceTimelineEntry[]
}

// ── Add Service Note ──────────────────────────────────────────────────────────

export async function addServiceNote(
  eventId: string,
  note: string
): Promise<ServiceTimelineEntry> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get execution for this event
  const { data: execution } = await db
    .from('service_executions')
    .select('id, current_stage')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!execution) {
    throw new UnknownAppError('No active service execution found', {
      code: 'SERVICE_EXEC_NOT_FOUND',
    })
  }

  // Insert a note as a transition to the same stage (no stage change, just a note)
  const currentStage = execution.current_stage as ServiceStage
  const { data: entry, error } = await db
    .from('service_stage_transitions')
    .insert({
      execution_id: execution.id,
      from_stage: currentStage,
      to_stage: currentStage,
      notes: note,
    })
    .select()
    .single()

  if (error) {
    throw new UnknownAppError('Failed to add service note', {
      code: 'SERVICE_NOTE_FAILED',
    })
  }

  return entry as ServiceTimelineEntry
}

// ── Complete Service ──────────────────────────────────────────────────────────

export async function completeService(eventId: string): Promise<ServiceExecution> {
  return advanceServiceStage(eventId, 'done')
}
