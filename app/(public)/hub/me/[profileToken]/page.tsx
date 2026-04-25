import { headers } from 'next/headers'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import {
  getProfileByToken,
  getProfileEventHistory,
  getProfileGroups,
  getUpcomingEventsForProfile,
} from '@/lib/hub/profile-actions'
import { getGroupById } from '@/lib/hub/group-actions'
import { getHubUnreadCounts } from '@/lib/hub/notification-actions'
import { checkRateLimit } from '@/lib/rateLimit'
import { ProfileView } from './profile-view'

interface Props {
  params: Promise<{ profileToken: string }>
}

export default async function HubProfilePage({ params }: Props) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  try {
    await checkRateLimit(`hub-profile:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const { profileToken } = await params
  const profile = await getProfileByToken(profileToken)

  if (!profile) {
    return <TokenExpiredPage reason="not_found" noun="profile" />
  }

  const [eventHistory, groupMemberships, unreadCounts, upcomingEvents] = await Promise.all([
    getProfileEventHistory(profileToken),
    getProfileGroups(profileToken),
    getHubUnreadCounts(profileToken).catch(() => []),
    getUpcomingEventsForProfile(profileToken).catch(() => []),
  ])

  // Build unread map by group_id
  const unreadByGroup: Record<string, number> = {}
  for (const u of unreadCounts) {
    unreadByGroup[u.group_id] = u.unread_count
  }

  // Load group details
  const groups = await Promise.all(
    groupMemberships.map(async (m) => {
      const group = await getGroupById(m.group_id)
      return group
        ? { ...group, memberRole: m.role, unreadCount: unreadByGroup[m.group_id] ?? 0 }
        : null
    })
  ).then((results) => results.filter(Boolean))

  return (
    <ProfileView
      profile={profile}
      eventHistory={eventHistory}
      upcomingEvents={upcomingEvents}
      groups={
        groups as (NonNullable<(typeof groups)[number]> & {
          memberRole: string
          unreadCount: number
        })[]
      }
    />
  )
}

export const dynamic = 'force-dynamic'
