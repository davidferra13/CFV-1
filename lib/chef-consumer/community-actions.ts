'use server'

// Chef as Consumer - Community Event Actions
// Attend peer dinners, pop-ups, and dinner circles as a guest.
// Reuses: lib/tickets, lib/dinner-circles, lib/popups.
// Zero new tables. Reads existing ticketed events and popups from other chefs.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { PeerEventCard, MyTicket } from './consumer-types'

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Browse upcoming ticketed events and popups from other chefs.
 * Excludes the current chef's own events.
 * Returns events that are published, in the future, and have tickets available.
 */
export async function browsePeerEvents(): Promise<{
  events: PeerEventCard[]
  error: string | null
}> {
  try {
    const user = await requireChef()
    const db = createServerClient()
    const now = new Date().toISOString()
    const events: PeerEventCard[] = []

    // 1. Ticketed events from other chefs (events with share settings and ticket types)
    const { data: ticketedEvents, error: ticketErr } = await db
      .from('events')
      .select(`
        id,
        title,
        event_date,
        tenant_id,
        event_share_settings!inner(
          share_token,
          is_published
        )
      `)
      .neq('tenant_id', user.entityId)
      .gte('event_date', now.split('T')[0])
      .eq('event_share_settings.is_published', true)
      .order('event_date', { ascending: true })
      .limit(30)

    if (!ticketErr && ticketedEvents) {
      // Fetch chef info and ticket summaries for these events
      const eventIds = ticketedEvents.map((e: any) => e.id)
      const tenantIds = [...new Set(ticketedEvents.map((e: any) => e.tenant_id))]

      const [chefsResult, ticketTypesResult] = await Promise.all([
        db.from('chefs').select('id, display_name, slug, profile_image_url').in('id', tenantIds),
        eventIds.length > 0
          ? db
              .from('event_ticket_types')
              .select('event_id, price_cents, capacity, sold_count, is_active')
              .in('event_id', eventIds)
              .eq('is_active', true)
          : { data: [], error: null },
      ])

      const chefMap = new Map(
        (chefsResult.data ?? []).map((c: any) => [c.id, c])
      )

      // Aggregate ticket info per event
      const ticketInfoMap = new Map<
        string,
        { minPrice: number | null; totalCapacity: number | null; totalSold: number }
      >()
      for (const tt of ticketTypesResult.data ?? []) {
        const existing = ticketInfoMap.get(tt.event_id) || {
          minPrice: null,
          totalCapacity: null,
          totalSold: 0,
        }
        if (tt.price_cents != null) {
          existing.minPrice =
            existing.minPrice == null
              ? tt.price_cents
              : Math.min(existing.minPrice, tt.price_cents)
        }
        if (tt.capacity != null) {
          existing.totalCapacity = (existing.totalCapacity ?? 0) + tt.capacity
        }
        existing.totalSold += tt.sold_count ?? 0
        ticketInfoMap.set(tt.event_id, existing)
      }

      for (const event of ticketedEvents) {
        const e = event as any
        const chef = chefMap.get(e.tenant_id) as any
        const ticketInfo = ticketInfoMap.get(e.id)
        const shareSettings = Array.isArray(e.event_share_settings)
          ? e.event_share_settings[0]
          : e.event_share_settings

        events.push({
          eventId: e.id,
          title: e.title || 'Dinner Event',
          chefName: chef?.display_name || 'Chef',
          chefSlug: chef?.slug ?? null,
          chefProfileImageUrl: chef?.profile_image_url ?? null,
          eventDate: e.event_date ?? null,
          venueName: null,
          venueCity: null,
          venueState: null,
          ticketPriceCents: ticketInfo?.minPrice ?? null,
          capacity: ticketInfo?.totalCapacity ?? null,
          ticketsSold: ticketInfo?.totalSold ?? 0,
          spotsRemaining:
            ticketInfo?.totalCapacity != null
              ? Math.max(0, ticketInfo.totalCapacity - (ticketInfo?.totalSold ?? 0))
              : null,
          shareToken: shareSettings?.share_token ?? null,
          eventType: 'ticketed',
        })
      }
    }

    // 2. Pop-ups from other chefs
    const { data: popups, error: popupErr } = await db
      .from('chef_popups')
      .select(`
        id,
        name,
        event_date,
        venue_name,
        venue_address,
        capacity,
        ticket_price_cents,
        tenant_id,
        status
      `)
      .neq('tenant_id', user.entityId)
      .eq('status', 'published')
      .gte('event_date', now.split('T')[0])
      .order('event_date', { ascending: true })
      .limit(20)

    if (!popupErr && popups) {
      const popupTenantIds = [...new Set(popups.map((p: any) => p.tenant_id))]
      const { data: popupChefs } = await db
        .from('chefs')
        .select('id, display_name, slug, profile_image_url')
        .in('id', popupTenantIds)

      const popupChefMap = new Map(
        (popupChefs ?? []).map((c: any) => [c.id, c])
      )

      for (const popup of popups) {
        const p = popup as any
        const chef = popupChefMap.get(p.tenant_id) as any

        events.push({
          eventId: p.id,
          title: p.name || 'Pop-Up Event',
          chefName: chef?.display_name || 'Chef',
          chefSlug: chef?.slug ?? null,
          chefProfileImageUrl: chef?.profile_image_url ?? null,
          eventDate: p.event_date ?? null,
          venueName: p.venue_name ?? null,
          venueCity: null,
          venueState: null,
          ticketPriceCents: p.ticket_price_cents ?? null,
          capacity: p.capacity ?? null,
          ticketsSold: 0,
          spotsRemaining: p.capacity ?? null,
          shareToken: null,
          eventType: 'popup',
        })
      }
    }

    // Sort combined results by date
    events.sort((a, b) => {
      if (!a.eventDate && !b.eventDate) return 0
      if (!a.eventDate) return 1
      if (!b.eventDate) return -1
      return a.eventDate.localeCompare(b.eventDate)
    })

    return { events, error: null }
  } catch (err) {
    console.error('[browsePeerEvents]', err)
    return { events: [], error: 'Failed to load events' }
  }
}

/**
 * Purchase a ticket to another chef's event.
 * Delegates to the existing public purchase flow (lib/tickets/purchase-actions.ts).
 * The chef provides their info as the buyer.
 */
export async function purchaseTicket(input: {
  shareToken: string
  ticketTypeId: string
  quantity: number
  dietaryRestrictions?: string[]
  allergies?: string[]
  notes?: string
}): Promise<{ checkoutUrl?: string; error?: string }> {
  try {
    const user = await requireChef()
    const db = createServerClient()

    // Get chef's display info for the buyer fields
    const { data: chefProfile } = await db
      .from('chefs')
      .select('display_name, email, phone')
      .eq('id', user.entityId)
      .single()

    if (!chefProfile) {
      return { error: 'Could not load your profile' }
    }

    // Delegate to the existing public purchase action
    // Import dynamically to avoid circular deps
    const { purchaseTicket: publicPurchase } = await import('@/lib/tickets/purchase-actions')
    const result = await publicPurchase({
      shareToken: input.shareToken,
      ticketTypeId: input.ticketTypeId,
      quantity: input.quantity,
      buyerName: chefProfile.display_name || 'Chef',
      buyerEmail: chefProfile.email || user.email,
      buyerPhone: chefProfile.phone || '',
      dietaryRestrictions: input.dietaryRestrictions || [],
      allergies: input.allergies || [],
      notes: input.notes || '',
    })

    if ('error' in result && result.error) {
      return { error: result.error as string }
    }

    return { checkoutUrl: (result as any).checkoutUrl }
  } catch (err) {
    console.error('[purchaseTicket]', err)
    return { error: 'Failed to start ticket purchase' }
  }
}

/**
 * Get all tickets the current chef has purchased as an attendee.
 * Matches by the chef's email across all tenants.
 */
export async function getMyTickets(): Promise<{
  tickets: MyTicket[]
  error: string | null
}> {
  try {
    const user = await requireChef()
    const db = createServerClient()

    const { data: tickets, error } = await db
      .from('event_tickets')
      .select(`
        id,
        event_id,
        quantity,
        total_cents,
        payment_status,
        created_at,
        events!inner(
          id,
          title,
          event_date,
          tenant_id
        )
      `)
      .eq('buyer_email', user.email)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[getMyTickets] Query failed:', error.message)
      return { tickets: [], error: 'Failed to load tickets' }
    }

    if (!tickets || tickets.length === 0) {
      return { tickets: [], error: null }
    }

    // Fetch chef names for the events
    const tenantIds = [
      ...new Set(
        tickets.map((t: any) => {
          const evt = Array.isArray(t.events) ? t.events[0] : t.events
          return evt?.tenant_id
        }).filter(Boolean)
      ),
    ]

    const { data: chefs } = await db
      .from('chefs')
      .select('id, display_name')
      .in('id', tenantIds)

    const chefMap = new Map(
      (chefs ?? []).map((c: any) => [c.id, c.display_name || 'Chef'])
    )

    const result: MyTicket[] = tickets.map((t: any) => {
      const evt = Array.isArray(t.events) ? t.events[0] : t.events
      return {
        ticketId: t.id,
        eventId: t.event_id,
        eventTitle: evt?.title || 'Event',
        chefName: chefMap.get(evt?.tenant_id) as string || 'Chef',
        eventDate: evt?.event_date ?? null,
        quantity: t.quantity,
        totalCents: t.total_cents,
        paymentStatus: t.payment_status,
        purchasedAt: t.created_at,
      }
    })

    return { tickets: result, error: null }
  } catch (err) {
    console.error('[getMyTickets]', err)
    return { tickets: [], error: 'Failed to load tickets' }
  }
}
