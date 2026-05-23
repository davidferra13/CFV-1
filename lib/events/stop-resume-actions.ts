'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { PauseTrail, EventStateSnapshot, ResumeDiff, ResumeResult } from './stop-resume-types'

// ── Helpers ─────────────────────────────────────────────────────────────────

async function captureEventSnapshot(
  db: any,
  eventId: string,
  tenantId: string
): Promise<EventStateSnapshot> {
  const { data: event } = await db
    .from('events')
    .select('status, menu_id, guest_count, kitchen_notes, occasion, event_date, quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  // Fetch assigned staff IDs
  const { data: staffRows } = await db
    .from('event_staff_assignments')
    .select('staff_member_id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const assignedStaffIds = (staffRows ?? []).map((r: any) => r.staff_member_id)

  return {
    status: event.status,
    assigned_staff_ids: assignedStaffIds,
    menu_id: event.menu_id ?? null,
    guest_count: event.guest_count,
    notes: event.kitchen_notes ?? null,
    occasion: event.occasion ?? null,
    event_date: event.event_date ?? null,
    quoted_price_cents: event.quoted_price_cents ?? null,
  }
}

function computeDiff(before: EventStateSnapshot, after: EventStateSnapshot): ResumeDiff[] {
  const diffs: ResumeDiff[] = []
  const keys: (keyof EventStateSnapshot)[] = [
    'status',
    'menu_id',
    'guest_count',
    'notes',
    'occasion',
    'event_date',
    'quoted_price_cents',
  ]

  for (const key of keys) {
    const b = before[key]
    const a = after[key]
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diffs.push({ field: key, before: b, after: a })
    }
  }

  // Compare staff arrays
  const beforeStaff = [...before.assigned_staff_ids].sort().join(',')
  const afterStaff = [...after.assigned_staff_ids].sort().join(',')
  if (beforeStaff !== afterStaff) {
    diffs.push({
      field: 'assigned_staff_ids',
      before: before.assigned_staff_ids,
      after: after.assigned_staff_ids,
    })
  }

  return diffs
}

// ── Server Actions ──────────────────────────────────────────────────────────

/**
 * Pause event planning. Captures the current event state as a snapshot,
 * records who paused it and why.
 */
export async function pauseEventPlanning(
  eventId: string,
  reason?: string
): Promise<{ success: true; trail: PauseTrail } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = createServerClient()

  // Verify event belongs to this tenant
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, status')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  // Check for existing active pause
  const { data: existingPause } = await db
    .from('event_pause_trails')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .is('resumed_at', null)
    .limit(1)
    .maybeSingle()

  if (existingPause) {
    return { success: false, error: 'Event is already paused' }
  }

  // Capture snapshot
  const snapshot = await captureEventSnapshot(db, eventId, tenantId)

  // Insert pause trail
  const { data: trail, error: insertError } = await db
    .from('event_pause_trails')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      paused_by: user.id,
      paused_at: new Date().toISOString(),
      reason: reason?.trim() || null,
      state_snapshot: snapshot,
    })
    .select('*')
    .single()

  if (insertError || !trail) {
    return { success: false, error: 'Failed to create pause trail' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
  revalidatePath('/dashboard')

  return { success: true, trail: trail as PauseTrail }
}

/**
 * Resume event planning. Compares the snapshot from pause time
 * with the current state to show what changed while paused.
 */
export async function resumeEventPlanning(
  eventId: string
): Promise<{ success: true; result: ResumeResult } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = createServerClient()

  // Find active pause trail
  const { data: activeTrail } = await db
    .from('event_pause_trails')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .is('resumed_at', null)
    .order('paused_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeTrail) {
    return { success: false, error: 'No active pause found for this event' }
  }

  // Capture current state
  const currentSnapshot = await captureEventSnapshot(db, eventId, tenantId)

  // Parse stored snapshot
  const pausedSnapshot: EventStateSnapshot =
    typeof activeTrail.state_snapshot === 'string'
      ? JSON.parse(activeTrail.state_snapshot)
      : activeTrail.state_snapshot

  // Compute what changed
  const changes = computeDiff(pausedSnapshot, currentSnapshot)

  // Mark as resumed
  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('event_pause_trails')
    .update({ resumed_at: now })
    .eq('id', activeTrail.id)
    .eq('tenant_id', tenantId)

  if (updateError) {
    return { success: false, error: 'Failed to mark pause as resumed' }
  }

  const completedTrail: PauseTrail = {
    ...activeTrail,
    resumed_at: now,
  } as PauseTrail

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
  revalidatePath('/dashboard')

  return {
    success: true,
    result: { trail: completedTrail, changes },
  }
}

/**
 * List all pause/resume trails for an event, newest first.
 */
export async function getPauseTrails(eventId: string): Promise<PauseTrail[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = createServerClient()

  const { data } = await db
    .from('event_pause_trails')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('paused_at', { ascending: false })

  return (data ?? []) as PauseTrail[]
}

/**
 * Get all currently-paused events for the tenant.
 * Joins event data so the UI can show event name/date alongside pause info.
 */
export async function getActivePauses(): Promise<
  (PauseTrail & { event_occasion: string | null; event_date: string | null })[]
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = createServerClient()

  const { data } = await db
    .from('event_pause_trails')
    .select('*, events(occasion, event_date)')
    .eq('tenant_id', tenantId)
    .is('resumed_at', null)
    .order('paused_at', { ascending: false })

  return (data ?? []).map((row: any) => ({
    ...row,
    event_occasion: row.events?.occasion ?? null,
    event_date: row.events?.event_date ?? null,
    events: undefined,
  }))
}
