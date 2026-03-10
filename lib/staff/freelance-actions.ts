// Freelance Staff Management - Server Actions
// Manages freelance/temporary staff hired for specific events.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateFreelancerSchema = z.object({
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
  day_rate_cents: z.number().int().min(0).nullable().optional(),
  agency_name: z.string().optional(),
  payment_terms: z.enum(['on_completion', 'net_15', 'net_30']).nullable().optional(),
  tax_id_on_file: z.boolean().default(false),
  contract_notes: z.string().optional(),
  notes: z.string().optional(),
})

const UpdateFreelancerSchema = CreateFreelancerSchema.partial()

export type CreateFreelancerInput = z.infer<typeof CreateFreelancerSchema>
export type UpdateFreelancerInput = z.infer<typeof UpdateFreelancerSchema>

// ============================================
// ACTIONS
// ============================================

/**
 * Create a new freelance staff member.
 */
export async function createFreelancer(input: CreateFreelancerInput) {
  const user = await requireChef()
  const validated = CreateFreelancerSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('staff_members')
    .insert({
      name: validated.name,
      role: validated.role,
      phone: validated.phone || null,
      email: validated.email || null,
      hourly_rate_cents: validated.hourly_rate_cents,
      day_rate_cents: validated.day_rate_cents ?? null,
      agency_name: validated.agency_name || null,
      payment_terms: validated.payment_terms ?? null,
      tax_id_on_file: validated.tax_id_on_file,
      contract_notes: validated.contract_notes || null,
      notes: validated.notes || null,
      staff_type: 'freelance',
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[createFreelancer] Error:', error)
    throw new Error('Failed to create freelancer')
  }

  revalidatePath('/staff')
  revalidatePath('/staff/freelancers')
  return data
}

/**
 * Update a freelance staff member.
 */
export async function updateFreelancer(id: string, input: UpdateFreelancerInput) {
  const user = await requireChef()
  const validated = UpdateFreelancerSchema.parse(input)
  const supabase: any = createServerClient()

  const updateData: Record<string, any> = {}
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.role !== undefined) updateData.role = validated.role
  if (validated.phone !== undefined) updateData.phone = validated.phone || null
  if (validated.email !== undefined) updateData.email = validated.email || null
  if (validated.hourly_rate_cents !== undefined)
    updateData.hourly_rate_cents = validated.hourly_rate_cents
  if (validated.day_rate_cents !== undefined) updateData.day_rate_cents = validated.day_rate_cents
  if (validated.agency_name !== undefined) updateData.agency_name = validated.agency_name || null
  if (validated.payment_terms !== undefined) updateData.payment_terms = validated.payment_terms
  if (validated.tax_id_on_file !== undefined) updateData.tax_id_on_file = validated.tax_id_on_file
  if (validated.contract_notes !== undefined)
    updateData.contract_notes = validated.contract_notes || null
  if (validated.notes !== undefined) updateData.notes = validated.notes || null

  const { data, error } = await supabase
    .from('staff_members')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .eq('staff_type', 'freelance')
    .select()
    .single()

  if (error) {
    console.error('[updateFreelancer] Error:', error)
    throw new Error('Failed to update freelancer')
  }

  revalidatePath('/staff')
  revalidatePath('/staff/freelancers')
  return data
}

/**
 * List all freelance staff members for the current chef.
 */
export async function getFreelancers(activeOnly = true) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('staff_members')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('staff_type', 'freelance')
    .order('name')

  if (activeOnly) query = query.eq('status', 'active')

  const { data, error } = await query
  if (error) throw new Error('Failed to load freelancers')
  return data ?? []
}

/**
 * Get a freelancer's event history with total earnings.
 */
export async function getFreelancerEventHistory(staffMemberId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify this is a freelancer belonging to this chef
  const { data: member } = await supabase
    .from('staff_members')
    .select('id, staff_type')
    .eq('id', staffMemberId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!member) throw new Error('Staff member not found')

  const { data: assignments, error } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      *,
      events (id, title, event_date, status, location_address, location_city)
    `
    )
    .eq('staff_member_id', staffMemberId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to load event history')

  const history = assignments ?? []
  const totalEarnedCents = history.reduce(
    (sum: number, a: any) => sum + (a.pay_amount_cents ?? 0),
    0
  )
  const totalEvents = history.length
  const completedEvents = history.filter((a: any) => a.status === 'completed').length

  return {
    assignments: history,
    totalEarnedCents,
    totalEvents,
    completedEvents,
  }
}

/**
 * Calculate the payout for a freelancer on a specific event.
 * Uses day rate if set, otherwise hourly rate * actual hours.
 */
export async function calculateFreelancerPayout(
  staffMemberId: string,
  eventId: string
): Promise<{ payoutCents: number; method: 'day_rate' | 'hourly'; details: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the staff member
  const { data: member } = await supabase
    .from('staff_members')
    .select('id, name, hourly_rate_cents, day_rate_cents, staff_type')
    .eq('id', staffMemberId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!member) throw new Error('Staff member not found')

  // Get the assignment
  const { data: assignment } = await supabase
    .from('event_staff_assignments')
    .select('*')
    .eq('staff_member_id', staffMemberId)
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!assignment) throw new Error('Assignment not found')

  // If there is a pay_amount_cents already computed, return it
  if (assignment.pay_amount_cents != null) {
    return {
      payoutCents: assignment.pay_amount_cents,
      method: member.day_rate_cents ? 'day_rate' : 'hourly',
      details: `Already recorded: $${(assignment.pay_amount_cents / 100).toFixed(2)}`,
    }
  }

  // Prefer day rate, then hourly
  const effectiveRate = assignment.rate_override_cents ?? member.hourly_rate_cents ?? 0

  if (member.day_rate_cents && !assignment.rate_override_cents) {
    return {
      payoutCents: member.day_rate_cents,
      method: 'day_rate',
      details: `Day rate: $${(member.day_rate_cents / 100).toFixed(2)}`,
    }
  }

  const hours = assignment.actual_hours ?? assignment.scheduled_hours ?? 0
  const payoutCents = Math.round(hours * effectiveRate)

  return {
    payoutCents,
    method: 'hourly',
    details: `${hours}h x $${(effectiveRate / 100).toFixed(2)}/hr = $${(payoutCents / 100).toFixed(2)}`,
  }
}

/**
 * Get all freelancers assigned to upcoming events.
 */
export async function getUpcomingFreelancerAssignments() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      *,
      staff_members!inner (id, name, role, staff_type, day_rate_cents, hourly_rate_cents, agency_name, phone),
      events!inner (id, title, event_date, status, location_address, location_city)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('staff_members.staff_type', 'freelance')
    .gte('events.event_date', today)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getUpcomingFreelancerAssignments] Error:', error)
    throw new Error('Failed to load upcoming freelancer assignments')
  }

  return data ?? []
}
