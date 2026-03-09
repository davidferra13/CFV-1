'use server'

import { revalidatePath } from 'next/cache'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import {
  PREP_TIMELINE_LABELS,
  PREP_TIMELINE_STEP_KEYS,
  type PrepTimelineStatus,
  type PrepTimelineStepKey,
} from '@/lib/events/prep-timeline-constants'
import { createServerClient } from '@/lib/supabase/server'

const DEFAULT_PREP_TIMELINE_VISIBILITY: Record<PrepTimelineStepKey, boolean> = {
  menu_planning: true,
  ingredient_sourcing: true,
  prep_work: true,
  packing: true,
  travel: true,
  setup: true,
  cooking: true,
  serving: true,
  cleanup: true,
  complete: true,
}

type PrepStepRow = {
  id: string
  event_id: string
  tenant_id: string
  step_key: PrepTimelineStepKey
  status: PrepTimelineStatus
  started_at: string | null
  completed_at: string | null
  chef_notes: string | null
  client_visible_note: string | null
  created_at: string
  updated_at: string
}

function normalizePrepVisibility(value: unknown): Record<PrepTimelineStepKey, boolean> {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return PREP_TIMELINE_STEP_KEYS.reduce(
    (acc, key) => {
      acc[key] =
        typeof raw[key] === 'boolean'
          ? (raw[key] as boolean)
          : DEFAULT_PREP_TIMELINE_VISIBILITY[key]
      return acc
    },
    {} as Record<PrepTimelineStepKey, boolean>
  )
}

function validateStepKey(stepKey: string): PrepTimelineStepKey {
  if (!PREP_TIMELINE_STEP_KEYS.includes(stepKey as PrepTimelineStepKey)) {
    throw new Error('Invalid prep timeline step')
  }
  return stepKey as PrepTimelineStepKey
}

function validateStatus(status: string): PrepTimelineStatus {
  if (!['pending', 'in_progress', 'completed', 'skipped'].includes(status)) {
    throw new Error('Invalid prep timeline status')
  }
  return status as PrepTimelineStatus
}

function sortPrepSteps(rows: PrepStepRow[]): PrepStepRow[] {
  return [...rows].sort(
    (a, b) =>
      PREP_TIMELINE_STEP_KEYS.indexOf(a.step_key) - PREP_TIMELINE_STEP_KEYS.indexOf(b.step_key)
  )
}

function revalidateEventPrepPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)
}

async function assertChefEventAccess(eventId: string, tenantId: string) {
  const supabase: any = createServerClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  return event as { id: string; tenant_id: string; client_id: string }
}

async function assertClientEventAccess(eventId: string, clientId: string) {
  const supabase: any = createServerClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', eventId)
    .eq('client_id', clientId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  return event as { id: string; tenant_id: string; client_id: string }
}

async function getChefPrepVisibilityForTenant(tenantId: string) {
  const supabase: any = createServerClient()
  const { data: chef } = await supabase
    .from('chefs')
    .select('prep_timeline_visibility')
    .eq('id', tenantId)
    .single()

  return normalizePrepVisibility(chef?.prep_timeline_visibility)
}

export async function initPrepTimeline(eventId: string) {
  const user = await requireChef()
  await assertChefEventAccess(eventId, user.tenantId!)
  const supabase: any = createServerClient()

  const rows = PREP_TIMELINE_STEP_KEYS.map((stepKey, index) => ({
    event_id: eventId,
    tenant_id: user.tenantId!,
    step_key: stepKey,
    status: index === 0 ? 'in_progress' : 'pending',
    started_at: index === 0 ? new Date().toISOString() : null,
    completed_at: null,
    chef_notes: null,
    client_visible_note: null,
  }))

  const { error } = await supabase.from('event_prep_steps').upsert(rows, {
    onConflict: 'event_id,step_key',
    ignoreDuplicates: true,
  })

  if (error) {
    console.error('[initPrepTimeline] Error:', error)
    throw new Error('Failed to initialize prep timeline')
  }

  revalidateEventPrepPaths(eventId)
  return getChefPrepTimeline(eventId)
}

export async function updatePrepStep(
  eventId: string,
  stepKey: string,
  status: string,
  clientVisibleNote?: string,
  chefNotes?: string
) {
  const user = await requireChef()
  const normalizedStepKey = validateStepKey(stepKey)
  const normalizedStatus = validateStatus(status)
  await assertChefEventAccess(eventId, user.tenantId!)
  const supabase: any = createServerClient()

  const { data: existing } = await supabase
    .from('event_prep_steps')
    .select('*')
    .eq('event_id', eventId)
    .eq('step_key', normalizedStepKey)
    .maybeSingle()

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    event_id: eventId,
    tenant_id: user.tenantId!,
    step_key: normalizedStepKey,
    status: normalizedStatus,
  }

  if (clientVisibleNote !== undefined) {
    payload.client_visible_note = clientVisibleNote.trim() || null
  }
  if (chefNotes !== undefined) {
    payload.chef_notes = chefNotes.trim() || null
  }

  if (normalizedStatus === 'pending') {
    payload.started_at = null
    payload.completed_at = null
  } else if (normalizedStatus === 'in_progress') {
    payload.started_at = existing?.started_at ?? now
    payload.completed_at = null
  } else {
    payload.started_at = existing?.started_at ?? now
    payload.completed_at = now
  }

  const { error } = await supabase.from('event_prep_steps').upsert(payload, {
    onConflict: 'event_id,step_key',
  })

  if (error) {
    console.error('[updatePrepStep] Error:', error)
    throw new Error('Failed to update prep step')
  }

  revalidateEventPrepPaths(eventId)
  return getChefPrepTimeline(eventId)
}

export async function getChefPrepTimeline(eventId: string) {
  const user = await requireChef()
  await assertChefEventAccess(eventId, user.tenantId!)
  const supabase: any = createServerClient()

  const [{ data: rows }, visibility] = await Promise.all([
    supabase.from('event_prep_steps').select('*').eq('event_id', eventId),
    getChefPrepVisibilityForTenant(user.tenantId!),
  ])

  return {
    steps: sortPrepSteps(((rows ?? []) as PrepStepRow[]) || []),
    visibility,
  }
}

export async function getClientPrepTimeline(eventId: string) {
  const user = await requireClient()
  const event = await assertClientEventAccess(eventId, user.entityId)
  const supabase: any = createServerClient()
  const visibility = await getChefPrepVisibilityForTenant(event.tenant_id)

  const { data: rows, error } = await supabase
    .from('event_prep_steps')
    .select('*')
    .eq('event_id', eventId)

  if (error) {
    console.error('[getClientPrepTimeline] Error:', error)
    throw new Error('Failed to fetch event preparation timeline')
  }

  const filtered = sortPrepSteps(((rows ?? []) as PrepStepRow[]) || []).filter(
    (row) => visibility[row.step_key]
  )

  return {
    steps: filtered,
    visibility,
  }
}

export async function updatePrepTimelineVisibility(visibility: Record<string, boolean>) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const nextVisibility = normalizePrepVisibility(visibility)

  const { error } = await supabase
    .from('chefs')
    .update({ prep_timeline_visibility: nextVisibility })
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[updatePrepTimelineVisibility] Error:', error)
    throw new Error('Failed to update prep timeline visibility')
  }

  revalidatePath('/settings/client-preview')
  return nextVisibility
}

export async function getPrepTimelineVisibility() {
  const user = await requireChef()
  return getChefPrepVisibilityForTenant(user.tenantId!)
}
