'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type CircleDailyActivity = {
  id: string
  circleName: string
  circleId: string
  type: 'upcoming_event' | 'unread_messages' | 'new_rsvp'
  label: string
  description: string
  href: string
  count?: number
}

/**
 * Fetches circle activity relevant to today's daily plan:
 * - Circles with unread messages (chef hasn't seen)
 * - Upcoming circle events this week
 * - New RSVPs in the last 24h
 */
export async function getCircleActivityForDaily(): Promise<CircleDailyActivity[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const activities: CircleDailyActivity[] = []

  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const weekStr = `${weekFromNow.getFullYear()}-${String(weekFromNow.getMonth() + 1).padStart(2, '0')}-${String(weekFromNow.getDate()).padStart(2, '0')}`
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // 1. Get chef's circles
  const { data: circles } = await db
    .from('hub_groups')
    .select('id, name, last_message_at')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(20)

  if (!circles || circles.length === 0) return []

  const circleIds = circles.map((c: any) => c.id)

  // 2. Unread messages: circles with messages after chef's last read
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('group_id, last_read_at')
    .eq('profile_id', user.userId)
    .in('group_id', circleIds)

  const lastReadMap = new Map<string, string | null>()
  for (const m of memberships ?? []) {
    lastReadMap.set(m.group_id, m.last_read_at)
  }

  for (const circle of circles) {
    if (!circle.last_message_at) continue
    const lastRead = lastReadMap.get(circle.id)
    if (!lastRead || circle.last_message_at > lastRead) {
      // Count unread messages
      const { count } = await db
        .from('hub_messages')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', circle.id)
        .gt('created_at', lastRead ?? '1970-01-01')

      if (count && count > 0) {
        activities.push({
          id: `unread:${circle.id}`,
          circleName: circle.name,
          circleId: circle.id,
          type: 'unread_messages',
          label: `${count} unread message${count > 1 ? 's' : ''} in ${circle.name}`,
          description: circle.name,
          href: `/circles/${circle.id}`,
          count,
        })
      }
    }
  }

  // 3. Upcoming circle events this week
  const { data: circleEvents } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name), hub_group_id')
    .eq('tenant_id', tenantId)
    .in('hub_group_id', circleIds)
    .gte('event_date', todayStr)
    .lte('event_date', weekStr)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })
    .limit(5)

  for (const evt of circleEvents ?? []) {
    const circle = circles.find((c: any) => c.id === evt.hub_group_id)
    if (!circle) continue

    activities.push({
      id: `event:${evt.id}`,
      circleName: circle.name,
      circleId: circle.id,
      type: 'upcoming_event',
      label: `${evt.occasion ?? 'Circle event'} on ${evt.event_date}`,
      description: `${circle.name} - ${(evt.client as any)?.full_name ?? 'Group'}`,
      href: `/events/${evt.id}`,
    })
  }

  // 4. New RSVPs in last 24h
  const { data: recentRsvps } = await db
    .from('hub_group_members')
    .select('group_id, display_name')
    .in('group_id', circleIds)
    .gte('joined_at', yesterday)
    .limit(10)

  // Group by circle
  const rsvpByCircle = new Map<string, string[]>()
  for (const rsvp of recentRsvps ?? []) {
    const names = rsvpByCircle.get(rsvp.group_id) ?? []
    names.push(rsvp.display_name ?? 'Someone')
    rsvpByCircle.set(rsvp.group_id, names)
  }

  for (const [circleId, names] of rsvpByCircle) {
    const circle = circles.find((c: any) => c.id === circleId)
    if (!circle) continue

    activities.push({
      id: `rsvp:${circleId}`,
      circleName: circle.name,
      circleId,
      type: 'new_rsvp',
      label: `${names.length} new member${names.length > 1 ? 's' : ''} joined ${circle.name}`,
      description: names.slice(0, 3).join(', ') + (names.length > 3 ? '...' : ''),
      href: `/circles/${circleId}`,
      count: names.length,
    })
  }

  return activities
}
