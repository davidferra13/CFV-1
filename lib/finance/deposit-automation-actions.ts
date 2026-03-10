'use server'

// Deposit Automation Actions
// Automatically sends deposit requests to clients after quote acceptance.
// Checks for events where a deposit is required but no deposit ledger entry exists.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createElement } from 'react'

// ============================================
// 1. GET EVENTS AWAITING DEPOSIT
// ============================================

export type EventAwaitingDeposit = {
  eventId: string
  occasion: string | null
  eventDate: string | null
  clientId: string
  clientName: string | null
  clientEmail: string | null
  quoteId: string
  totalQuotedCents: number
  depositAmountCents: number
  depositPercentage: number | null
  guestCount: number | null
}

/**
 * Find events where the linked quote was accepted, deposit is required,
 * but no deposit ledger entry has been recorded yet.
 */
export async function getEventsAwaitingDeposit(): Promise<EventAwaitingDeposit[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get accepted quotes that require a deposit
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select(
      `
      id,
      client_id,
      event_id,
      total_quoted_cents,
      deposit_amount_cents,
      deposit_percentage,
      deposit_required,
      guest_count_estimated,
      client:clients(id, full_name, email),
      event:events!quotes_event_id_fkey(id, occasion, event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'accepted')
    .eq('deposit_required', true)
    .gt('deposit_amount_cents', 0)

  if (quotesError || !quotes) {
    console.error('[getEventsAwaitingDeposit] Quote query failed:', quotesError)
    return []
  }

  // For each quote with an event, check if a deposit ledger entry already exists
  const results: EventAwaitingDeposit[] = []

  for (const quote of quotes as any[]) {
    const eventId = quote.event_id
    if (!eventId) continue

    // Check if any deposit entry exists for this event
    const { data: existingDeposit } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('event_id', eventId)
      .eq('entry_type', 'deposit')
      .limit(1)

    if (existingDeposit && existingDeposit.length > 0) continue

    results.push({
      eventId,
      occasion: quote.event?.occasion ?? null,
      eventDate: quote.event?.event_date ?? null,
      clientId: quote.client_id,
      clientName: quote.client?.full_name ?? null,
      clientEmail: quote.client?.email ?? null,
      quoteId: quote.id,
      totalQuotedCents: quote.total_quoted_cents,
      depositAmountCents: quote.deposit_amount_cents,
      depositPercentage: quote.deposit_percentage ?? null,
      guestCount: quote.guest_count_estimated ?? null,
    })
  }

  return results
}

// ============================================
// 2. SEND DEPOSIT REQUEST
// ============================================

/**
 * Send a deposit request email + in-app notification to the client for a specific event.
 * Non-blocking: errors are logged but not thrown to the caller.
 */
export async function sendDepositRequest(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event + quote + client data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id,
      occasion,
      event_date,
      client_id,
      quote_id,
      status
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (!event.quote_id) {
    return { success: false, error: 'Event has no linked quote' }
  }

  // Get quote details
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      'id, deposit_required, deposit_amount_cents, deposit_percentage, total_quoted_cents, guest_count_estimated, status'
    )
    .eq('id', event.quote_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote || quote.status !== 'accepted') {
    return { success: false, error: 'Quote not found or not accepted' }
  }

  if (!quote.deposit_required || !quote.deposit_amount_cents || quote.deposit_amount_cents <= 0) {
    return { success: false, error: 'No deposit required on this quote' }
  }

  // Check if deposit already paid
  const { data: existingDeposit } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .eq('entry_type', 'deposit')
    .limit(1)

  if (existingDeposit && existingDeposit.length > 0) {
    return { success: false, error: 'Deposit already recorded for this event' }
  }

  // Get client info
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('id', event.client_id)
    .single()

  if (!client || !client.email) {
    return { success: false, error: 'Client not found or has no email' }
  }

  // Get chef info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const chefName = chef?.business_name || 'Your Chef'
  const depositFormatted = `$${(quote.deposit_amount_cents / 100).toFixed(2)}`
  const totalFormatted = `$${(quote.total_quoted_cents / 100).toFixed(2)}`
  const occasion = event.occasion || 'your event'
  const eventDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'TBD'
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/my-events/${eventId}/pay`

  // Send email (non-blocking)
  try {
    const { sendEmail } = await import('@/lib/email/send')
    const { DepositRequestEmail } = await import('@/lib/email/templates/deposit-request')

    await sendEmail({
      to: client.email,
      subject: `Deposit request from ${chefName}: ${depositFormatted}`,
      react: createElement(DepositRequestEmail, {
        clientName: client.full_name || 'there',
        chefName,
        occasion,
        eventDate,
        guestCount: quote.guest_count_estimated ?? null,
        depositAmountFormatted: depositFormatted,
        totalFormatted,
        paymentUrl,
      }),
    })
  } catch (emailErr) {
    console.error('[sendDepositRequest] Email failed (non-blocking):', emailErr)
  }

  // In-app notification to client (non-blocking)
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    await createClientNotification({
      tenantId: user.tenantId!,
      clientId: client.id,
      category: 'payment',
      action: 'deposit_request_sent',
      title: `Deposit due: ${depositFormatted}`,
      body: `A deposit of ${depositFormatted} is required for ${occasion} on ${eventDate}. Pay now to secure your date.`,
      actionUrl: `/my-events/${eventId}/pay`,
      eventId,
    })
  } catch (notifErr) {
    console.error('[sendDepositRequest] Client notification failed (non-blocking):', notifErr)
  }

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'deposit_request_sent',
      domain: 'financial',
      entityType: 'event',
      entityId: eventId,
      summary: `Sent deposit request of ${depositFormatted} to ${client.full_name || 'client'} for ${occasion}`,
      context: {
        deposit_cents: quote.deposit_amount_cents,
        total_cents: quote.total_quoted_cents,
        client_email: client.email,
      },
      clientId: client.id,
    })
  } catch (actErr) {
    console.error('[sendDepositRequest] Activity log failed (non-blocking):', actErr)
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')

  return { success: true }
}

// ============================================
// 3. CHECK AND SEND DEPOSIT REQUESTS (AUTOMATION)
// ============================================

/**
 * Automation entry point: checks all events needing deposits and sends requests.
 * Respects the chef's automation settings (default_deposit_enabled).
 * Can be called by cron or manually by the chef.
 *
 * @param tenantId - Optional tenant ID for admin/cron calls. Omit to use current session.
 */
export async function checkAndSendDepositRequests(
  tenantId?: string
): Promise<{ sent: number; skipped: number }> {
  let resolvedTenantId: string
  let actorId: string

  if (tenantId) {
    resolvedTenantId = tenantId
    // Look up chef user_id for activity logging
    const supabase = createServerClient({ admin: true })
    const { data: chef } = await supabase
      .from('chefs')
      .select('user_id')
      .eq('id', resolvedTenantId)
      .single()
    actorId = (chef as any)?.user_id ?? 'system'
  } else {
    const user = await requireChef()
    resolvedTenantId = user.tenantId!
    actorId = user.id
  }

  // Check automation settings
  const { getAutomationSettingsForTenant } = await import('@/lib/automations/settings-actions')
  const settings = await getAutomationSettingsForTenant(resolvedTenantId)

  if (!settings.default_deposit_enabled) {
    return { sent: 0, skipped: 0 }
  }

  const supabase: any = createServerClient({ admin: true })

  // Find accepted quotes with deposit required but no deposit ledger entry
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select(
      `
      id,
      client_id,
      event_id,
      total_quoted_cents,
      deposit_amount_cents,
      deposit_percentage,
      deposit_required,
      guest_count_estimated,
      client:clients(id, full_name, email),
      event:events!quotes_event_id_fkey(id, occasion, event_date)
    `
    )
    .eq('tenant_id', resolvedTenantId)
    .eq('status', 'accepted')
    .eq('deposit_required', true)
    .gt('deposit_amount_cents', 0)

  if (quotesError || !quotes) {
    console.error('[checkAndSendDepositRequests] Query failed:', quotesError)
    return { sent: 0, skipped: 0 }
  }

  let sent = 0
  let skipped = 0

  // Get chef info once
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', resolvedTenantId)
    .single()
  const chefName = chef?.business_name || 'Your Chef'

  for (const quote of quotes as any[]) {
    const eventId = quote.event_id
    if (!eventId) {
      skipped++
      continue
    }

    // Check if deposit already recorded
    const { data: existingDeposit } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('tenant_id', resolvedTenantId)
      .eq('event_id', eventId)
      .eq('entry_type', 'deposit')
      .limit(1)

    if (existingDeposit && existingDeposit.length > 0) {
      skipped++
      continue
    }

    const clientEmail = quote.client?.email
    if (!clientEmail) {
      skipped++
      continue
    }

    const depositFormatted = `$${(quote.deposit_amount_cents / 100).toFixed(2)}`
    const totalFormatted = `$${(quote.total_quoted_cents / 100).toFixed(2)}`
    const occasion = quote.event?.occasion || 'your event'
    const eventDate = quote.event?.event_date
      ? new Date(quote.event.event_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD'
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/my-events/${eventId}/pay`

    // Send email (non-blocking per event)
    try {
      const { sendEmail } = await import('@/lib/email/send')
      const { DepositRequestEmail } = await import('@/lib/email/templates/deposit-request')

      await sendEmail({
        to: clientEmail,
        subject: `Deposit request from ${chefName}: ${depositFormatted}`,
        react: createElement(DepositRequestEmail, {
          clientName: quote.client?.full_name || 'there',
          chefName,
          occasion,
          eventDate,
          guestCount: quote.guest_count_estimated ?? null,
          depositAmountFormatted: depositFormatted,
          totalFormatted,
          paymentUrl,
        }),
      })
    } catch (emailErr) {
      console.error(`[checkAndSendDepositRequests] Email failed for event ${eventId}:`, emailErr)
    }

    // In-app notification (non-blocking)
    try {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: resolvedTenantId,
        clientId: quote.client_id,
        category: 'payment',
        action: 'deposit_request_sent',
        title: `Deposit due: ${depositFormatted}`,
        body: `A deposit of ${depositFormatted} is required for ${occasion}. Pay now to secure your date.`,
        actionUrl: `/my-events/${eventId}/pay`,
        eventId,
      })
    } catch (notifErr) {
      console.error(
        `[checkAndSendDepositRequests] Notification failed for event ${eventId}:`,
        notifErr
      )
    }

    sent++
  }

  return { sent, skipped }
}

// ============================================
// 4. TRIGGER DEPOSIT REQUEST ON QUOTE ACCEPTANCE
// ============================================

/**
 * Called after a quote is accepted to automatically send a deposit request
 * if the quote requires a deposit. This is a non-blocking side effect.
 *
 * @param tenantId - Chef's tenant ID
 * @param quoteId - The accepted quote ID
 */
export async function triggerDepositRequestOnAcceptance(
  tenantId: string,
  quoteId: string
): Promise<void> {
  const supabase: any = createServerClient({ admin: true })

  // Fetch the quote
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      'id, event_id, deposit_required, deposit_amount_cents, deposit_percentage, total_quoted_cents, guest_count_estimated, client_id'
    )
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .single()

  if (!quote) {
    console.error('[triggerDepositRequestOnAcceptance] Quote not found:', quoteId)
    return
  }

  if (!quote.deposit_required || !quote.deposit_amount_cents || quote.deposit_amount_cents <= 0) {
    // No deposit required, nothing to do
    return
  }

  if (!quote.event_id) {
    // No event linked yet, can't send deposit request
    console.warn('[triggerDepositRequestOnAcceptance] No event linked to quote:', quoteId)
    return
  }

  // Get event details
  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .eq('id', quote.event_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return

  // Get client info
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('id', quote.client_id)
    .single()

  if (!client || !client.email) return

  // Get chef info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.business_name || 'Your Chef'
  const depositFormatted = `$${(quote.deposit_amount_cents / 100).toFixed(2)}`
  const totalFormatted = `$${(quote.total_quoted_cents / 100).toFixed(2)}`
  const occasion = event.occasion || 'your event'
  const eventDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'TBD'
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/my-events/${quote.event_id}/pay`

  // Send email (non-blocking)
  try {
    const { sendEmail } = await import('@/lib/email/send')
    const { DepositRequestEmail } = await import('@/lib/email/templates/deposit-request')

    await sendEmail({
      to: client.email,
      subject: `Deposit request from ${chefName}: ${depositFormatted}`,
      react: createElement(DepositRequestEmail, {
        clientName: client.full_name || 'there',
        chefName,
        occasion,
        eventDate,
        guestCount: quote.guest_count_estimated ?? null,
        depositAmountFormatted: depositFormatted,
        totalFormatted,
        paymentUrl,
      }),
    })
  } catch (emailErr) {
    console.error('[triggerDepositRequestOnAcceptance] Email failed:', emailErr)
  }

  // In-app notification to client (non-blocking)
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    await createClientNotification({
      tenantId,
      clientId: client.id,
      category: 'payment',
      action: 'deposit_request_sent',
      title: `Deposit due: ${depositFormatted}`,
      body: `A deposit of ${depositFormatted} is required for ${occasion} on ${eventDate}. Pay now to secure your date.`,
      actionUrl: `/my-events/${quote.event_id}/pay`,
      eventId: quote.event_id,
    })
  } catch (notifErr) {
    console.error('[triggerDepositRequestOnAcceptance] Notification failed:', notifErr)
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: 'system',
      action: 'deposit_request_sent',
      domain: 'financial',
      entityType: 'event',
      entityId: quote.event_id,
      summary: `Auto-sent deposit request of ${depositFormatted} to ${client.full_name || 'client'} for ${occasion}`,
      context: {
        deposit_cents: quote.deposit_amount_cents,
        total_cents: quote.total_quoted_cents,
        quote_id: quoteId,
        automated: true,
      },
      clientId: client.id,
    })
  } catch (actErr) {
    console.error('[triggerDepositRequestOnAcceptance] Activity log failed:', actErr)
  }
}
