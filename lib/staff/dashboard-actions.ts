'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface StaffTodayEntry {
  staffMemberId: string
  staffName: string
  role: string
  eventId: string
  eventOccasion: string | null
  scheduledHours: number | null
}

export interface StaffTodayData {
  assignments: StaffTodayEntry[]
}

/**
 * Returns staff members assigned to today's events for the current tenant.
 * Returns null if no staff are assigned today.
 */
export async function getStaffToday(): Promise<StaffTodayData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Get today's events for this tenant
  const { data: todayEvents, error: eventsError } = await db
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', user.tenantId!)
    .eq('event_date', todayStr)
    .not('status', 'eq', 'cancelled')
    .is('deleted_at' as any, null)

  if (eventsError || !todayEvents || todayEvents.length === 0) {
    return null
  }

  const eventIds = (todayEvents as any[]).map((e: any) => e.id as string)
  const eventMap = new Map<string, string | null>()
  for (const e of todayEvents as any[]) {
    eventMap.set(e.id, e.occasion ?? null)
  }

  // Get staff assignments for today's events
  const { data: assignments, error: assignError } = await db
    .from('event_staff_assignments')
    .select(
      `
      id, event_id, role_override, scheduled_hours,
      staff_members (id, name, role)
    `
    )
    .eq('chef_id', user.tenantId!)
    .in('event_id', eventIds)

  if (assignError || !assignments || assignments.length === 0) {
    return null
  }

  const entries: StaffTodayEntry[] = (assignments as any[])
    .filter((a: any) => a.staff_members)
    .map((a: any) => ({
      staffMemberId: a.staff_members.id,
      staffName: a.staff_members.name,
      role: a.role_override ?? a.staff_members.role ?? 'staff',
      eventId: a.event_id,
      eventOccasion: eventMap.get(a.event_id) ?? null,
      scheduledHours: a.scheduled_hours ?? null,
    }))

  if (entries.length === 0) return null

  return { assignments: entries }
}
