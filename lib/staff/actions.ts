// Staff & Team Management â€” Server Actions
// Chef-only. Manages the staff roster and event assignments.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateStaffSchema = z.object({
  name: z.string().min(1, 'Name required'),
  role: z.enum([
    'sous_chef', 'kitchen_assistant', 'service_staff',
    'server', 'bartender', 'dishwasher', 'other',
  ]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  hourly_rate_cents: z.number().int().min(0).default(0),
  notes: z.string().optional(),
})

const UpdateStaffSchema = CreateStaffSchema.partial()

const AssignStaffSchema = z.object({
  event_id: z.string().uuid(),
  staff_member_id: z.string().uuid(),
  role_override: z.enum([
    'sous_chef', 'kitchen_assistant', 'service_staff',
    'server', 'bartender', 'dishwasher', 'other',
  ]).nullable().optional(),
  rate_override_cents: z.number().int().min(0).nullable().optional(),
  scheduled_hours: z.number().min(0).nullable().optional(),
  notes: z.string().optional(),
})

const RecordHoursSchema = z.object({
  assignment_id: z.string().uuid(),
  actual_hours: z.number().min(0),
})

export type CreateStaffInput   = z.infer<typeof CreateStaffSchema>
export type UpdateStaffInput   = z.infer<typeof UpdateStaffSchema>
export type AssignStaffInput   = z.infer<typeof AssignStaffSchema>
export type RecordHoursInput   = z.infer<typeof RecordHoursSchema>

// ============================================
// STAFF ROSTER ACTIONS
// ============================================

export async function createStaffMember(input: CreateStaffInput) {
  const user = await requireChef()
  const validated = CreateStaffSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
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
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
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
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('staff_members')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to deactivate staff member')
  revalidatePath('/staff')
}

export async function listStaffMembers(activeOnly = true) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = (supabase as any)
    .from('staff_members')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('name')

  if (activeOnly) query = query.eq('status', 'active')

  const { data, error } = await query
  if (error) throw new Error('Failed to load staff members')
  return data ?? []
}

// ============================================
// EVENT ASSIGNMENT ACTIONS
// ============================================

export async function assignStaffToEvent(input: AssignStaffInput) {
  const user = await requireChef()
  const validated = AssignStaffSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
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
  return data
}

export async function removeStaffFromEvent(assignmentId: string, eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('event_staff_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to remove staff from event')
  revalidatePath(`/events/${eventId}`)
}

export async function getEventStaffRoster(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('event_staff_assignments')
    .select(`
      *,
      staff_members (id, name, role, hourly_rate_cents, phone)
    `)
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('created_at')

  if (error) throw new Error('Failed to load event staff roster')
  return data ?? []
}

/**
 * Record actual hours worked by a staff member after the event.
 * Computes and stores pay_amount_cents = actual_hours Ã— effective_rate.
 */
export async function recordStaffHours(input: RecordHoursInput) {
  const user = await requireChef()
  const validated = RecordHoursSchema.parse(input)
  const supabase = createServerClient()

  // Load assignment + staff default rate
  const { data: assignment } = await (supabase as any)
    .from('event_staff_assignments')
    .select(`
      id, event_id, rate_override_cents,
      staff_members (hourly_rate_cents)
    `)
    .eq('id', validated.assignment_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!assignment) throw new Error('Assignment not found')

  // Effective rate: override or staff default
  const staffRate = (assignment as any).staff_members?.hourly_rate_cents ?? 0
  const effectiveRate = assignment.rate_override_cents ?? staffRate
  const payAmountCents = Math.round(validated.actual_hours * effectiveRate)

  const { data, error } = await (supabase as any)
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
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('event_staff_assignments')
    .select('pay_amount_cents')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .not('pay_amount_cents', 'is', null)

  if (error) return 0
  return (data ?? []).reduce((sum: number, row: any) => sum + (row.pay_amount_cents ?? 0), 0)
}
