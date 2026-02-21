'use server'

// Client Cannabis Actions
// Used by client portal pages in app/(client)/cannabis/

import { createServerClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'

// ─── Access Check ─────────────────────────────────────────────────────────────

export async function clientHasCannabisAccess(authUserId: string): Promise<boolean> {
  try {
    // Admins always have cannabis tier access
    const adminCheck = await isAdmin().catch(() => false)
    if (adminCheck) return true

    const supabase = createServerClient()
    const { data, error } = await (supabase as any)
      .from('cannabis_tier_users')
      .select('status')
      .eq('auth_user_id', authUserId)
      .single()

    if (error || !data) return false
    return data.status === 'active'
  } catch {
    return false
  }
}

// ─── Client Cannabis Events ───────────────────────────────────────────────────

/**
 * Get all events for this client that were cannabis events.
 */
export async function getClientCannabisEvents() {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      event_date,
      serve_time,
      occasion,
      guest_count,
      location_address,
      location_city,
      location_state,
      status,
      quoted_price_cents
    `
    )
    .eq('client_id', user.entityId)
    .eq('cannabis_preference', true)
    .order('event_date', { ascending: false })

  if (error) throw new Error('Failed to fetch client cannabis events: ' + error.message)

  const eventIds = (data ?? []).map((e: any) => e.id)
  let details: any[] = []

  if (eventIds.length > 0) {
    const { data: detailData } = await (supabase as any)
      .from('cannabis_event_details')
      .select('event_id, cannabis_category, guest_consent_confirmed')
      .in('event_id', eventIds)

    details = detailData ?? []
  }

  const detailsByEventId = Object.fromEntries(details.map((d: any) => [d.event_id, d]))

  return (data ?? []).map((event: any) => ({
    ...event,
    cannabis_details: detailsByEventId[event.id] ?? null,
  }))
}
