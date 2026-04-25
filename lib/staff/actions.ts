// Staff & Team Management - Server Actions
// Chef-only. Manages the staff roster and event assignments.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { db } from '@/lib/db'
import { userRoles } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'
import { revokeAllSessionsForUser } from '@/lib/auth/account-access'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateStaffSchema = z.object({
  name: z.string().min(1, 'Name required'),
  role: z.enum([
    'sous_chef',
    'kitchen_assistant',
    'service_staff',
    'server',
    'bartender',
    'dishwasher',
    'other',
  ]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  hourly_rate_cents: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  location_id: z.string().uuid().nullable().optional(),
})

const UpdateStaffSchema = CreateStaffSchema.partial()

const AssignStaffSchema = z.object({
  event_id: z.string().uuid(),
  staff_member_id: z.string().uuid(),
  role_override: z
    .enum([
      'sous_chef',
      'kitchen_assistant',
      'service_staff',
      'server',
      'bartender',
      'dishwasher',
      'other',
    ])
    .nullable()
    .optional(),
  rate_override_cents: z.number().int().min(0).nullable().optional(),
  scheduled_hours: z.number().min(0).nullable().optional(),
  notes: z.string().optional(),
})

const RecordHoursSchema = z.object({
  assignment_id: z.string().uuid(),
  actual_hours: z.number().min(0),
})

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>
export type AssignStaffInput = z.infer<typeof AssignStaffSchema>
export type RecordHoursInput = z.infer<typeof RecordHoursSchema>

// ============================================
// STAFF ROSTER ACTIONS
// ============================================

export async function createStaffMember(input: CreateStaffInput) {
  const user = await requireChef()
  const validated = CreateStaffSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('staff_members')
    .insert({ ...validated, chef_id: user.tenantId! })
    .select()
    .single()

  if (error) {
    console.error('[createStaffMember] Error:', error)
    throw new Error('Failed to create staff member')
  }

  revalidatePath('/staff')
  return data
}

export async function updateStaffMember(id: string, input: UpdateStaffInput) {
  const user = await requireChef()
  const validated = UpdateStaffSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('staff_members')
    .update(validated)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateStaffMember] Error:', error)
    throw new Error('Failed to update staff member')
  }

  revalidatePath('/staff')
  return data
}

export async function deactivateStaffMember(id: string) {
  const user = await requireChef()
  const compat: any = createServerClient()

  const { error } = await compat
    .from('staff_members')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to deactivate staff member')

  // Revoke active JWT sessions so deactivated staff cannot continue accessing the portal
  try {
    const [roleRow] = await db
      .select({ authUserId: userRoles.authUserId })
      .from(userRoles)
      .where(and(eq(userRoles.entityId, id), eq(userRoles.role, 'staff')))
      .limit(1)

    if (roleRow?.authUserId) {
      await revokeAllSessionsForUser(roleRow.authUserId)
    }
  } catch (err) {
    console.error('[non-blocking] Failed to revoke staff sessions on deactivation', err)
  }

  revalidatePath('/staff')
}

export async function listStaffMembers(activeOnly = true) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db.from('staff_members').select('*').eq('chef_id', user.tenantId!).order('name')

  if (activeOnly) query = query.eq('status', 'active')

  const { data, error } = await query
  if (error) throw new Error('Failed to load staff members')
  return data ?? []
}

/**
 * Search staff members by name, optionally filter by role and status.
 */
export async function searchStaffMembers(filters: {
  search?: string
  role?: string
  status?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db.from('staff_members').select('*').eq('chef_id', user.tenantId!).order('name')

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }
  if (filters.role && filters.role !== 'all') {
    query = query.eq('role', filters.role)
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to search staff members')
  return data ?? []
}

/**
 * Get a single staff member with their assignment history, onboarding status, and performance.
 */
export async function getStaffMember(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: member, error } = await db
    .from('staff_members')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !member) throw new Error('Staff member not found')

  // Load assignment history
  const { data: assignments } = await db
    .from('event_staff_assignments')
    .select(
      `
      *,
      events (id, occasion, event_date, status)
    `
    )
    .eq('staff_member_id', id)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(20)

  // Load onboarding checklist
  const { data: onboarding } = await db
    .from('staff_onboarding_items')
    .select('*')
    .eq('staff_member_id', id)
    .eq('tenant_id', user.tenantId!)

  // Load contractor agreements
  const { data: agreements } = await db
    .from('contractor_service_agreements')
    .select('*')
    .eq('staff_member_id', id)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  // Load performance score
  const { data: performance } = await db
    .from('staff_performance_scores')
    .select('*')
    .eq('staff_member_id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  return {
    ...member,
    assignments: assignments ?? [],
    onboarding: onboarding ?? [],
    agreements: agreements ?? [],
    performance: performance ?? null,
  }
}

/**
 * Check for assignment conflicts: is this staff member already assigned to an event
 * on the same date? Returns conflicting assignments with event time info.
 */
export async function checkAssignmentConflict(
  staffMemberId: string,
  eventDate: string,
  excludeEventId?: string
) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('event_staff_assignments')
    .select(
      `
      id,
      event_id,
      events!inner (id, occasion, event_date, serve_time, departure_time)
    `
    )
    .eq('staff_member_id', staffMemberId)
    .eq('chef_id', user.tenantId!)
    .eq('events.event_date', eventDate)

  if (excludeEventId) {
    query = query.neq('event_id', excludeEventId)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

// ============================================
// EVENT ASSIGNMENT ACTIONS
// ============================================

export async function assignStaffToEvent(input: AssignStaffInput) {
  const user = await requireChef()
  const validated = AssignStaffSchema.parse(input)
  const db: any = createServerClient()

  // Verify the staff member belongs to this tenant before assigning
  const { data: staffMember } = await db
    .from('staff_members')
    .select('id')
    .eq('id', validated.staff_member_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!staffMember) {
    throw new Error('Staff member not found or does not belong to your account')
  }

  const { data, error } = await db
    .from('event_staff_assignments')
    .upsert(
      {
        event_id: validated.event_id,
        chef_id: user.tenantId!,
        staff_member_id: validated.staff_member_id,
        role_override: validated.role_override ?? null,
        rate_override_cents: validated.rate_override_cents ?? null,
        scheduled_hours: validated.scheduled_hours ?? null,
        notes: validated.notes ?? null,
        status: 'scheduled',
      },
      { onConflict: 'event_id,staff_member_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[assignStaffToEvent] Error:', error)
    throw new Error('Failed to assign staff to event')
  }

  revalidatePath(`/events/${validated.event_id}`)

  // Non-blocking: sync crew circle
  try {
    const { ensureCrewCircle, addStaffToCrewCircle } = await import('@/lib/hub/crew-circle-actions')
    await ensureCrewCircle(validated.event_id, user.tenantId!)
    await addStaffToCrewCircle(validated.event_id, validated.staff_member_id, user.tenantId!)
  } catch (err) {
    console.error('[assignStaffToEvent] crew circle sync failed (non-blocking)', err)
  }

  return data
}

export async function removeStaffFromEvent(assignmentId: string, eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Block removal during live events - staff cannot be unassigned once in_progress
  const { data: event } = await db
    .from('events')
    .select('status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (event?.status === 'in_progress') {
    throw new Error('Cannot remove staff from an event that is currently in progress')
  }

  // Capture staff_member_id before delete (needed for crew circle removal)
  const { data: assignment } = await db
    .from('event_staff_assignments')
    .select('staff_member_id')
    .eq('id', assignmentId)
    .eq('chef_id', user.tenantId!)
    .single()

  const { error } = await db
    .from('event_staff_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to remove staff from event')
  revalidatePath(`/events/${eventId}`)

  // Non-blocking: remove from crew circle
  if (assignment?.staff_member_id) {
    try {
      const { removeStaffFromCrewCircle } = await import('@/lib/hub/crew-circle-actions')
      await removeStaffFromCrewCircle(eventId, assignment.staff_member_id, user.tenantId!)
    } catch (err) {
      console.error('[removeStaffFromEvent] crew circle sync failed (non-blocking)', err)
    }
  }
}

export async function getEventStaffRoster(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_staff_assignments')
    .select(
      `
      *,
      staff_members (id, name, role, hourly_rate_cents, phone)
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('created_at')

  if (error) throw new Error('Failed to load event staff roster')
  return data ?? []
}

/**
 * Record actual hours worked by a staff member after the event.
 * Computes and stores pay_amount_cents = actual_hours × effective_rate.
 */
export async function recordStaffHours(input: RecordHoursInput) {
  const user = await requireChef()
  const validated = RecordHoursSchema.parse(input)
  const db: any = createServerClient()

  // Load assignment + staff default rate
  const { data: assignment } = await db
    .from('event_staff_assignments')
    .select(
      `
      id, event_id, rate_override_cents,
      staff_members (hourly_rate_cents)
    `
    )
    .eq('id', validated.assignment_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!assignment) throw new Error('Assignment not found')

  // Effective rate: override or staff default
  const staffRate = (assignment as any).staff_members?.hourly_rate_cents ?? 0
  const effectiveRate = assignment.rate_override_cents ?? staffRate
  const payAmountCents = Math.round(validated.actual_hours * effectiveRate)

  const { data, error } = await db
    .from('event_staff_assignments')
    .update({
      actual_hours: validated.actual_hours,
      pay_amount_cents: payAmountCents,
      status: 'completed',
    })
    .eq('id', validated.assignment_id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[recordStaffHours] Error:', error)
    throw new Error('Failed to record staff hours')
  }

  revalidatePath(`/events/${assignment.event_id}`)
  return data
}

/**
 * Get total labor cost for an event (sum of all staff pay_amount_cents).
 */
export async function computeEventLaborCost(eventId: string): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_staff_assignments')
    .select('pay_amount_cents')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .not('pay_amount_cents', 'is', null)

  if (error) return 0
  return (data ?? []).reduce((sum: number, row: any) => sum + (row.pay_amount_cents ?? 0), 0)
}

// ============================================
// STAFF PORTAL ACCESS ACTIONS
// ============================================

const CreateStaffLoginSchema = z.object({
  staffMemberId: z.string().uuid('Invalid staff member ID'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * Check whether a staff member already has a portal login (user_roles row with role='staff').
 * Chef-only. Uses admin client to query user_roles without RLS restrictions.
 */
export async function checkStaffHasLogin(staffMemberId: string): Promise<boolean> {
  await requireChef()
  const adminClient: any = createServerClient({ admin: true })

  const { data } = await adminClient
    .from('user_roles')
    .select('id')
    .eq('entity_id', staffMemberId)
    .eq('role', 'staff' as any)
    .maybeSingle()

  return !!data
}

/**
 * Create a login account for a staff member so they can access the staff portal.
 *
 * Steps:
 *  1. Validate inputs (Zod)
 *  2. Verify the staff member belongs to the current chef's tenant
 *  3. Check for existing login (prevent duplicates)
 *  4. Create a Auth.js user via admin API
 *  5. Insert a user_roles row linking auth_user_id → staff_member entity_id
 *  6. Store the email on the staff_members row if not already set
 */
export async function createStaffLogin(input: {
  staffMemberId: string
  email: string
  password: string
}): Promise<{ success: true }> {
  const user = await requireChef()
  const validated = CreateStaffLoginSchema.parse(input)
  const adminClient: any = createServerClient({ admin: true })

  // 1. Verify staff member belongs to this chef
  const { data: member, error: memberError } = await adminClient
    .from('staff_members')
    .select('id, email, chef_id')
    .eq('id', validated.staffMemberId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (memberError || !member) {
    throw new Error('Staff member not found or does not belong to your team')
  }

  // 2. Check for existing login
  const hasLogin = await checkStaffHasLogin(validated.staffMemberId)
  if (hasLogin) {
    throw new Error('This staff member already has a portal login')
  }

  // 3. Create auth user via the database admin API
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: validated.email,
    password: validated.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('[createStaffLogin] Auth error:', authError)
    // Surface common errors clearly
    if (authError?.message?.includes('already been registered')) {
      throw new Error('This email is already registered. Use a different email or contact support.')
    }
    throw new Error(authError?.message ?? 'Failed to create auth account')
  }

  // 4. Insert user_roles row
  const { error: roleError } = await adminClient.from('user_roles').insert({
    auth_user_id: authData.user.id,
    entity_id: validated.staffMemberId,
    role: 'staff' as any,
  })

  if (roleError) {
    console.error('[createStaffLogin] Role insert error:', roleError)
    // Clean up: delete the auth user we just created so we don't leave orphans
    try {
      await adminClient.auth.admin.deleteUser(authData.user.id)
    } catch (cleanupErr) {
      console.error('[createStaffLogin] Cleanup failed:', cleanupErr)
    }
    throw new Error('Failed to assign staff role. Please try again.')
  }

  // 5. Update staff member email if not already set
  if (!member.email) {
    await adminClient
      .from('staff_members')
      .update({ email: validated.email })
      .eq('id', validated.staffMemberId)
      .eq('chef_id', user.tenantId!)
  }

  revalidatePath(`/staff/${validated.staffMemberId}`)
  return { success: true }
}
