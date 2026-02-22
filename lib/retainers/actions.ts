'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Schemas ─────────────────────────────────────────────────────

const CreateRetainerSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  billingCycle: z.enum(['weekly', 'biweekly', 'monthly']),
  amountCents: z.number().int().min(0),
  includesEventsCount: z.number().int().min(0).nullable().optional(),
  includesHours: z.number().min(0).nullable().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  termsSummary: z.string().nullable().optional(),
})

const UpdateRetainerSchema = z.object({
  name: z.string().min(1).optional(),
  billingCycle: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  amountCents: z.number().int().min(0).optional(),
  includesEventsCount: z.number().int().min(0).nullable().optional(),
  includesHours: z.number().min(0).nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  termsSummary: z.string().nullable().optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────

function computeNextBillingDate(fromDate: string, cycle: string): string {
  const d = new Date(fromDate)
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'biweekly':
      d.setDate(d.getDate() + 14)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
  }
  return d.toISOString().split('T')[0]
}

function computePeriodEnd(periodStart: string, cycle: string): string {
  const d = new Date(periodStart)
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 6)
      break
    case 'biweekly':
      d.setDate(d.getDate() + 13)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      d.setDate(d.getDate() - 1)
      break
  }
  return d.toISOString().split('T')[0]
}

// ─── Actions ─────────────────────────────────────────────────────

export async function createRetainer(input: z.infer<typeof CreateRetainerSchema>) {
  const user = await requireChef()
  const parsed = CreateRetainerSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('retainers')
    .insert({
      tenant_id: user.tenantId!,
      client_id: parsed.clientId,
      name: parsed.name,
      billing_cycle: parsed.billingCycle,
      amount_cents: parsed.amountCents,
      includes_events_count: parsed.includesEventsCount ?? null,
      includes_hours: parsed.includesHours ?? null,
      start_date: parsed.startDate,
      end_date: parsed.endDate ?? null,
      notes: parsed.notes ?? null,
      terms_summary: parsed.termsSummary ?? null,
      status: 'draft',
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create retainer: ${error.message}`)

  revalidatePath('/finance/retainers')
  return data
}

export async function updateRetainer(id: string, input: z.infer<typeof UpdateRetainerSchema>) {
  const user = await requireChef()
  const parsed = UpdateRetainerSchema.parse(input)
  const supabase = createServerClient()

  // Verify retainer exists and is editable
  const { data: existing, error: fetchError } = await supabase
    .from('retainers')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !existing) throw new Error('Retainer not found')
  if (!['draft', 'active'].includes(existing.status)) {
    throw new Error(`Cannot edit retainer in '${existing.status}' status`)
  }

  const updates: Record<string, any> = {}
  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.billingCycle !== undefined) updates.billing_cycle = parsed.billingCycle
  if (parsed.amountCents !== undefined) updates.amount_cents = parsed.amountCents
  if (parsed.includesEventsCount !== undefined)
    updates.includes_events_count = parsed.includesEventsCount
  if (parsed.includesHours !== undefined) updates.includes_hours = parsed.includesHours
  if (parsed.startDate !== undefined) updates.start_date = parsed.startDate
  if (parsed.endDate !== undefined) updates.end_date = parsed.endDate
  if (parsed.notes !== undefined) updates.notes = parsed.notes
  if (parsed.termsSummary !== undefined) updates.terms_summary = parsed.termsSummary

  const { data, error } = await supabase
    .from('retainers')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update retainer: ${error.message}`)

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${id}`)
  return data
}

export async function activateRetainer(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: retainer, error: fetchError } = await supabase
    .from('retainers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !retainer) throw new Error('Retainer not found')
  if (retainer.status !== 'draft') {
    throw new Error(`Can only activate a draft retainer (current: ${retainer.status})`)
  }

  const periodStart = retainer.start_date
  const periodEnd = computePeriodEnd(periodStart, retainer.billing_cycle)
  const nextBilling = computeNextBillingDate(periodStart, retainer.billing_cycle)

  // Update retainer status and next billing date
  const { error: updateError } = await supabase
    .from('retainers')
    .update({
      status: 'active',
      next_billing_date: nextBilling,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (updateError) throw new Error(`Failed to activate retainer: ${updateError.message}`)

  // Generate first billing period
  const { error: periodError } = await supabase.from('retainer_periods').insert({
    retainer_id: id,
    tenant_id: user.tenantId!,
    period_start: periodStart,
    period_end: periodEnd,
    status: 'pending',
    amount_cents: retainer.amount_cents,
  })

  if (periodError) {
    console.error('[activateRetainer] Failed to create first period (non-blocking):', periodError)
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'retainer_activated',
      domain: 'financial',
      entityType: 'retainer',
      entityId: id,
      summary: `Activated retainer: ${retainer.name}`,
      context: { retainer_name: retainer.name, amount_cents: retainer.amount_cents },
      clientId: retainer.client_id,
    })
  } catch (err) {
    console.error('[activateRetainer] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${id}`)
  return { success: true }
}

export async function pauseRetainer(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: retainer, error: fetchError } = await supabase
    .from('retainers')
    .select('status, name, client_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !retainer) throw new Error('Retainer not found')
  if (retainer.status !== 'active') {
    throw new Error(`Can only pause an active retainer (current: ${retainer.status})`)
  }

  const { error } = await supabase
    .from('retainers')
    .update({ status: 'paused' })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to pause retainer: ${error.message}`)

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'retainer_paused',
      domain: 'financial',
      entityType: 'retainer',
      entityId: id,
      summary: `Paused retainer: ${retainer.name}`,
      context: { retainer_name: retainer.name },
      clientId: retainer.client_id,
    })
  } catch (err) {
    console.error('[pauseRetainer] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${id}`)
  return { success: true }
}

export async function resumeRetainer(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: retainer, error: fetchError } = await supabase
    .from('retainers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !retainer) throw new Error('Retainer not found')
  if (retainer.status !== 'paused') {
    throw new Error(`Can only resume a paused retainer (current: ${retainer.status})`)
  }

  // Recalculate next billing date from today
  const today = new Date().toISOString().split('T')[0]
  const nextBilling = computeNextBillingDate(today, retainer.billing_cycle)

  const { error } = await supabase
    .from('retainers')
    .update({
      status: 'active',
      next_billing_date: nextBilling,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to resume retainer: ${error.message}`)

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'retainer_resumed',
      domain: 'financial',
      entityType: 'retainer',
      entityId: id,
      summary: `Resumed retainer: ${retainer.name}`,
      context: { retainer_name: retainer.name, next_billing: nextBilling },
      clientId: retainer.client_id,
    })
  } catch (err) {
    console.error('[resumeRetainer] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${id}`)
  return { success: true }
}

export async function cancelRetainer(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: retainer, error: fetchError } = await supabase
    .from('retainers')
    .select('status, name, client_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !retainer) throw new Error('Retainer not found')

  const terminalStatuses = ['cancelled', 'completed']
  if (terminalStatuses.includes(retainer.status)) {
    throw new Error(`Retainer is already ${retainer.status}`)
  }

  // Cancel the retainer
  const { error } = await supabase
    .from('retainers')
    .update({ status: 'cancelled', next_billing_date: null })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to cancel retainer: ${error.message}`)

  // Void all pending periods
  const { error: voidError } = await supabase
    .from('retainer_periods')
    .update({ status: 'void' })
    .eq('retainer_id', id)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')

  if (voidError) {
    console.error('[cancelRetainer] Failed to void pending periods (non-blocking):', voidError)
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'retainer_cancelled',
      domain: 'financial',
      entityType: 'retainer',
      entityId: id,
      summary: `Cancelled retainer: ${retainer.name}`,
      context: { retainer_name: retainer.name, previous_status: retainer.status },
      clientId: retainer.client_id,
    })
  } catch (err) {
    console.error('[cancelRetainer] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${id}`)
  return { success: true }
}

export async function completeRetainer(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: retainer, error: fetchError } = await supabase
    .from('retainers')
    .select('status, name, client_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !retainer) throw new Error('Retainer not found')
  if (retainer.status !== 'active') {
    throw new Error(`Can only complete an active retainer (current: ${retainer.status})`)
  }

  const { error } = await supabase
    .from('retainers')
    .update({ status: 'completed', next_billing_date: null })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to complete retainer: ${error.message}`)

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'retainer_completed',
      domain: 'financial',
      entityType: 'retainer',
      entityId: id,
      summary: `Completed retainer: ${retainer.name}`,
      context: { retainer_name: retainer.name },
      clientId: retainer.client_id,
    })
  } catch (err) {
    console.error('[completeRetainer] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${id}`)
  return { success: true }
}

export async function getRetainersByTenant() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('retainers')
    .select('*, clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch retainers: ${error.message}`)
  return data || []
}

export async function getRetainerDetail(retainerId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch retainer with client name
  const { data: retainer, error: retainerError } = await supabase
    .from('retainers')
    .select('*, clients(full_name, email)')
    .eq('id', retainerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (retainerError || !retainer) throw new Error('Retainer not found')

  // Fetch periods
  const { data: periods, error: periodsError } = await supabase
    .from('retainer_periods')
    .select('*')
    .eq('retainer_id', retainerId)
    .eq('tenant_id', user.tenantId!)
    .order('period_start', { ascending: false })

  if (periodsError) throw new Error(`Failed to fetch periods: ${periodsError.message}`)

  // Fetch linked events
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, guest_count')
    .eq('retainer_id', retainerId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })

  if (eventsError) {
    console.error('[getRetainerDetail] Failed to fetch linked events (non-blocking):', eventsError)
  }

  return {
    ...retainer,
    periods: periods || [],
    linked_events: events || [],
  }
}

export async function recordRetainerPayment(
  periodId: string,
  paymentMethod: string,
  notes?: string
) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the period and its parent retainer
  const { data: period, error: periodError } = await supabase
    .from('retainer_periods')
    .select('*, retainers(tenant_id, client_id, name)')
    .eq('id', periodId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (periodError || !period) throw new Error('Period not found')
  if (period.status !== 'pending' && period.status !== 'overdue') {
    throw new Error(`Cannot record payment for a period in '${period.status}' status`)
  }

  const retainer = period.retainers

  // Append to ledger using admin client (same pattern as offline-payment-actions)
  const supabaseAdmin = createServerClient({ admin: true })

  const { data: ledgerEntry, error: ledgerError } = await (supabaseAdmin as any)
    .from('ledger_entries')
    .insert({
      tenant_id: retainer.tenant_id,
      client_id: retainer.client_id,
      entry_type: 'retainer',
      amount_cents: period.amount_cents,
      payment_method: paymentMethod,
      description: `Retainer: ${retainer.name} (${period.period_start} \u2013 ${period.period_end})`,
      event_id: null,
      transaction_reference: null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (ledgerError) {
    console.error('[recordRetainerPayment] Ledger error:', ledgerError)
    throw new Error('Failed to record payment in ledger')
  }

  // Update period to paid
  const { error: updateError } = await supabase
    .from('retainer_periods')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      ledger_entry_id: ledgerEntry?.id ?? null,
    })
    .eq('id', periodId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) throw new Error(`Failed to update period: ${updateError.message}`)

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'ledger_entry_created',
      domain: 'financial',
      entityType: 'ledger_entry',
      entityId: ledgerEntry?.id,
      summary: `Recorded retainer payment: $${(period.amount_cents / 100).toFixed(2)} via ${paymentMethod}`,
      context: {
        amount_cents: period.amount_cents,
        entry_type: 'retainer',
        payment_method: paymentMethod,
        retainer_name: retainer.name,
        period_id: periodId,
      },
      clientId: retainer.client_id,
    })
  } catch (err) {
    console.error('[recordRetainerPayment] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${period.retainer_id}`)
  return { success: true, ledgerEntryId: ledgerEntry?.id }
}

export async function linkEventToRetainer(eventId: string, retainerId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify both event and retainer belong to this tenant
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')

  const { data: retainer, error: retainerError } = await supabase
    .from('retainers')
    .select('id, status')
    .eq('id', retainerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (retainerError || !retainer) throw new Error('Retainer not found')
  if (retainer.status !== 'active') {
    throw new Error('Can only link events to an active retainer')
  }

  // Link event to retainer
  const { error: linkError } = await supabase
    .from('events')
    .update({ retainer_id: retainerId })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (linkError) throw new Error(`Failed to link event: ${linkError.message}`)

  // Find the current active period and increment events_used
  const today = new Date().toISOString().split('T')[0]
  const { data: currentPeriod } = await supabase
    .from('retainer_periods')
    .select('id, events_used')
    .eq('retainer_id', retainerId)
    .eq('tenant_id', user.tenantId!)
    .lte('period_start', today)
    .gte('period_end', today)
    .in('status', ['pending', 'paid'])
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

  if (currentPeriod) {
    // Also link event to the specific period
    await supabase
      .from('events')
      .update({ retainer_period_id: currentPeriod.id })
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)

    await supabase
      .from('retainer_periods')
      .update({ events_used: (currentPeriod.events_used || 0) + 1 })
      .eq('id', currentPeriod.id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${retainerId}`)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function unlinkEventFromRetainer(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event with retainer info
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, retainer_id, retainer_period_id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')
  if (!event.retainer_id) throw new Error('Event is not linked to a retainer')

  const retainerId = event.retainer_id
  const periodId = event.retainer_period_id

  // Unlink event
  const { error: unlinkError } = await supabase
    .from('events')
    .update({ retainer_id: null, retainer_period_id: null })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (unlinkError) throw new Error(`Failed to unlink event: ${unlinkError.message}`)

  // Decrement events_used on the period if we know which one
  if (periodId) {
    const { data: period } = await supabase
      .from('retainer_periods')
      .select('id, events_used')
      .eq('id', periodId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (period && period.events_used > 0) {
      await supabase
        .from('retainer_periods')
        .update({ events_used: period.events_used - 1 })
        .eq('id', periodId)
        .eq('tenant_id', user.tenantId!)
    }
  }

  revalidatePath('/finance/retainers')
  revalidatePath(`/finance/retainers/${retainerId}`)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
