// Calls & Meetings Server Actions
// Full CRUD + lifecycle for scheduled_calls.
// All actions are tenant-scoped via requireChef().

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// ============================================
// TYPES
// ============================================

export type CallType =
  | 'discovery'
  | 'follow_up'
  | 'proposal_walkthrough'
  | 'pre_event_logistics'
  | 'vendor_supplier'
  | 'partner'
  | 'general'
  | 'prospecting'

export type CallStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'

export interface AgendaItem {
  id: string
  item: string
  completed: boolean
  source: 'manual' | 'inquiry' | 'event'
}

export interface ScheduledCall {
  id: string
  tenant_id: string
  client_id: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_company: string | null
  call_type: CallType
  inquiry_id: string | null
  event_id: string | null
  scheduled_at: string
  duration_minutes: number
  timezone: string
  title: string | null
  status: CallStatus
  agenda_items: AgendaItem[]
  prep_notes: string | null
  outcome_summary: string | null
  call_notes: string | null
  next_action: string | null
  next_action_due_at: string | null
  actual_duration_minutes: number | null
  notify_client: boolean
  client_notified_at: string | null
  reminder_24h_sent_at: string | null
  reminder_1h_sent_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  cancelled_at: string | null
  prospect_id: string | null
  // Joined fields (optional)
  client?: { id: string; full_name: string; email: string | null } | null
  inquiry?: { id: string; confirmed_occasion: string | null } | null
  event?: { id: string; title: string; event_date: string | null } | null
}

export interface CallsFilter {
  status?: CallStatus | CallStatus[]
  call_type?: CallType
  client_id?: string
  from?: string // ISO date
  to?: string // ISO date
  limit?: number
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CALL_TYPES = [
  'discovery',
  'follow_up',
  'proposal_walkthrough',
  'pre_event_logistics',
  'vendor_supplier',
  'partner',
  'general',
  'prospecting',
] as const

const CALL_STATUSES = ['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'] as const

const CreateCallSchema = z.object({
  call_type: z.enum(CALL_TYPES),
  scheduled_at: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(5).max(480).default(30),
  timezone: z.string().default('America/New_York'),
  title: z.string().max(200).nullable().optional(),
  // Participants — at least one of client_id or contact_name must be set
  client_id: z.string().uuid().nullable().optional(),
  contact_name: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  contact_company: z.string().max(200).nullable().optional(),
  // Links
  inquiry_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  prospect_id: z.string().uuid().nullable().optional(),
  // Prep
  prep_notes: z.string().max(5000).nullable().optional(),
  // Notification
  notify_client: z.boolean().default(false),
})

const UpdateCallSchema = z.object({
  call_type: z.enum(CALL_TYPES).optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  timezone: z.string().optional(),
  title: z.string().max(200).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  contact_name: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  contact_company: z.string().max(200).nullable().optional(),
  inquiry_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  prep_notes: z.string().max(5000).nullable().optional(),
  notify_client: z.boolean().optional(),
})

const LogOutcomeSchema = z.object({
  outcome_summary: z.string().max(2000).nullable().optional(),
  call_notes: z.string().max(5000).nullable().optional(),
  next_action: z.string().max(500).nullable().optional(),
  next_action_due_at: z.string().datetime({ offset: true }).nullable().optional(),
  actual_duration_minutes: z.number().int().min(1).max(600).nullable().optional(),
})

// ============================================
// CREATE
// ============================================

export type CreateCallInput = z.infer<typeof CreateCallSchema>

/**
 * Schedule a new call. Auto-seeds agenda items when linked to an inquiry or event.
 */
export async function createCall(input: CreateCallInput) {
  const user = await requireChef()
  const validated = CreateCallSchema.parse(input)
  const supabase: any = createServerClient()

  // Auto-seed agenda items from linked inquiry or event
  const agenda_items: AgendaItem[] = []

  if (validated.inquiry_id) {
    const { data: inquiry } = (await supabase
      .from('inquiries')
      .select(
        'confirmed_occasion, guest_count_adults, guest_count_kids, budget_min, budget_max, dietary_restrictions, unknown_blocking_questions'
      )
      .eq('id', validated.inquiry_id)
      .eq('tenant_id', user.tenantId!)
      .single()) as {
      data: {
        confirmed_occasion?: string | null
        guest_count_adults?: number | null
        guest_count_kids?: number | null
        budget_min?: number | null
        budget_max?: number | null
        dietary_restrictions?: string[] | null
        unknown_blocking_questions?: string | null
      } | null
    }

    if (inquiry) {
      if (inquiry.confirmed_occasion) {
        agenda_items.push({
          id: randomUUID(),
          item: `Occasion: ${inquiry.confirmed_occasion}`,
          completed: false,
          source: 'inquiry',
        })
      }
      const guestCount = [
        inquiry.guest_count_adults ? `${inquiry.guest_count_adults} adults` : null,
        inquiry.guest_count_kids ? `${inquiry.guest_count_kids} kids` : null,
      ]
        .filter(Boolean)
        .join(', ')
      if (guestCount) {
        agenda_items.push({
          id: randomUUID(),
          item: `Guest count: ${guestCount}`,
          completed: false,
          source: 'inquiry',
        })
      }
      if (inquiry.budget_min || inquiry.budget_max) {
        const budget = inquiry.budget_max
          ? `$${(inquiry.budget_min ?? 0) / 100}–$${inquiry.budget_max / 100}`
          : `from $${(inquiry.budget_min ?? 0) / 100}`
        agenda_items.push({
          id: randomUUID(),
          item: `Budget: ${budget}`,
          completed: false,
          source: 'inquiry',
        })
      }
      if (inquiry.dietary_restrictions) {
        agenda_items.push({
          id: randomUUID(),
          item: `Dietary: ${inquiry.dietary_restrictions}`,
          completed: false,
          source: 'inquiry',
        })
      }
      if (inquiry.unknown_blocking_questions) {
        agenda_items.push({
          id: randomUUID(),
          item: `Open question: ${inquiry.unknown_blocking_questions}`,
          completed: false,
          source: 'inquiry',
        })
      }
    }
  }

  if (validated.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('event_date, guest_count, status')
      .eq('id', validated.event_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (event) {
      if (event.event_date) {
        agenda_items.push({
          id: randomUUID(),
          item: `Event date: ${new Date(event.event_date).toLocaleDateString()}`,
          completed: false,
          source: 'event',
        })
      }
      if (event.guest_count) {
        agenda_items.push({
          id: randomUUID(),
          item: `Guest count: ${event.guest_count}`,
          completed: false,
          source: 'event',
        })
      }
      agenda_items.push({
        id: randomUUID(),
        item: `Confirm event status: ${event.status}`,
        completed: false,
        source: 'event',
      })
    }
  }

  const { data, error } = await supabase
    .from('scheduled_calls')
    .insert({
      tenant_id: user.tenantId!,
      call_type: validated.call_type,
      scheduled_at: validated.scheduled_at,
      duration_minutes: validated.duration_minutes,
      timezone: validated.timezone,
      title: validated.title ?? null,
      client_id: validated.client_id ?? null,
      contact_name: validated.contact_name ?? null,
      contact_phone: validated.contact_phone ?? null,
      contact_company: validated.contact_company ?? null,
      inquiry_id: validated.inquiry_id ?? null,
      event_id: validated.event_id ?? null,
      prep_notes: validated.prep_notes ?? null,
      notify_client: validated.notify_client,
      agenda_items,
    })
    .select()
    .single()

  if (error) {
    console.error('[createCall] Error:', error)
    throw new Error('Failed to create call')
  }

  // Send client notification if requested
  if (validated.notify_client && validated.client_id) {
    await _notifyClientOfCall(data.id, user.tenantId!)
  }

  revalidatePath('/calls')

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const contactLabel = validated.contact_name ?? 'client'
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'call_created' as any,
      domain: 'calls' as any,
      entityType: 'scheduled_call',
      entityId: data.id,
      summary: `Scheduled ${validated.call_type.replace('_', ' ')} call with ${contactLabel}`,
      context: { call_type: validated.call_type, scheduled_at: validated.scheduled_at },
    })
  } catch (err) {
    console.error('[createCall] Activity log failed (non-blocking):', err)
  }

  return { success: true as const, call: data as ScheduledCall }
}

// ============================================
// READ
// ============================================

/**
 * List calls for the chef's tenant with optional filters.
 */
export async function getCalls(filter?: CallsFilter): Promise<ScheduledCall[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('scheduled_calls')
    .select(
      `
      *,
      client:clients(id, full_name, email),
      inquiry:inquiries(id, confirmed_occasion),
      event:events(id, event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status)
    } else {
      query = query.eq('status', filter.status)
    }
  }

  if (filter?.call_type) {
    query = query.eq('call_type', filter.call_type)
  }

  if (filter?.client_id) {
    query = query.eq('client_id', filter.client_id)
  }

  if (filter?.from) {
    query = query.gte('scheduled_at', filter.from)
  }

  if (filter?.to) {
    query = query.lte('scheduled_at', filter.to)
  }

  query = query.order('scheduled_at', { ascending: true }).limit(filter?.limit ?? 100)

  const { data, error } = await query

  if (error) {
    console.error('[getCalls] Error:', error)
    return []
  }

  return (data || []) as unknown as ScheduledCall[]
}

/**
 * Get upcoming calls (scheduled/confirmed, in the future) for the dashboard widget.
 */
export async function getUpcomingCalls(limit = 5): Promise<ScheduledCall[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('scheduled_calls')
    .select(
      `
      *,
      client:clients(id, full_name, email)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['scheduled', 'confirmed'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[getUpcomingCalls] Error:', error)
    return []
  }

  return (data || []) as unknown as ScheduledCall[]
}

/**
 * Get a single call with all joined context.
 */
export async function getCall(id: string): Promise<ScheduledCall | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('scheduled_calls')
    .select(
      `
      *,
      client:clients(id, full_name, email),
      inquiry:inquiries(id, confirmed_occasion, status, guest_count_adults, budget_min, budget_max, dietary_restrictions),
      event:events(id, event_date, status, guest_count)
    `
    )
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getCall] Error:', error)
    return null
  }

  return data as unknown as ScheduledCall
}

// ============================================
// UPDATE
// ============================================

export type UpdateCallInput = z.infer<typeof UpdateCallSchema>

/**
 * Update scheduling details or prep notes for a call.
 */
export async function updateCall(id: string, input: UpdateCallInput) {
  const user = await requireChef()
  const validated = UpdateCallSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('scheduled_calls')
    .update(validated)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateCall] Error:', error)
    throw new Error('Failed to update call')
  }

  revalidatePath('/calls')
  revalidatePath(`/calls/${id}`)

  return { success: true as const, call: data as unknown as ScheduledCall }
}

// ============================================
// STATUS TRANSITIONS
// ============================================

// Valid state machine transitions
const VALID_TRANSITIONS: Record<CallStatus, CallStatus[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  no_show: [],
  cancelled: [],
}

/**
 * Transition a call to a new status.
 * Enforces the FSM — rejects invalid transitions.
 */
export async function updateCallStatus(id: string, newStatus: CallStatus) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch current status
  const { data: current, error: fetchError } = await supabase
    .from('scheduled_calls')
    .select('status, call_type, scheduled_at, client_id, contact_name')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !current) {
    throw new Error('Call not found')
  }

  const allowed = VALID_TRANSITIONS[current.status as CallStatus]
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${current.status} to ${newStatus}`)
  }

  const updates: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
  if (newStatus === 'cancelled') updates.cancelled_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('scheduled_calls')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateCallStatus] Error:', error)
    throw new Error('Failed to update call status')
  }

  revalidatePath('/calls')
  revalidatePath(`/calls/${id}`)

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: `call_${newStatus}` as any,
      domain: 'calls' as any,
      entityType: 'scheduled_call',
      entityId: id,
      summary: `Call marked as ${newStatus}`,
      context: { previous_status: current.status, new_status: newStatus },
    })
  } catch (err) {
    console.error('[updateCallStatus] Activity log failed (non-blocking):', err)
  }

  return { success: true as const, call: data as unknown as ScheduledCall }
}

// ============================================
// AGENDA MANAGEMENT
// ============================================

/**
 * Add a manual agenda item to a call.
 */
export async function addAgendaItem(callId: string, itemText: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: current, error: fetchError } = await supabase
    .from('scheduled_calls')
    .select('agenda_items')
    .eq('id', callId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !current) {
    throw new Error('Call not found')
  }

  const existing: AgendaItem[] = (current.agenda_items as AgendaItem[]) || []
  const newItem: AgendaItem = {
    id: randomUUID(),
    item: itemText.trim(),
    completed: false,
    source: 'manual',
  }

  const { error } = await supabase
    .from('scheduled_calls')
    .update({ agenda_items: [...existing, newItem] })
    .eq('id', callId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[addAgendaItem] Error:', error)
    throw new Error('Failed to add agenda item')
  }

  revalidatePath(`/calls/${callId}`)

  return { success: true as const, item: newItem }
}

/**
 * Toggle completed status of an agenda item.
 */
export async function toggleAgendaItem(callId: string, itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: current, error: fetchError } = await supabase
    .from('scheduled_calls')
    .select('agenda_items')
    .eq('id', callId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !current) {
    throw new Error('Call not found')
  }

  const items: AgendaItem[] = (current.agenda_items as AgendaItem[]) || []
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, completed: !item.completed } : item
  )

  const { error } = await supabase
    .from('scheduled_calls')
    .update({ agenda_items: updated })
    .eq('id', callId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleAgendaItem] Error:', error)
    throw new Error('Failed to update agenda item')
  }

  revalidatePath(`/calls/${callId}`)

  return { success: true as const }
}

/**
 * Remove an agenda item.
 */
export async function removeAgendaItem(callId: string, itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: current, error: fetchError } = await supabase
    .from('scheduled_calls')
    .select('agenda_items')
    .eq('id', callId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !current) {
    throw new Error('Call not found')
  }

  const items: AgendaItem[] = (current.agenda_items as AgendaItem[]) || []
  const updated = items.filter((item) => item.id !== itemId)

  const { error } = await supabase
    .from('scheduled_calls')
    .update({ agenda_items: updated })
    .eq('id', callId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[removeAgendaItem] Error:', error)
    throw new Error('Failed to remove agenda item')
  }

  revalidatePath(`/calls/${callId}`)

  return { success: true as const }
}

// ============================================
// OUTCOME LOGGING
// ============================================

export type LogOutcomeInput = z.infer<typeof LogOutcomeSchema>

/**
 * Log call outcome after the call is completed.
 * Also marks the call as completed if it isn't already.
 */
export async function logCallOutcome(id: string, input: LogOutcomeInput) {
  const user = await requireChef()
  const validated = LogOutcomeSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('scheduled_calls')
    .update({
      ...validated,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[logCallOutcome] Error:', error)
    throw new Error('Failed to log call outcome')
  }

  revalidatePath('/calls')
  revalidatePath(`/calls/${id}`)

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'call_outcome_logged' as any,
      domain: 'calls' as any,
      entityType: 'scheduled_call',
      entityId: id,
      summary: validated.outcome_summary
        ? `Call outcome: "${validated.outcome_summary.slice(0, 80)}"`
        : 'Call outcome logged',
      context: {
        has_next_action: !!validated.next_action,
        actual_duration: validated.actual_duration_minutes,
      },
    })
  } catch (err) {
    console.error('[logCallOutcome] Activity log failed (non-blocking):', err)
  }

  return { success: true as const, call: data as unknown as ScheduledCall }
}

// ============================================
// CANCEL
// ============================================

/**
 * Cancel a call. Works from any non-terminal status.
 */
export async function cancelCall(id: string) {
  return updateCallStatus(id, 'cancelled')
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Send a client notification email that a call has been scheduled.
 * Non-throwing — logs errors but does not fail the parent action.
 */
async function _notifyClientOfCall(callId: string, tenantId: string) {
  try {
    const supabase: any = createServerClient()

    const { data: call } = await supabase
      .from('scheduled_calls')
      .select(
        `
        id, scheduled_at, duration_minutes, call_type, title,
        client:clients(id, full_name, email),
        chef:chefs(id, display_name)
      `
      )
      .eq('id', callId)
      .eq('tenant_id', tenantId)
      .single()

    if (!call) return

    const client = call.client as { full_name: string; email: string | null } | null
    const chef = call.chef as { display_name: string | null } | null

    if (!client?.email) return

    const { sendEmail } = await import('@/lib/email/send')
    const { CallReminderEmail } = await import('@/lib/email/templates/call-reminder')

    await sendEmail({
      to: client.email,
      subject: `Your call with ${chef?.display_name ?? 'your chef'} is confirmed`,
      react: CallReminderEmail({
        recipientName: client.full_name,
        chefName: chef?.display_name ?? 'Your chef',
        callType: call.call_type as CallType,
        scheduledAt: call.scheduled_at,
        durationMinutes: call.duration_minutes,
        title: (call.title as string | null) ?? null,
        isChefReminder: false,
      }),
    })

    // Mark notified
    await supabase
      .from('scheduled_calls')
      .update({ client_notified_at: new Date().toISOString() })
      .eq('id', callId)
      .eq('tenant_id', tenantId)
  } catch (err) {
    console.error('[_notifyClientOfCall] Failed (non-blocking):', err)
  }
}
