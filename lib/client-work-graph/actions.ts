'use server'

import { requireClient } from '@/lib/auth/get-user'
import { getClientHubGroups, getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { getMyFriends, getPendingFriendRequests } from '@/lib/hub/friend-actions'
import { getHubTotalUnreadCount } from '@/lib/hub/notification-actions'
import { getNotifications, getUnreadCount } from '@/lib/notifications/actions'
import { getProfileEventStubs } from '@/lib/event-stubs/actions'
import { buildClientWorkGraph } from './build'
import type {
  ClientEventStubSummary,
  ClientHubWorkSummary,
  ClientNotificationWorkSummary,
  ClientWorkGraph,
} from './types'
import type { SharedClientWorkGraphSnapshot } from './shared-snapshot'
import { getSharedClientWorkGraphSnapshot } from './shared-snapshot'

export type ClientWorkGraphSnapshot = SharedClientWorkGraphSnapshot & {
  hubSummary: ClientHubWorkSummary
  notificationSummary: ClientNotificationWorkSummary
  eventStubs: ClientEventStubSummary[]
  workGraph: ClientWorkGraph
}

function mapEventStubs(
  stubs: Array<Record<string, any>>,
  groupTokenByStubId: Map<string, string>
): ClientEventStubSummary[] {
  return stubs
    .filter((stub) => stub.status !== 'cancelled' && stub.status !== 'adopted')
    .map((stub) => ({
      id: String(stub.id),
      title: String(stub.title ?? 'Planned dinner'),
      occasion: typeof stub.occasion === 'string' ? stub.occasion : null,
      status: stub.status as ClientEventStubSummary['status'],
      hubGroupId: typeof stub.hub_group_id === 'string' ? stub.hub_group_id : null,
      hubGroupToken: groupTokenByStubId.get(String(stub.id)) ?? null,
      eventDate: typeof stub.event_date === 'string' ? stub.event_date : null,
      guestCount: typeof stub.guest_count === 'number' ? stub.guest_count : null,
    }))
}

export async function getClientWorkGraphSnapshot(options?: {
  pastLimit?: number
}): Promise<ClientWorkGraphSnapshot> {
  const user = await requireClient()
  const sharedSnapshot = await getSharedClientWorkGraphSnapshot({
    tenantId: user.tenantId!,
    clientId: user.entityId,
    pastLimit: options?.pastLimit ?? 5,
  })

  if (!sharedSnapshot) {
    throw new Error('Client work graph snapshot unavailable')
  }

  const [
    profileToken,
    groups,
    friends,
    pendingFriendRequests,
    unreadNotificationsCount,
    notifications,
  ] = await Promise.all([
    getClientProfileToken().catch(() => ''),
    getClientHubGroups().catch(() => []),
    getMyFriends().catch(() => []),
    getPendingFriendRequests().catch(() => []),
    getUnreadCount().catch(() => 0),
    getNotifications(10).catch(() => []),
  ])

  let unreadLoadFailed = false
  const totalUnreadCount = profileToken
    ? await getHubTotalUnreadCount(profileToken).catch(() => {
        unreadLoadFailed = true
        return 0
      })
    : 0

  const hubSummary: ClientHubWorkSummary = {
    groupCount: groups.length,
    friendCount: friends.length,
    pendingFriendRequestCount: pendingFriendRequests.length,
    totalUnreadCount,
    unreadLoadFailed,
  }

  const groupTokenByStubId = new Map(
    groups
      .filter((group) => group.event_stub_id && group.group_token)
      .map((group) => [group.event_stub_id as string, group.group_token])
  )

  const eventStubs = profileToken
    ? mapEventStubs(
        (await getProfileEventStubs(profileToken).catch(() => [])) as Array<Record<string, any>>,
        groupTokenByStubId
      )
    : []

  const notificationSummary: ClientNotificationWorkSummary = {
    unreadCount: unreadNotificationsCount,
    unread: (notifications as Array<Record<string, any>>)
      .filter((notification) => !notification.read_at)
      .slice(0, 5)
      .map((notification) => ({
        id: String(notification.id),
        title: String(notification.title ?? 'Recent update'),
        actionUrl: typeof notification.action_url === 'string' ? notification.action_url : null,
        createdAt: String(notification.created_at ?? new Date().toISOString()),
      })),
  }

  const workGraph = buildClientWorkGraph({
    events: sharedSnapshot.eventsResult.all,
    quotes: sharedSnapshot.quotes,
    inquiries: sharedSnapshot.inquiries,
    profileSummary: sharedSnapshot.profileSummary,
    hubSummary,
    rsvpSummary: sharedSnapshot.rsvpSummary,
    notificationSummary,
    eventStubs,
  })

  return {
    ...sharedSnapshot,
    hubSummary,
    notificationSummary,
    eventStubs,
    workGraph,
  }
}
