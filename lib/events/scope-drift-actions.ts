'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

const CONVERTING_QUOTE_SELECT =
  'id, guest_count_estimated, total_quoted_cents, pricing_model, deposit_amount_cents, status, valid_until, created_at'

export async function acknowledgeScopeDrift(eventId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      scope_drift_acknowledged: true,
      scope_drift_acknowledged_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error('Failed to acknowledge scope drift')
  }

  revalidatePath(`/events/${eventId}`)
}

export async function getConvertingQuote(eventId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // First, find the converting_quote_id on the event
  const { data: event, error: eventError } = await db
    .from('events')
    .select('converting_quote_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    return null
  }

  if (!event.converting_quote_id) {
    // Fallback: prefer an accepted quote linked to the event.
    const { data: acceptedQuote } = await db
      .from('quotes')
      .select(CONVERTING_QUOTE_SELECT)
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (acceptedQuote) {
      return acceptedQuote
    }

    // Otherwise return the latest linked quote.
    const { data: latestQuote } = await db
      .from('quotes')
      .select(CONVERTING_QUOTE_SELECT)
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return latestQuote ?? null
  }

  const { data: quote } = await db
    .from('quotes')
    .select(CONVERTING_QUOTE_SELECT)
    .eq('id', event.converting_quote_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return quote ?? null
}
