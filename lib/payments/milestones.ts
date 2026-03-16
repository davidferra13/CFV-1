'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ==========================================
// TYPES
// ==========================================

export type MilestoneDefinition = {
  name: string
  percentage?: number
  fixed_amount_cents?: number
  due_trigger: 'on_confirmation' | 'days_before_event' | 'day_of_event' | 'days_after_event'
  due_offset_days: number
  reminder_days_before: number[]
  required: boolean
}

export type PaymentMilestone = {
  id: string
  event_id: string
  tenant_id: string
  milestone_name: string
  amount_cents: number
  due_date: string | null
  status: 'pending' | 'reminded' | 'paid' | 'overdue' | 'waived'
  ledger_entry_id: string | null
  reminder_sent_at: string | null
  paid_at: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

export type MilestoneTemplate = {
  id: string
  chef_id: string
  name: string
  is_default: boolean
  milestones: MilestoneDefinition[]
}

// ==========================================
// TEMPLATE MANAGEMENT
// ==========================================

export async function getMilestoneTemplates(): Promise<MilestoneTemplate[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('payment_milestone_templates')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('is_default', { ascending: false })

  if (error) {
    console.error('[milestones] Failed to load templates:', error.message)
    return []
  }

  return (data ?? []).map((t: any) => ({
    ...t,
    milestones: t.milestones as MilestoneDefinition[],
  }))
}

const CreateMilestoneTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  is_default: z.boolean().optional(),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1),
        percentage: z.number().min(0).max(100).optional(),
        fixed_amount_cents: z.number().int().min(0).optional(),
        due_trigger: z.enum([
          'on_confirmation',
          'days_before_event',
          'day_of_event',
          'days_after_event',
        ]),
        due_offset_days: z.number().int().min(0).max(365),
        reminder_days_before: z.array(z.number().int().min(0)).default([3, 1]),
        required: z.boolean().default(true),
      })
    )
    .min(1),
})

export async function createMilestoneTemplate(
  input: z.infer<typeof CreateMilestoneTemplateSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const parsed = CreateMilestoneTemplateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid template.' }

  const supabase = createServerClient()

  if (parsed.data.is_default) {
    await supabase
      .from('payment_milestone_templates')
      .update({ is_default: false })
      .eq('chef_id', user.entityId)
  }

  const { data, error } = await supabase
    .from('payment_milestone_templates')
    .insert({
      chef_id: user.entityId,
      name: parsed.data.name,
      is_default: parsed.data.is_default ?? false,
      milestones: parsed.data.milestones,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[milestones] Template create failed:', error.message)
    return { success: false, error: 'Failed to create template.' }
  }

  revalidatePath('/settings/payments/milestones')
  return { success: true, id: data.id }
}

export async function updateMilestoneTemplate(
  id: string,
  input: Partial<z.infer<typeof CreateMilestoneTemplateSchema>>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.name) updates.name = input.name
  if (input.milestones) updates.milestones = input.milestones
  if (input.is_default !== undefined) {
    if (input.is_default) {
      await supabase
        .from('payment_milestone_templates')
        .update({ is_default: false })
        .eq('chef_id', user.entityId)
    }
    updates.is_default = input.is_default
  }

  const { error } = await supabase
    .from('payment_milestone_templates')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[milestones] Template update failed:', error.message)
    return { success: false, error: 'Failed to update template.' }
  }

  revalidatePath('/settings/payments/milestones')
  return { success: true }
}

export async function deleteMilestoneTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('payment_milestone_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[milestones] Template delete failed:', error.message)
    return { success: false, error: 'Failed to delete template.' }
  }

  revalidatePath('/settings/payments/milestones')
  return { success: true }
}

// ==========================================
// EVENT MILESTONE MANAGEMENT
// ==========================================

export async function createMilestonesForEvent(
  eventId: string,
  templateId?: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Load event
  const { data: event } = await supabase
    .from('events')
    .select('id, quoted_price_cents, event_date, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, error: 'Event not found.' }
  if (!event.quoted_price_cents) return { success: false, error: 'Event has no quoted price.' }

  // Load template
  let template: MilestoneTemplate | null = null
  if (templateId) {
    const { data } = await supabase
      .from('payment_milestone_templates')
      .select('*')
      .eq('id', templateId)
      .eq('chef_id', user.entityId)
      .single()
    template = data ? { ...data, milestones: data.milestones as MilestoneDefinition[] } : null
  }

  if (!template) {
    // Use default template or system default
    const { data } = await supabase
      .from('payment_milestone_templates')
      .select('*')
      .eq('chef_id', user.entityId)
      .eq('is_default', true)
      .maybeSingle()

    template = data
      ? { ...data, milestones: data.milestones as MilestoneDefinition[] }
      : getSystemDefaultMilestoneTemplate(user.entityId)
  }

  // Calculate milestone amounts and dates
  const milestoneRecords = template.milestones.map((def, index) => {
    const amountCents =
      def.fixed_amount_cents ??
      Math.round((event.quoted_price_cents! * (def.percentage ?? 0)) / 100)

    let dueDate: string | null = null
    if (event.event_date) {
      const eventDate = new Date(event.event_date)
      switch (def.due_trigger) {
        case 'on_confirmation':
          dueDate = new Date().toISOString().split('T')[0]
          break
        case 'days_before_event':
          dueDate = new Date(eventDate.getTime() - def.due_offset_days * 86400000)
            .toISOString()
            .split('T')[0]
          break
        case 'day_of_event':
          dueDate = event.event_date
          break
        case 'days_after_event':
          dueDate = new Date(eventDate.getTime() + def.due_offset_days * 86400000)
            .toISOString()
            .split('T')[0]
          break
      }
    }

    return {
      event_id: eventId,
      tenant_id: user.entityId,
      milestone_name: def.name,
      amount_cents: amountCents,
      due_date: dueDate,
      status: 'pending' as const,
      sort_order: index,
    }
  })

  // Delete existing milestones for this event (if re-creating)
  await supabase
    .from('event_payment_milestones')
    .delete()
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)

  const { error } = await supabase.from('event_payment_milestones').insert(milestoneRecords)

  if (error) {
    console.error('[milestones] Failed to create milestones:', error.message)
    return { success: false, error: 'Failed to create payment schedule.' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, count: milestoneRecords.length }
}

export async function getEventMilestones(eventId: string): Promise<PaymentMilestone[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('event_payment_milestones')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[milestones] Load failed:', error.message)
    return []
  }

  return data ?? []
}

export async function recordMilestonePayment(
  milestoneId: string,
  ledgerEntryId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('event_payment_milestones')
    .update({
      status: 'paid',
      ledger_entry_id: ledgerEntryId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[milestones] Payment record failed:', error.message)
    return { success: false, error: 'Failed to record payment.' }
  }

  // Get event ID for cache invalidation
  const { data: milestone } = await supabase
    .from('event_payment_milestones')
    .select('event_id')
    .eq('id', milestoneId)
    .single()

  if (milestone) {
    revalidatePath(`/events/${milestone.event_id}`)
  }

  return { success: true }
}

export async function waiveMilestone(
  milestoneId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('event_payment_milestones')
    .update({
      status: 'waived',
      waived_at: new Date().toISOString(),
      waived_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to waive milestone.' }
  return { success: true }
}

// ==========================================
// SYSTEM DEFAULT TEMPLATE
// ==========================================

function getSystemDefaultMilestoneTemplate(chefId: string): MilestoneTemplate {
  return {
    id: 'system-default',
    chef_id: chefId,
    name: 'Standard Event',
    is_default: true,
    milestones: [
      {
        name: 'Deposit',
        percentage: 25,
        due_trigger: 'on_confirmation',
        due_offset_days: 0,
        reminder_days_before: [3, 1],
        required: true,
      },
      {
        name: 'Grocery Advance',
        percentage: 20,
        due_trigger: 'days_before_event',
        due_offset_days: 7,
        reminder_days_before: [3, 1],
        required: true,
      },
      {
        name: 'Balance',
        percentage: 55,
        due_trigger: 'day_of_event',
        due_offset_days: 0,
        reminder_days_before: [3, 1],
        required: true,
      },
    ],
  }
}
