'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type CircleStats = {
  totalEvents: number
  completedEvents: number
  upcomingEvents: number
  totalCovers: number
  uniqueMembers: number
  returningMembers: number
  averageAttendance: number
  totalRevenueCents: number
  averageEventValueCents: number
  lastEventDate: string | null
  nextEventDate: string | null
  guestOnboardingCompletion: number | null
}

export async function getCircleStats(circleId: string): Promise<CircleStats | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!circle) return null

  const [eventsResult, membersResult] = await Promise.all([
    db
      .from('events')
      .select('id, status, event_date, guest_count, quoted_price_cents')
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .in('id', db.from('hub_groups').select('event_id').eq('id', circleId))
      .order('event_date', { ascending: false }),
    db.from('hub_group_members').select('profile_id').eq('group_id', circleId),
  ])

  // Also get events linked via event_shares.hub_group_id
  const { data: shareLinkedEvents } = await db
    .from('events')
    .select('id, status, event_date, guest_count, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .in('id', db.from('event_shares').select('event_id').eq('hub_group_id', circleId))

  // Merge event lists (dedup by id)
  const allEventsMap = new Map<string, any>()
  for (const e of eventsResult.data ?? []) allEventsMap.set(e.id, e)
  for (const e of shareLinkedEvents ?? []) allEventsMap.set(e.id, e)
  const events = Array.from(allEventsMap.values())

  const members = membersResult.data ?? []

  const completed = events.filter((e: any) => e.status === 'completed')
  const upcoming = events.filter(
    (e: any) =>
      ['accepted', 'confirmed', 'paid', 'in_progress', 'proposed'].includes(e.status) &&
      e.event_date &&
      new Date(e.event_date) >= new Date()
  )

  const totalCovers = events
    .filter((e: any) => e.status !== 'cancelled')
    .reduce((s: number, e: any) => s + (e.guest_count ?? 0), 0)

  const totalRevenueCents = completed.reduce(
    (s: number, e: any) => s + (e.quoted_price_cents ?? 0),
    0
  )

  const averageEventValueCents =
    completed.length > 0 ? Math.round(totalRevenueCents / completed.length) : 0

  const eventsWithGuests = events.filter((e: any) => e.guest_count > 0 && e.status !== 'cancelled')
  const averageAttendance =
    eventsWithGuests.length > 0
      ? Math.round(
          eventsWithGuests.reduce((s: number, e: any) => s + e.guest_count, 0) /
            eventsWithGuests.length
        )
      : 0

  // Get guest attendance across circle events for returning member calculation
  const eventIds = events.map((e: any) => e.id)
  let returningMembers = 0
  if (eventIds.length > 1) {
    const { data: guestRows } = await db
      .from('event_guests')
      .select('email, event_id')
      .in('event_id', eventIds)

    if (guestRows && guestRows.length > 0) {
      const guestEvents = new Map<string, Set<string>>()
      for (const g of guestRows) {
        const key = (g.email || '').toLowerCase().trim()
        if (!key) continue
        if (!guestEvents.has(key)) guestEvents.set(key, new Set())
        guestEvents.get(key)!.add(g.event_id)
      }
      returningMembers = Array.from(guestEvents.values()).filter((s) => s.size > 1).length
    }
  }

  const sortedDates = events
    .filter((e: any) => e.event_date)
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const lastEventDate = sortedDates[0]?.event_date ?? null

  const sortedUpcoming = upcoming.sort(
    (a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )
  const nextEventDate = sortedUpcoming[0]?.event_date ?? null

  // Guest onboarding completion: % of event_guests with dietary data filled
  let guestOnboardingCompletion: number | null = null
  if (eventIds.length > 0) {
    const { data: allGuests } = await db
      .from('event_guests')
      .select('id, dietary_restrictions, allergies')
      .in('event_id', eventIds)

    if (allGuests && allGuests.length > 0) {
      const withDietary = allGuests.filter(
        (g: any) =>
          (g.dietary_restrictions && g.dietary_restrictions.length > 0) ||
          (g.allergies && g.allergies.length > 0)
      ).length
      guestOnboardingCompletion = Math.round((withDietary / allGuests.length) * 100)
    }
  }

  return {
    totalEvents: events.length,
    completedEvents: completed.length,
    upcomingEvents: upcoming.length,
    totalCovers,
    uniqueMembers: members.length,
    returningMembers,
    averageAttendance,
    totalRevenueCents,
    averageEventValueCents,
    lastEventDate,
    nextEventDate,
    guestOnboardingCompletion,
  }
}
