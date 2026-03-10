'use server'

// Post-Event Referral Request Sequence
// Automatically identifies clients eligible for a referral ask after successful events.
// Deterministic eligibility checks (Formula > AI): no Ollama needed.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────

export type ReferralEligibleClient = {
  clientId: string
  clientName: string
  email: string | null
  eventId: string
  eventOccasion: string
  eventDate: string
  completedAt: string
  daysSinceCompletion: number
  hasBeenAsked: boolean
  lastAskedDate: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────

// Minimum days after event completion before sending referral ask
const MIN_DAYS_AFTER_COMPLETION = 3

// Don't ask for referrals more than once every 60 days per client
const REFERRAL_ASK_COOLDOWN_DAYS = 60

// Only ask clients with at least this many completed events (good relationship signal)
const MIN_COMPLETED_EVENTS = 1

// ─── Eligibility Check ──────────────────────────────────────────────────

/**
 * Check if a client is eligible for a referral ask based on:
 * 1. Event was completed successfully (not cancelled)
 * 2. Client has not been asked recently (cooldown period)
 * 3. Client has enough completed events (relationship signal)
 */
async function isClientEligibleForReferralAsk(
  supabase: any,
  tenantId: string,
  clientId: string
): Promise<{ eligible: boolean; lastAskedDate: string | null }> {
  // Check if already asked recently
  const { data: recentAsk } = await supabase
    .from('referral_request_log')
    .select('sent_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastAskedDate = recentAsk?.sent_at ?? null

  if (lastAskedDate) {
    const daysSinceAsked = Math.floor((Date.now() - new Date(lastAskedDate).getTime()) / 86400000)
    if (daysSinceAsked < REFERRAL_ASK_COOLDOWN_DAYS) {
      return { eligible: false, lastAskedDate }
    }
  }

  // Check completed event count (relationship quality signal)
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'completed')

  if ((count ?? 0) < MIN_COMPLETED_EVENTS) {
    return { eligible: false, lastAskedDate }
  }

  return { eligible: true, lastAskedDate }
}

// ─── Actions ─────────────────────────────────────────────────────────────

/**
 * After an event is completed, check if the client should receive a referral request.
 * Called as a non-blocking side effect from event transitions.
 */
export async function triggerPostEventReferralRequest(
  eventId: string,
  tenantId: string
): Promise<{ triggered: boolean; reason?: string }> {
  const supabase: any = createServerClient({ admin: true })

  // Fetch the event
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, status, occasion, event_date')
    .eq('id', eventId)
    .eq('status', 'completed')
    .maybeSingle()

  if (!event) {
    return { triggered: false, reason: 'Event not found or not completed' }
  }

  if (!event.client_id) {
    return { triggered: false, reason: 'No client associated with event' }
  }

  // Check eligibility
  const { eligible, lastAskedDate } = await isClientEligibleForReferralAsk(
    supabase,
    event.tenant_id,
    event.client_id
  )

  if (!eligible) {
    return {
      triggered: false,
      reason: lastAskedDate
        ? `Client was asked on ${lastAskedDate}, cooldown not expired`
        : 'Client does not meet minimum event threshold',
    }
  }

  // Log the referral request trigger (actual sending happens via email/notification)
  const { error } = await supabase.from('referral_request_log').insert({
    tenant_id: event.tenant_id,
    client_id: event.client_id,
    event_id: eventId,
    sent_at: new Date().toISOString(),
    status: 'pending',
  })

  if (error) {
    console.error('[triggerPostEventReferralRequest] Log insert failed:', error)
    return { triggered: false, reason: 'Failed to log referral request' }
  }

  return { triggered: true }
}

/**
 * Generate a referral request message for a specific client/event.
 * Deterministic template (Formula > AI).
 */
export async function getReferralRequestTemplate(
  clientId: string,
  eventId: string
): Promise<{ subject: string; body: string } | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [clientResult, eventResult, chefResult] = await Promise.all([
    supabase
      .from('clients')
      .select('full_name')
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase
      .from('events')
      .select('occasion, event_date')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase.from('chefs').select('business_name, display_name').eq('id', user.tenantId!).single(),
  ])

  const client = clientResult.data
  const event = eventResult.data
  const chef = chefResult.data

  if (!client || !event) return null

  const firstName = (client.full_name ?? '').split(' ')[0] || 'there'
  const chefName = chef?.display_name || chef?.business_name || 'Your Chef'
  const occasion = event.occasion || 'your recent event'

  return {
    subject: `Know someone who would love a private chef experience?`,
    body:
      `Hi ${firstName},\n\n` +
      `Thank you for a wonderful ${occasion}! It was a pleasure cooking for you and your guests.\n\n` +
      `If you know someone who would enjoy a private dining experience, ` +
      `we would be honored to cook for them too. The best compliment a chef can receive ` +
      `is a recommendation to someone you care about.\n\n` +
      `Simply share the link below, and your friend can book their own experience.\n\n` +
      `With gratitude,\n${chefName}`,
  }
}

/**
 * Mark a referral request as sent for a client/event pair.
 */
export async function markReferralRequestSent(
  clientId: string,
  eventId: string
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Update existing pending record or insert new one
  const { data: existing } = await supabase
    .from('referral_request_log')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('referral_request_log')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('referral_request_log').insert({
      tenant_id: user.tenantId!,
      client_id: clientId,
      event_id: eventId,
      sent_at: new Date().toISOString(),
      status: 'sent',
    })
  }

  return { success: true }
}

/**
 * Get clients who completed events recently but have not been asked for referrals.
 * Useful for the outreach dashboard.
 */
export async function getClientsEligibleForReferralAsk(): Promise<ReferralEligibleClient[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get recently completed events (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()

  const { data: completedEvents } = await supabase
    .from('events')
    .select('id, client_id, occasion, event_date, updated_at')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('updated_at', ninetyDaysAgo)
    .order('updated_at', { ascending: false })

  if (!completedEvents || completedEvents.length === 0) return []

  // Get unique client IDs
  const clientIds = [...new Set(completedEvents.map((e: any) => e.client_id).filter(Boolean))]
  if (clientIds.length === 0) return []

  // Fetch client details
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .in('id', clientIds)
    .eq('tenant_id', user.tenantId!)

  const clientMap = new Map((clients ?? []).map((c: any) => [c.id, c]))

  // Fetch referral request history
  const { data: requestLogs } = await supabase
    .from('referral_request_log')
    .select('client_id, sent_at')
    .in('client_id', clientIds)
    .eq('tenant_id', user.tenantId!)
    .order('sent_at', { ascending: false })

  const lastAskedMap = new Map<string, string>()
  for (const log of requestLogs ?? []) {
    if (!lastAskedMap.has(log.client_id)) {
      lastAskedMap.set(log.client_id, log.sent_at)
    }
  }

  const eligible: ReferralEligibleClient[] = []

  // Process one event per client (most recent)
  const processedClients = new Set<string>()

  for (const event of completedEvents) {
    if (!event.client_id || processedClients.has(event.client_id)) continue
    processedClients.add(event.client_id)

    const client = clientMap.get(event.client_id)
    if (!client) continue

    const daysSinceCompletion = Math.floor(
      (Date.now() - new Date(event.updated_at).getTime()) / 86400000
    )

    // Skip if too soon after completion
    if (daysSinceCompletion < MIN_DAYS_AFTER_COMPLETION) continue

    const lastAskedDate = lastAskedMap.get(event.client_id) ?? null
    let hasBeenAsked = false

    if (lastAskedDate) {
      const daysSinceAsked = Math.floor((Date.now() - new Date(lastAskedDate).getTime()) / 86400000)
      hasBeenAsked = daysSinceAsked < REFERRAL_ASK_COOLDOWN_DAYS
    }

    eligible.push({
      clientId: event.client_id,
      clientName: client.full_name ?? 'Unknown',
      email: client.email ?? null,
      eventId: event.id,
      eventOccasion: event.occasion ?? 'Event',
      eventDate: event.event_date,
      completedAt: event.updated_at,
      daysSinceCompletion,
      hasBeenAsked,
      lastAskedDate,
    })
  }

  // Sort: not-asked-yet first, then by days since completion (most recent first)
  eligible.sort((a, b) => {
    if (a.hasBeenAsked !== b.hasBeenAsked) {
      return a.hasBeenAsked ? 1 : -1
    }
    return a.daysSinceCompletion - b.daysSinceCompletion
  })

  return eligible
}
