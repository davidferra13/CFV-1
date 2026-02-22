'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function acknowledgeScopeDrift(eventId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const { error } = await supabase
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
  const supabase = createServerClient()

  // First, find the converting_quote_id on the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('converting_quote_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    return null
  }

  if (!event.converting_quote_id) {
    // Fallback: find a quote linked to this event by event_id
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, guest_count, total_cents, service_hours, event_type')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return quote ?? null
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, guest_count, total_cents, service_hours, event_type')
    .eq('id', event.converting_quote_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return quote ?? null
}
