'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type PaymentMilestone = {
  id: string
  event_id: string
  tenant_id: string
  name: string
  amount_cents: number
  due_date: string | null
  status: 'pending' | 'paid' | 'overdue' | 'waived'
  paid_at: string | null
  reminder_sent_at: string | null
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// QUERIES
// ==========================================

export async function getMilestones(eventId: string): Promise<{
  data: PaymentMilestone[] | null
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('payment_milestones')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('sort_order')
    .order('due_date')

  if (error) {
    console.error('[getMilestones] Error:', error)
    return { data: null, error: 'Failed to fetch milestones' }
  }

  return { data: data as PaymentMilestone[], error: null }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function createMilestone(input: {
  event_id: string
  name: string
  amount_cents: number
  due_date?: string
  sort_order?: number
  notes?: string
}): Promise<{ data: PaymentMilestone | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (input.amount_cents < 0) {
    return { data: null, error: 'Amount cannot be negative' }
  }

  const { data, error } = await db
    .from('payment_milestones')
    .insert({
      event_id: input.event_id,
      tenant_id: user.entityId,
      name: input.name,
      amount_cents: input.amount_cents,
      due_date: input.due_date || null,
      sort_order: input.sort_order ?? 0,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createMilestone] Error:', error)
    return { data: null, error: 'Failed to create milestone' }
  }

  revalidatePath(`/events/${input.event_id}`)
  return { data: data as PaymentMilestone, error: null }
}

export async function markMilestonePaid(id: string): Promise<{
  data: PaymentMilestone | null
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('payment_milestones')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[markMilestonePaid] Error:', error)
    return { data: null, error: 'Failed to mark milestone as paid' }
  }

  revalidatePath(`/events/${data.event_id}`)
  return { data: data as PaymentMilestone, error: null }
}

export async function updateMilestone(
  id: string,
  input: {
    name?: string
    amount_cents?: number
    due_date?: string | null
    sort_order?: number
    notes?: string
    status?: 'pending' | 'paid' | 'overdue' | 'waived'
  }
): Promise<{ data: PaymentMilestone | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (input.amount_cents !== undefined && input.amount_cents < 0) {
    return { data: null, error: 'Amount cannot be negative' }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.name !== undefined) updateData.name = input.name
  if (input.amount_cents !== undefined) updateData.amount_cents = input.amount_cents
  if (input.due_date !== undefined) updateData.due_date = input.due_date
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.status !== undefined) updateData.status = input.status

  const { data, error } = await db
    .from('payment_milestones')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[updateMilestone] Error:', error)
    return { data: null, error: 'Failed to update milestone' }
  }

  revalidatePath(`/events/${data.event_id}`)
  return { data: data as PaymentMilestone, error: null }
}

export async function sendMilestoneReminder(id: string): Promise<{
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the milestone to verify ownership and get event details
  const { data: milestone, error: fetchError } = await db
    .from('payment_milestones')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .single()

  if (fetchError || !milestone) {
    return { error: 'Milestone not found' }
  }

  if (milestone.status === 'paid') {
    return { error: 'Cannot send reminder for a paid milestone' }
  }

  // Mark reminder as sent
  const { error: updateError } = await db
    .from('payment_milestones')
    .update({
      reminder_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (updateError) {
    console.error('[sendMilestoneReminder] Error:', updateError)
    return { error: 'Failed to record reminder' }
  }

  // NOTE: Actual email/notification sending would be integrated with
  // the communication pipeline. This records the intent and timestamp.

  revalidatePath(`/events/${milestone.event_id}`)
  return { error: null }
}
