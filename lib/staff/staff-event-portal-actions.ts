// Staff Event Portal - Server Actions
// Token-gated public access for staff to view event briefings on their phones.
// No auth required for public actions (getStaffEventView, markStaffTaskComplete, submitStaffHours).
// Chef-side actions (generate, list, revoke tokens) use requireChef().

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type StaffEventData = {
  tokenId: string
  staffName: string
  staffRole: string
  assignedStation: string | null
  event: {
    id: string
    occasion: string | null
    eventDate: string
    serveTime: string
    arrivalTime: string | null
    guestCount: number
    serviceStyle: string
    locationAddress: string
    locationCity: string
    locationState: string
    locationZip: string
    locationNotes: string | null
    accessInstructions: string | null
    kitchenNotes: string | null
    siteNotes: string | null
    specialRequests: string | null
  }
  dietaryAlerts: {
    allergies: string[]
    dietaryRestrictions: string[]
  }
  tasks: StaffEventTask[]
  schedule: {
    scheduledHours: number | null
    roleOverride: string | null
    notes: string | null
  }
  chefName: string
  chefPhone: string | null
}

export type StaffEventTask = {
  index: number
  label: string
  completed: boolean
}

export type StaffEventTokenInfo = {
  id: string
  staffMemberId: string
  staffName: string
  token: string
  isRevoked: boolean
  expiresAt: string
  lastAccessed: string | null
  createdAt: string
}

// ============================================
// CHEF-SIDE: Generate Token
// ============================================

export async function generateStaffEventToken(
  eventId: string,
  staffMemberId: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const user = await requireChef()
    const supabase: any = createServerClient()

    // Verify the event belongs to this chef
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId)
      .single()

    if (eventError || !event) {
      return { success: false, error: 'Event not found' }
    }

    // Verify the staff member belongs to this chef
    const { data: staff, error: staffError } = await supabase
      .from('staff_members')
      .select('id')
      .eq('id', staffMemberId)
      .eq('chef_id', user.tenantId)
      .single()

    if (staffError || !staff) {
      return { success: false, error: 'Staff member not found' }
    }

    // Get assigned tasks from the event assignment (if any)
    const { data: assignment } = await supabase
      .from('event_staff_assignments')
      .select('id, notes')
      .eq('event_id', eventId)
      .eq('staff_member_id', staffMemberId)
      .eq('chef_id', user.tenantId)
      .single()

    // Upsert: if a token already exists for this event+staff, reactivate it
    const { data: existing } = await supabase
      .from('staff_event_tokens')
      .select('id, token')
      .eq('event_id', eventId)
      .eq('staff_member_id', staffMemberId)
      .eq('tenant_id', user.tenantId)
      .single()

    if (existing) {
      // Reactivate existing token
      await supabase
        .from('staff_event_tokens')
        .update({
          is_revoked: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existing.id)

      revalidatePath(`/events/${eventId}`)
      return { success: true, token: existing.token }
    }

    // Create new token
    const { data: newToken, error: insertError } = await supabase
      .from('staff_event_tokens')
      .insert({
        tenant_id: user.tenantId,
        event_id: eventId,
        staff_member_id: staffMemberId,
        assigned_tasks: [],
        assigned_station: null,
      })
      .select('token')
      .single()

    if (insertError) {
      console.error('[generateStaffEventToken] Insert error:', insertError)
      return { success: false, error: 'Failed to generate token' }
    }

    revalidatePath(`/events/${eventId}`)
    return { success: true, token: newToken.token }
  } catch (err) {
    console.error('[generateStaffEventToken] Error:', err)
    return { success: false, error: 'Failed to generate token' }
  }
}

// ============================================
// CHEF-SIDE: List Tokens for Event
// ============================================

export async function listStaffEventTokens(eventId: string): Promise<StaffEventTokenInfo[]> {
  try {
    const user = await requireChef()
    const supabase: any = createServerClient()

    const { data: tokens, error } = await supabase
      .from('staff_event_tokens')
      .select('id, staff_member_id, token, is_revoked, expires_at, last_accessed, created_at')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[listStaffEventTokens] Error:', error)
      return []
    }

    if (!tokens?.length) return []

    // Get staff names
    const staffIds = tokens.map((t: any) => t.staff_member_id)
    const { data: staffMembers } = await supabase
      .from('staff_members')
      .select('id, name')
      .in('id', staffIds)
      .eq('chef_id', user.tenantId)

    const nameMap = new Map<string, string>()
    for (const s of staffMembers ?? []) {
      nameMap.set(s.id, s.name)
    }

    return tokens.map((t: any) => ({
      id: t.id,
      staffMemberId: t.staff_member_id,
      staffName: nameMap.get(t.staff_member_id) ?? 'Unknown',
      token: t.token,
      isRevoked: t.is_revoked,
      expiresAt: t.expires_at,
      lastAccessed: t.last_accessed,
      createdAt: t.created_at,
    }))
  } catch (err) {
    console.error('[listStaffEventTokens] Error:', err)
    return []
  }
}

// ============================================
// CHEF-SIDE: Revoke Token
// ============================================

export async function revokeStaffEventToken(
  tokenId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const supabase: any = createServerClient()

    const { error } = await supabase
      .from('staff_event_tokens')
      .update({ is_revoked: true })
      .eq('id', tokenId)
      .eq('tenant_id', user.tenantId)

    if (error) {
      console.error('[revokeStaffEventToken] Error:', error)
      return { success: false, error: 'Failed to revoke token' }
    }

    return { success: true }
  } catch (err) {
    console.error('[revokeStaffEventToken] Error:', err)
    return { success: false, error: 'Failed to revoke token' }
  }
}

// ============================================
// PUBLIC: Get Staff Event View (no auth)
// ============================================

export async function getStaffEventView(
  token: string
): Promise<
  | { state: 'ready'; data: StaffEventData }
  | { state: 'revoked' }
  | { state: 'expired' }
  | { state: 'invalid' }
> {
  try {
    const admin = createAdminClient()

    // Look up token
    const { data: tokenRow, error: tokenError } = await admin
      .from('staff_event_tokens' as any)
      .select(
        'id, tenant_id, event_id, staff_member_id, assigned_tasks, assigned_station, is_revoked, expires_at'
      )
      .eq('token', token)
      .single()

    if (tokenError || !tokenRow) {
      return { state: 'invalid' }
    }

    const t = tokenRow as any

    if (t.is_revoked) {
      return { state: 'revoked' }
    }

    if (new Date(t.expires_at) < new Date()) {
      return { state: 'expired' }
    }

    // Update last_accessed (non-blocking)
    try {
      await admin
        .from('staff_event_tokens' as any)
        .update({ last_accessed: new Date().toISOString() } as any)
        .eq('id', t.id)
    } catch (err) {
      console.error('[getStaffEventView] Failed to update last_accessed (non-blocking):', err)
    }

    // Fetch event details
    const { data: event, error: eventError } = await admin
      .from('events' as any)
      .select(
        `
        id, occasion, event_date, serve_time, arrival_time, guest_count,
        service_style, location_address, location_city, location_state,
        location_zip, location_notes, access_instructions, kitchen_notes,
        site_notes, special_requests, dietary_restrictions, allergies
      `
      )
      .eq('id', t.event_id)
      .single()

    if (eventError || !event) {
      return { state: 'invalid' }
    }

    const e = event as any

    // Fetch staff member info
    const { data: staffMember } = await admin
      .from('staff_members' as any)
      .select('id, name, role')
      .eq('id', t.staff_member_id)
      .single()

    const sm = staffMember as any

    // Fetch assignment details
    const { data: assignment } = await admin
      .from('event_staff_assignments' as any)
      .select('scheduled_hours, role_override, notes, actual_hours, status')
      .eq('event_id', t.event_id)
      .eq('staff_member_id', t.staff_member_id)
      .single()

    const asg = assignment as any

    // Fetch chef info (name, phone for contact)
    const { data: chef } = await admin
      .from('chefs' as any)
      .select('business_name, phone')
      .eq('id', t.tenant_id)
      .single()

    const ch = chef as any

    // Build tasks from assigned_tasks JSONB
    const rawTasks = (t.assigned_tasks ?? []) as Array<{ label: string; completed?: boolean }>
    const tasks: StaffEventTask[] = rawTasks.map((task, i) => ({
      index: i,
      label: task.label ?? `Task ${i + 1}`,
      completed: task.completed ?? false,
    }))

    const data: StaffEventData = {
      tokenId: t.id,
      staffName: sm?.name ?? 'Staff',
      staffRole: asg?.role_override ?? sm?.role ?? 'other',
      assignedStation: t.assigned_station ?? null,
      event: {
        id: e.id,
        occasion: e.occasion,
        eventDate: e.event_date,
        serveTime: e.serve_time,
        arrivalTime: e.arrival_time,
        guestCount: e.guest_count,
        serviceStyle: e.service_style ?? 'plated',
        locationAddress: e.location_address,
        locationCity: e.location_city,
        locationState: e.location_state,
        locationZip: e.location_zip,
        locationNotes: e.location_notes,
        accessInstructions: e.access_instructions,
        kitchenNotes: e.kitchen_notes,
        siteNotes: e.site_notes,
        specialRequests: e.special_requests,
      },
      dietaryAlerts: {
        allergies: e.allergies ?? [],
        dietaryRestrictions: e.dietary_restrictions ?? [],
      },
      tasks,
      schedule: {
        scheduledHours: asg?.scheduled_hours ?? null,
        roleOverride: asg?.role_override ?? null,
        notes: asg?.notes ?? null,
      },
      chefName: ch?.business_name ?? 'Chef',
      chefPhone: ch?.phone ?? null,
    }

    return { state: 'ready', data }
  } catch (err) {
    console.error('[getStaffEventView] Error:', err)
    return { state: 'invalid' }
  }
}

// ============================================
// PUBLIC: Mark Task Complete (no auth)
// ============================================

export async function markStaffTaskComplete(
  token: string,
  taskIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient()

    // Validate token
    const { data: tokenRow, error: tokenError } = await admin
      .from('staff_event_tokens' as any)
      .select('id, assigned_tasks, is_revoked, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenRow) {
      return { success: false, error: 'Invalid token' }
    }

    const t = tokenRow as any

    if (t.is_revoked) return { success: false, error: 'Access revoked' }
    if (new Date(t.expires_at) < new Date()) return { success: false, error: 'Token expired' }

    const tasks = [...(t.assigned_tasks ?? [])] as Array<{ label: string; completed?: boolean }>

    if (taskIndex < 0 || taskIndex >= tasks.length) {
      return { success: false, error: 'Invalid task index' }
    }

    // Toggle the task
    tasks[taskIndex] = { ...tasks[taskIndex], completed: !tasks[taskIndex].completed }

    const { error: updateError } = await admin
      .from('staff_event_tokens' as any)
      .update({ assigned_tasks: tasks } as any)
      .eq('id', t.id)

    if (updateError) {
      console.error('[markStaffTaskComplete] Error:', updateError)
      return { success: false, error: 'Failed to update task' }
    }

    return { success: true }
  } catch (err) {
    console.error('[markStaffTaskComplete] Error:', err)
    return { success: false, error: 'Failed to update task' }
  }
}

// ============================================
// PUBLIC: Submit Staff Hours (no auth)
// ============================================

export async function submitStaffHours(
  token: string,
  hoursWorked: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (hoursWorked <= 0 || hoursWorked > 24) {
      return { success: false, error: 'Hours must be between 0 and 24' }
    }

    const admin = createAdminClient()

    // Validate token
    const { data: tokenRow, error: tokenError } = await admin
      .from('staff_event_tokens' as any)
      .select('id, tenant_id, event_id, staff_member_id, is_revoked, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenRow) {
      return { success: false, error: 'Invalid token' }
    }

    const t = tokenRow as any

    if (t.is_revoked) return { success: false, error: 'Access revoked' }
    if (new Date(t.expires_at) < new Date()) return { success: false, error: 'Token expired' }

    // Find the event_staff_assignment and update actual_hours
    const { data: assignment, error: asgError } = await admin
      .from('event_staff_assignments' as any)
      .select('id, rate_override_cents, staff_member_id')
      .eq('event_id', t.event_id)
      .eq('staff_member_id', t.staff_member_id)
      .single()

    if (asgError || !assignment) {
      return { success: false, error: 'No assignment found for this event' }
    }

    const asg = assignment as any

    // Get the effective hourly rate
    const { data: staffMember } = await admin
      .from('staff_members' as any)
      .select('hourly_rate_cents')
      .eq('id', t.staff_member_id)
      .single()

    const effectiveRate = asg.rate_override_cents ?? (staffMember as any)?.hourly_rate_cents ?? 0
    const payAmountCents = Math.round(hoursWorked * effectiveRate)

    // Update the assignment with actual hours and computed pay
    const updatePayload: Record<string, unknown> = {
      actual_hours: hoursWorked,
      pay_amount_cents: payAmountCents,
      status: 'completed',
    }
    if (notes) {
      updatePayload.notes = notes
    }

    const { error: updateError } = await admin
      .from('event_staff_assignments' as any)
      .update(updatePayload as any)
      .eq('id', asg.id)

    if (updateError) {
      console.error('[submitStaffHours] Error:', updateError)
      return { success: false, error: 'Failed to log hours' }
    }

    return { success: true }
  } catch (err) {
    console.error('[submitStaffHours] Error:', err)
    return { success: false, error: 'Failed to log hours' }
  }
}
