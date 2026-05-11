'use server'

// Service Day Ticker - Server Actions
// Auth-gated, tenant-scoped actions for live service timeline.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildServiceSteps,
  buildGenericSteps,
  type ServiceTimeline,
} from './service-ticker'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ── Get Service Timeline ──────────────────────────────────────────────

/**
 * Build the service timeline for an event.
 * Pulls courses from the event's menu, builds timed steps,
 * and restores completion state from the DB.
 */
export async function getServiceTimeline(eventId: string): Promise<ServiceTimeline> {
  const user = await requireChef()
  if (!eventId) throw new Error('Event ID is required')

  const db: any = createServerClient()

  // Fetch event details
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, menu_id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found or access denied')

  // Fetch client name
  let clientName: string | null = null
  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .eq('tenant_id', user.tenantId!)
      .single()
    clientName = client?.full_name ?? null
  }

  // Fetch completed step records
  const { data: completedRows } = await db
    .from('service_ticker_steps')
    .select('step_id, completed_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  const completedStepIds = new Set<string>(
    (completedRows ?? []).map((r: { step_id: string }) => r.step_id)
  )
  const stepTimestamps = new Map<string, string>(
    (completedRows ?? []).map((r: { step_id: string; completed_at: string }) => [
      r.step_id,
      r.completed_at,
    ])
  )

  // Fetch courses from menu
  let steps = buildGenericSteps(event.serve_time, completedStepIds, stepTimestamps)

  if (event.menu_id) {
    const { data: dishes } = await db
      .from('dishes')
      .select('id, name, course_number, course_name')
      .eq('menu_id', event.menu_id)
      .eq('tenant_id', user.tenantId!)
      .not('name', 'is', null)
      .order('course_number', { ascending: true })

    if (dishes && dishes.length > 0) {
      const courses = (dishes as any[]).map((d) => ({
        id: d.id,
        name: d.name,
        courseNumber: d.course_number ?? 1,
        courseName: d.course_name ?? null,
      }))

      steps = buildServiceSteps(courses, event.serve_time, completedStepIds, stepTimestamps)
    }
  }

  const completedSteps = steps.filter((s) => s.status === 'completed').length
  const currentStepIndex = steps.findIndex((s) => s.status === 'active')

  return {
    eventId,
    eventName: event.occasion ?? 'Service',
    clientName,
    guestCount: event.guest_count ?? 0,
    serveTime: event.serve_time ?? null,
    steps,
    currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : steps.length,
    totalSteps: steps.length,
    completedSteps,
  }
}

// ── Advance Step ──────────────────────────────────────────────────────

const AdvanceStepSchema = z.object({
  eventId: z.string().uuid(),
  stepId: z.string().min(1),
})

/**
 * Mark a service step as completed with actual timestamp.
 * Idempotent: re-completing an already completed step is a no-op.
 */
export async function advanceStep(
  eventId: string,
  stepId: string
): Promise<{ success: boolean; completedAt: string }> {
  const user = await requireChef()
  const validated = AdvanceStepSchema.parse({ eventId, stepId })
  const db: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found or access denied')

  const completedAt = new Date().toISOString()

  // Upsert step completion (idempotent)
  const { error } = await db
    .from('service_ticker_steps')
    .upsert(
      {
        event_id: validated.eventId,
        step_id: validated.stepId,
        tenant_id: user.tenantId!,
        completed_at: completedAt,
        completed_by: user.id,
      },
      { onConflict: 'event_id,step_id,tenant_id' }
    )

  if (error) {
    console.error('[advanceStep] Error:', error)
    throw new Error('Failed to advance step')
  }

  revalidatePath(`/events/${validated.eventId}/service`)

  return { success: true, completedAt }
}
