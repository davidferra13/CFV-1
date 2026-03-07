'use server'

// Post-Event Follow-Up Server Actions
// CRUD + trigger actions for the follow-up sequence system.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { schedulePostEventFollowUp, cancelFollowUpSends } from './sequence-engine'

type FollowUpSend = {
  id: string
  tenant_id: string
  event_id: string
  client_id: string
  rule_id: string | null
  step_number: number
  subject: string
  status: string
  scheduled_for: string
  sent_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all follow-up sends for a specific event.
 */
export async function getEventFollowUpSends(
  eventId: string
): Promise<{ data: FollowUpSend[]; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('follow_up_sends')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('step_number', { ascending: true })

  if (error) {
    console.error('[follow-up-actions] getEventFollowUpSends error:', error)
    return { data: [], error: error.message }
  }

  return { data: (data as FollowUpSend[]) || [] }
}

/**
 * Cancel all pending follow-up sends for an event.
 */
export async function cancelEventFollowUp(
  eventId: string
): Promise<{ success: boolean; cancelled: number; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get the client_id from the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('client_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    return { success: false, cancelled: 0, error: 'Event not found' }
  }

  // Cancel only pending sends for this specific event
  const { data: pending } = await supabase
    .from('follow_up_sends')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')

  if (!pending || pending.length === 0) {
    return { success: true, cancelled: 0 }
  }

  const ids = pending.map((s) => s.id)

  const { error: updateError } = await supabase
    .from('follow_up_sends')
    .update({
      status: 'skipped',
      cancelled_at: new Date().toISOString(),
      cancel_reason: 'Manually cancelled by chef',
    })
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    return { success: false, cancelled: 0, error: updateError.message }
  }

  return { success: true, cancelled: ids.length }
}

/**
 * Manually trigger the follow-up sequence for a completed event.
 * Useful if the automatic trigger was missed or if the chef wants to restart.
 */
export async function triggerFollowUpForEvent(
  eventId: string
): Promise<{ success: boolean; scheduled: number; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to tenant and is completed
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    return { success: false, scheduled: 0, error: 'Event not found' }
  }

  if (event.status !== 'completed') {
    return { success: false, scheduled: 0, error: 'Event must be completed to trigger follow-ups' }
  }

  const result = await schedulePostEventFollowUp(eventId, user.tenantId!)

  if (result.error) {
    return { success: false, scheduled: 0, error: result.error }
  }

  return { success: true, scheduled: result.scheduled }
}

/**
 * Get overview stats for the follow-up system across all events.
 */
export async function getFollowUpStats(): Promise<{
  total: number
  pending: number
  sent: number
  opened: number
  skipped: number
  bounced: number
  error?: string
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const empty = { total: 0, pending: 0, sent: 0, opened: 0, skipped: 0, bounced: 0 }

  const { data, error } = await supabase
    .from('follow_up_sends')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[follow-up-actions] getFollowUpStats error:', error)
    return { ...empty, error: error.message }
  }

  if (!data || data.length === 0) {
    return empty
  }

  const stats = data.reduce(
    (acc, row) => {
      acc.total++
      const status = row.status as string
      if (status === 'pending') acc.pending++
      else if (status === 'sent') acc.sent++
      else if (status === 'opened') acc.opened++
      else if (status === 'clicked')
        acc.opened++ // clicked implies opened
      else if (status === 'skipped') acc.skipped++
      else if (status === 'bounced') acc.bounced++
      return acc
    },
    { total: 0, pending: 0, sent: 0, opened: 0, skipped: 0, bounced: 0 }
  )

  return stats
}
