// Post-Event Follow-Up Sequence Engine
// Core logic for scheduling, cancelling, and processing follow-up email sends.
// NOT a server action file. Called from server actions and event transitions.

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import {
  getThankYouEmail,
  getRebookingNudgeEmail,
  getSeasonalTeaserEmail,
} from './sequence-templates'

// Default follow-up steps when no custom rules exist
const DEFAULT_STEPS = [
  { stepNumber: 1, delayDays: 1, subject: 'Thank you for a wonderful evening' },
  { stepNumber: 2, delayDays: 14, subject: 'Let us cook for you again' },
  { stepNumber: 3, delayDays: 90, subject: 'New seasonal menus are here' },
] as const

type FollowUpSend = {
  id: string
  tenant_id: string
  event_id: string
  client_id: string
  rule_id: string | null
  step_number: number
  subject: string
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'bounced' | 'skipped'
  scheduled_for: string
  sent_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

/**
 * Schedule the post-event follow-up sequence for a completed event.
 * Called when an event transitions to 'completed'.
 * Looks up active followup_rules for trigger_type='event_completed',
 * falls back to default steps if none exist.
 */
export async function schedulePostEventFollowUp(
  eventId: string,
  tenantId: string
): Promise<{ scheduled: number; error?: string }> {
  const supabase = createAdminClient()

  // Get event + client info
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, client_id, title, event_date')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    console.error('[follow-up] Event not found:', eventError)
    return { scheduled: 0, error: 'Event not found' }
  }

  // Check if sends already exist for this event (prevent duplicates)
  const { count } = await supabase
    .from('follow_up_sends')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  if (count && count > 0) {
    console.log('[follow-up] Sends already exist for event, skipping:', eventId)
    return { scheduled: 0, error: 'Follow-up already scheduled' }
  }

  // Look up chef's custom rules for event_completed
  const { data: rules } = await supabase
    .from('followup_rules')
    .select('id, delay_days, template_id')
    .eq('chef_id', tenantId)
    .eq('trigger_type', 'event_completed')
    .eq('is_active', true)
    .order('delay_days', { ascending: true })

  const now = new Date()
  const sends: Array<{
    tenant_id: string
    event_id: string
    client_id: string
    rule_id: string | null
    step_number: number
    subject: string
    status: string
    scheduled_for: string
  }> = []

  if (rules && rules.length > 0) {
    // Use chef's custom rules
    rules.forEach((rule, index) => {
      const scheduledFor = new Date(now)
      scheduledFor.setDate(scheduledFor.getDate() + rule.delay_days)
      sends.push({
        tenant_id: tenantId,
        event_id: eventId,
        client_id: event.client_id,
        rule_id: rule.id,
        step_number: index + 1,
        subject: DEFAULT_STEPS[index]?.subject || `Follow-up from your chef`,
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
      })
    })
  } else {
    // Use default steps
    for (const step of DEFAULT_STEPS) {
      const scheduledFor = new Date(now)
      scheduledFor.setDate(scheduledFor.getDate() + step.delayDays)
      sends.push({
        tenant_id: tenantId,
        event_id: eventId,
        client_id: event.client_id,
        rule_id: null,
        step_number: step.stepNumber,
        subject: step.subject,
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
      })
    }
  }

  const { error: insertError } = await supabase.from('follow_up_sends').insert(sends)

  if (insertError) {
    console.error('[follow-up] Failed to insert sends:', insertError)
    return { scheduled: 0, error: insertError.message }
  }

  console.log(`[follow-up] Scheduled ${sends.length} follow-up sends for event ${eventId}`)
  return { scheduled: sends.length }
}

/**
 * Cancel all pending follow-up sends for a client.
 * Called when a client rebooks (prevents "we miss you" emails to active clients).
 */
export async function cancelFollowUpSends(
  clientId: string,
  tenantId: string
): Promise<{ cancelled: number }> {
  const supabase = createAdminClient()

  const { data: pending } = await supabase
    .from('follow_up_sends')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')

  if (!pending || pending.length === 0) {
    return { cancelled: 0 }
  }

  const ids = pending.map((s) => s.id)

  const { error } = await supabase
    .from('follow_up_sends')
    .update({
      status: 'skipped',
      cancelled_at: new Date().toISOString(),
      cancel_reason: 'Client rebooked',
    })
    .in('id', ids)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[follow-up] Failed to cancel sends:', error)
    return { cancelled: 0 }
  }

  console.log(`[follow-up] Cancelled ${ids.length} pending sends for client ${clientId}`)
  return { cancelled: ids.length }
}

/**
 * Get the next batch of pending sends that are ready to go.
 */
export async function getNextPendingSends(limit = 50): Promise<FollowUpSend[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('follow_up_sends')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[follow-up] Failed to fetch pending sends:', error)
    return []
  }

  return (data as FollowUpSend[]) || []
}

/**
 * Get the current season based on month.
 */
function getCurrentSeason(): string {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}

/**
 * Process a single pending follow-up send: fetch context, render email, send it, update status.
 */
export async function processPendingSend(sendId: string): Promise<boolean> {
  const supabase = createAdminClient()

  // Fetch the send record with event and client info
  const { data: send, error: sendError } = await supabase
    .from('follow_up_sends')
    .select('*')
    .eq('id', sendId)
    .single()

  if (sendError || !send) {
    console.error('[follow-up] Send not found:', sendError)
    return false
  }

  const typedSend = send as FollowUpSend

  // Double-check still pending (prevent double-send)
  if (typedSend.status !== 'pending') {
    console.log('[follow-up] Send already processed, skipping:', sendId)
    return false
  }

  // Get client and chef info
  const [clientResult, chefResult, eventResult] = await Promise.all([
    supabase.from('clients').select('full_name, email').eq('id', typedSend.client_id).single(),
    supabase
      .from('chefs')
      .select('full_name, business_name')
      .eq('id', typedSend.tenant_id)
      .single(),
    supabase.from('events').select('title, event_date').eq('id', typedSend.event_id).single(),
  ])

  if (!clientResult.data || !chefResult.data || !eventResult.data) {
    console.error('[follow-up] Missing context data for send:', sendId)
    // Mark as skipped so we don't retry forever
    await supabase
      .from('follow_up_sends')
      .update({ status: 'skipped', cancel_reason: 'Missing client/chef/event data' })
      .eq('id', sendId)
    return false
  }

  const clientName = clientResult.data.full_name
  const clientEmail = clientResult.data.email
  const chefName = chefResult.data.business_name || chefResult.data.full_name
  const eventTitle = eventResult.data.title || 'your event'
  const eventDate = eventResult.data.event_date
    ? new Date(eventResult.data.event_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  if (!clientEmail) {
    console.error('[follow-up] Client has no email, skipping:', sendId)
    await supabase
      .from('follow_up_sends')
      .update({ status: 'skipped', cancel_reason: 'No client email' })
      .eq('id', sendId)
    return false
  }

  // Render the appropriate email template based on step number
  let emailContent: { subject: string; react: React.ReactElement }

  switch (typedSend.step_number) {
    case 1:
      emailContent = getThankYouEmail(chefName, clientName, eventTitle, eventDate)
      break
    case 2:
      emailContent = getRebookingNudgeEmail(chefName, clientName, eventDate)
      break
    case 3:
      emailContent = getSeasonalTeaserEmail(chefName, clientName, getCurrentSeason())
      break
    default:
      emailContent = getThankYouEmail(chefName, clientName, eventTitle, eventDate)
  }

  // Send email (non-blocking pattern: sendEmail already handles errors internally)
  try {
    const emailResult = await sendEmail({
      to: clientEmail,
      subject: emailContent.subject,
      react: emailContent.react,
    })

    if (emailResult.success) {
      await supabase
        .from('follow_up_sends')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', sendId)
      console.log(`[follow-up] Sent step ${typedSend.step_number} to ${clientName}`)
      return true
    } else {
      await supabase
        .from('follow_up_sends')
        .update({
          status: 'bounced',
          cancel_reason: emailResult.error || 'Email send failed',
        })
        .eq('id', sendId)
      return false
    }
  } catch (err) {
    console.error('[follow-up] Email send error (non-blocking):', err)
    await supabase
      .from('follow_up_sends')
      .update({ status: 'bounced', cancel_reason: 'Email send exception' })
      .eq('id', sendId)
    return false
  }
}
