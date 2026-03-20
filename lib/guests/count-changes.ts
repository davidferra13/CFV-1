'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ==========================================
// TYPES
// ==========================================

export type GuestCountChange = {
  id: string
  event_id: string
  previous_count: number
  new_count: number
  requested_by: string
  requested_by_role: string
  price_impact_cents: number | null
  surcharge_applied: boolean
  surcharge_cents: number
  acknowledged_by_client: boolean
  applied: boolean
  notes: string | null
  created_at: string
}

// ==========================================
// REQUEST GUEST COUNT CHANGE
// ==========================================

const GuestCountChangeSchema = z.object({
  eventId: z.string().uuid(),
  newCount: z.number().int().min(1).max(500),
  notes: z.string().max(500).optional(),
})

export async function requestGuestCountChange(
  input: z.infer<typeof GuestCountChangeSchema>
): Promise<{ success: boolean; changeId?: string; priceImpact?: number; error?: string }> {
  const user = await requireChef()
  const parsed = GuestCountChangeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const supabase: any = createServerClient()

  // Load event
  const { data: event } = await supabase
    .from('events')
    .select('id, guest_count, quoted_price_cents, pricing_model, tenant_id, client_id, event_date')
    .eq('id', parsed.data.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, error: 'Event not found.' }

  const previousCount = event.guest_count ?? 0
  const newCount = parsed.data.newCount

  if (previousCount === newCount) {
    return { success: false, error: 'Guest count is already set to this number.' }
  }

  // Calculate price impact for per-person pricing
  let priceImpactCents = 0
  if (event.pricing_model === 'per_person' && event.quoted_price_cents && previousCount > 0) {
    const pricePerPerson = Math.round(event.quoted_price_cents / previousCount)
    priceImpactCents = pricePerPerson * (newCount - previousCount)
  }

  // Check surcharge (if change is within 72 hours of event)
  let surchargeCents = 0
  let surchargeApplied = false
  if (event.event_date) {
    const hoursUntilEvent = (new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntilEvent <= 72 && hoursUntilEvent > 0 && newCount > previousCount) {
      // 20% surcharge on the additional cost
      surchargeCents = Math.round(Math.abs(priceImpactCents) * 0.2)
      surchargeApplied = true
    }
  }

  // Insert change record
  const { data: change, error: insertError } = await supabase
    .from('guest_count_changes')
    .insert({
      event_id: parsed.data.eventId,
      tenant_id: user.entityId,
      previous_count: previousCount,
      new_count: newCount,
      requested_by: user.id,
      requested_by_role: 'chef',
      price_impact_cents: priceImpactCents,
      surcharge_applied: surchargeApplied,
      surcharge_cents: surchargeCents,
      notes: parsed.data.notes ?? null,
      applied: true,
      applied_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[guest-count] Insert failed:', insertError.message)
    return { success: false, error: 'Failed to record change.' }
  }

  // Apply the change (chef-initiated changes apply immediately)
  await supabase
    .from('events')
    .update({
      guest_count: newCount,
      guest_count_confirmed: newCount,
    })
    .eq('id', parsed.data.eventId)

  // Update quoted price if per-person
  if (event.pricing_model === 'per_person' && priceImpactCents !== 0) {
    const newQuotedPrice = (event.quoted_price_cents ?? 0) + priceImpactCents + surchargeCents
    await supabase
      .from('events')
      .update({ quoted_price_cents: newQuotedPrice })
      .eq('id', parsed.data.eventId)
  }

  // Notify client (non-blocking)
  try {
    if (event.client_id) {
      const direction = newCount > previousCount ? 'increased' : 'decreased'
      await supabase.from('notifications').insert({
        tenant_id: user.entityId,
        recipient_id: event.client_id,
        recipient_role: 'client',
        client_id: event.client_id,
        event_id: parsed.data.eventId,
        title: `Guest count ${direction}`,
        body: `Guest count changed from ${previousCount} to ${newCount}.${priceImpactCents !== 0 ? ` Price adjusted by $${(Math.abs(priceImpactCents) / 100).toFixed(2)}.` : ''}`,
        category: 'booking',
        action: 'view_event',
        action_url: `/my-events/${parsed.data.eventId}`,
      })
    }
  } catch (err) {
    console.error('[guest-count] Notification failed (non-blocking):', err)
  }

  revalidatePath(`/events/${parsed.data.eventId}`)
  return { success: true, changeId: change.id, priceImpact: priceImpactCents }
}

// ==========================================
// GET GUEST COUNT HISTORY
// ==========================================

export async function getGuestCountHistory(eventId: string): Promise<GuestCountChange[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('guest_count_changes')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[guest-count] Failed to load history:', error.message)
    return []
  }

  return data ?? []
}
