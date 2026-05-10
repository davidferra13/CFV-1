'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface CircleEngagement {
  messageCount7d: number
  messageCount30d: number
  bookingFrequency: number
  lastActivity: string
  trend: 'up' | 'down' | 'stable'
  memberActivityRate: number
}

/**
 * Get engagement metrics for a circle.
 * Computes message frequency, booking patterns, and member activity.
 */
export async function getCircleEngagement(circleId: string): Promise<CircleEngagement> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify circle belongs to this chef
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, created_at, last_message_at')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) {
    return {
      messageCount7d: 0,
      messageCount30d: 0,
      bookingFrequency: 0,
      lastActivity: new Date().toISOString(),
      trend: 'stable',
      memberActivityRate: 0,
    }
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  // Message count last 7 days
  const { count: count7d } = await db
    .from('hub_messages')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', circleId)
    .is('deleted_at', null)
    .gte('created_at', sevenDaysAgo)

  // Message count last 30 days
  const { count: count30d } = await db
    .from('hub_messages')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', circleId)
    .is('deleted_at', null)
    .gte('created_at', thirtyDaysAgo)

  // Booking frequency: events linked to this circle divided by months active
  const { data: eventLinks } = await db
    .from('hub_group_events')
    .select('event_id')
    .eq('group_id', circleId)

  const eventCount = eventLinks?.length ?? 0
  const circleAge = Math.max(
    1,
    (now.getTime() - new Date(circle.created_at).getTime()) / (30 * 86400000)
  )
  const bookingFrequency = Math.round((eventCount / circleAge) * 10) / 10

  // Member activity rate: % of members who posted in last 30 days
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', circleId)

  const totalMembers = members?.length ?? 0
  let activeMembers = 0

  if (totalMembers > 0) {
    const memberIds = members.map((m: any) => m.profile_id)
    const { data: activePosts } = await db
      .from('hub_messages')
      .select('author_profile_id')
      .eq('group_id', circleId)
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgo)
      .in('author_profile_id', memberIds)

    const uniqueActive = new Set((activePosts ?? []).map((p: any) => p.author_profile_id))
    activeMembers = uniqueActive.size
  }

  const memberActivityRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0

  // Trend: compare 7d message count to previous 7d
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString()
  const { count: countPrev7d } = await db
    .from('hub_messages')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', circleId)
    .is('deleted_at', null)
    .gte('created_at', fourteenDaysAgo)
    .lt('created_at', sevenDaysAgo)

  const current = count7d ?? 0
  const previous = countPrev7d ?? 0
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (current > previous + 1) trend = 'up'
  else if (current < previous - 1) trend = 'down'

  const lastActivity = circle.last_message_at ?? circle.created_at

  return {
    messageCount7d: count7d ?? 0,
    messageCount30d: count30d ?? 0,
    bookingFrequency,
    lastActivity,
    trend,
    memberActivityRate,
  }
}
