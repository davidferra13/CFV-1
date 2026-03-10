// Live Event Coordination Actions
// Server actions for real-time event ops dashboard during live events.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type ServicePhase = 'setup' | 'prep' | 'cooking' | 'plating' | 'service' | 'cleanup'

export type AlertSeverity = 'info' | 'warning' | 'urgent'

export interface LiveAlert {
  id: string
  message: string
  severity: AlertSeverity
  created_at: string
  dismissed: boolean
}

export interface StaffCheckIn {
  assignment_id: string
  staff_name: string
  staff_role: string
  role_override: string | null
  checked_in: boolean
  checked_in_at: string | null
}

export interface LiveEventStatus {
  event: {
    id: string
    occasion: string | null
    location_address: string | null
    location_city: string | null
    guest_count: number | null
    serve_time: string | null
    event_date: string
    status: string
  }
  currentPhase: ServicePhase
  staff: StaffCheckIn[]
  alerts: LiveAlert[]
  timelineProgress: { phase: ServicePhase; label: string; completed: boolean }[]
}

const SERVICE_PHASES: { phase: ServicePhase; label: string }[] = [
  { phase: 'setup', label: 'Setup' },
  { phase: 'prep', label: 'Prep' },
  { phase: 'cooking', label: 'Cooking' },
  { phase: 'plating', label: 'Plating' },
  { phase: 'service', label: 'Service' },
  { phase: 'cleanup', label: 'Cleanup' },
]

// ============================================
// ACTIONS
// ============================================

/**
 * Get the full live status of an in-progress event.
 * Loads event details, staff check-ins, alerts, and service phase.
 */
export async function getLiveEventStatus(eventId: string): Promise<LiveEventStatus | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select(
      'id, occasion, location_address, location_city, guest_count, serve_time, event_date, status'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Fetch staff assignments with staff member details
  const { data: assignments } = await supabase
    .from('event_staff_assignments')
    .select('id, role_override, status, staff_members (id, name, role)')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('created_at')

  // Fetch check-ins from dop_task_completions (key format: live_checkin_{staffMemberId})
  const { data: checkIns } = await supabase
    .from('dop_task_completions')
    .select('task_key, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('task_key', 'live_checkin_%')

  const checkInMap = new Map<string, string>()
  for (const ci of checkIns ?? []) {
    const staffId = ci.task_key.replace('live_checkin_', '')
    checkInMap.set(staffId, ci.created_at)
  }

  // Build staff check-in list
  const staff: StaffCheckIn[] = (assignments ?? []).map((a: any) => {
    const staffMember = a.staff_members
    const staffId = staffMember?.id ?? ''
    return {
      assignment_id: a.id,
      staff_name: staffMember?.name ?? 'Unknown',
      staff_role: staffMember?.role ?? 'other',
      role_override: a.role_override,
      checked_in: checkInMap.has(staffId),
      checked_in_at: checkInMap.get(staffId) ?? null,
    }
  })

  // Fetch current phase from dop_task_completions (key: live_phase)
  const { data: phaseRecord } = await supabase
    .from('dop_task_completions')
    .select('notes')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', 'live_service_phase')
    .maybeSingle()

  const currentPhase: ServicePhase = (phaseRecord?.notes as ServicePhase) || 'setup'

  // Fetch alerts from dop_task_completions (key format: live_alert_{timestamp})
  const { data: alertRecords } = await supabase
    .from('dop_task_completions')
    .select('task_key, notes, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('task_key', 'live_alert_%')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch dismissed alerts
  const { data: dismissedRecords } = await supabase
    .from('dop_task_completions')
    .select('task_key')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('task_key', 'live_alert_dismiss_%')

  const dismissedSet = new Set(
    (dismissedRecords ?? []).map((d: any) => d.task_key.replace('live_alert_dismiss_', ''))
  )

  const alerts: LiveAlert[] = (alertRecords ?? []).map((r: any) => {
    const alertId = r.task_key.replace('live_alert_', '')
    let parsed: { message: string; severity: AlertSeverity } = {
      message: '',
      severity: 'info',
    }
    try {
      parsed = JSON.parse(r.notes ?? '{}')
    } catch {
      parsed = { message: r.notes ?? '', severity: 'info' }
    }
    return {
      id: alertId,
      message: parsed.message,
      severity: parsed.severity,
      created_at: r.created_at,
      dismissed: dismissedSet.has(alertId),
    }
  })

  // Build timeline progress
  const phaseIndex = SERVICE_PHASES.findIndex((p) => p.phase === currentPhase)
  const timelineProgress = SERVICE_PHASES.map((p, i) => ({
    phase: p.phase,
    label: p.label,
    completed: i < phaseIndex,
  }))

  return {
    event,
    currentPhase,
    staff,
    alerts: alerts.filter((a) => !a.dismissed),
    timelineProgress,
  }
}

/**
 * Manually advance the service phase for a live event.
 */
export async function updateServicePhase(eventId: string, phase: ServicePhase) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Validate phase
  if (!SERVICE_PHASES.some((p) => p.phase === phase)) {
    throw new Error('Invalid service phase')
  }

  // Upsert the phase record
  const { data: existing } = await supabase
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', 'live_service_phase')
    .maybeSingle()

  if (existing) {
    await supabase
      .from('dop_task_completions')
      .update({ notes: phase })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)
  } else {
    await supabase.from('dop_task_completions').insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      task_key: 'live_service_phase',
      notes: phase,
    })
  }

  revalidatePath(`/events/${eventId}/live`)
  return { phase }
}

/**
 * Post an alert to the live event feed.
 */
export async function addLiveAlert(eventId: string, message: string, severity: AlertSeverity) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const alertId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const taskKey = `live_alert_${alertId}`

  await supabase.from('dop_task_completions').insert({
    event_id: eventId,
    tenant_id: user.tenantId!,
    task_key: taskKey,
    notes: JSON.stringify({ message, severity }),
  })

  revalidatePath(`/events/${eventId}/live`)
  return { alertId }
}

/**
 * Dismiss an alert from the live feed.
 */
export async function dismissAlert(eventId: string, alertId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase.from('dop_task_completions').insert({
    event_id: eventId,
    tenant_id: user.tenantId!,
    task_key: `live_alert_dismiss_${alertId}`,
    notes: null,
  })

  revalidatePath(`/events/${eventId}/live`)
  return { dismissed: true }
}

/**
 * Mark a staff member as checked in / arrived at the event.
 */
export async function checkInStaff(eventId: string, staffMemberId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const taskKey = `live_checkin_${staffMemberId}`

  // Check if already checked in
  const { data: existing } = await supabase
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', taskKey)
    .maybeSingle()

  if (existing) {
    return { alreadyCheckedIn: true }
  }

  await supabase.from('dop_task_completions').insert({
    event_id: eventId,
    tenant_id: user.tenantId!,
    task_key: taskKey,
    notes: null,
  })

  revalidatePath(`/events/${eventId}/live`)
  return { checkedIn: true }
}
