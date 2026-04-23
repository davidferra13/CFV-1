'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getClientEvents } from '@/lib/events/client-actions'
import { getClientQuotes } from '@/lib/quotes/client-actions'
import { getClientInquiries } from '@/lib/inquiries/client-actions'
import { getMyMealCollaborationData, getMyProfile } from '@/lib/clients/client-profile-actions'
import { getClientSignalNotificationPref } from '@/lib/calendar/signal-settings-actions'
import { getClientHubGroups, getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { getMyFriends, getPendingFriendRequests } from '@/lib/hub/friend-actions'
import { getHubTotalUnreadCount } from '@/lib/hub/notification-actions'
import { getEventRSVPSummary, getEventShares } from '@/lib/sharing/actions'
import { getNotifications, getUnreadCount } from '@/lib/notifications/actions'
import { getProfileEventStubs } from '@/lib/event-stubs/actions'
import { getLatestPendingClientGuestCountChangeMap } from '@/lib/guests/count-changes'
import { buildClientWorkGraph } from './build'
import type {
  ClientEventStubSummary,
  ClientGraphEvent,
  ClientGraphInquiry,
  ClientGraphQuote,
  ClientHubWorkSummary,
  ClientNotificationWorkSummary,
  ClientProfileWorkSummary,
  ClientRsvpWorkSummary,
  ClientWorkGraph,
} from './types'

type ClientWorkGraphEventRecord = ClientGraphEvent & Record<string, any>

export type ClientWorkGraphSnapshot = {
  eventsResult: {
    upcoming: ClientWorkGraphEventRecord[]
    past: ClientWorkGraphEventRecord[]
    pastTotalCount: number
    cancelled: ClientWorkGraphEventRecord[]
    all: ClientWorkGraphEventRecord[]
  }
  quotes: ClientGraphQuote[]
  inquiries: ClientGraphInquiry[]
  profileSummary: ClientProfileWorkSummary
  hubSummary: ClientHubWorkSummary
  rsvpSummary: ClientRsvpWorkSummary
  notificationSummary: ClientNotificationWorkSummary
  eventStubs: ClientEventStubSummary[]
  pastWithBalance: Set<string>
  unreviewedEvent: ClientWorkGraphEventRecord | null
  workGraph: ClientWorkGraph
}

function enrichEvents(
  events: Array<Record<string, any>>,
  contractMap: Map<string, { signedAt: string | null; status: string | null }>,
  reviewedEventIds: Set<string>,
  outstandingBalanceIds: Set<string>,
  pendingGuestCountChangeMap: Map<
    string,
    {
      id: string
      previous_count: number
      new_count: number
      created_at: string
    }
  >
): ClientWorkGraphEventRecord[] {
  return events.map((event) => {
    const contract = contractMap.get(String(event.id))
    const pendingChange = pendingGuestCountChangeMap.get(String(event.id))
    return {
      ...(event as ClientWorkGraphEventRecord),
      hasContract: Boolean(contract),
      contractStatus: contract?.status ?? null,
      contractSignedAt: contract?.signedAt ?? null,
      hasReview: reviewedEventIds.has(String(event.id)),
      hasOutstandingBalance: outstandingBalanceIds.has(String(event.id)),
      pendingGuestCountChange: pendingChange
        ? {
            id: pendingChange.id,
            previousCount: pendingChange.previous_count,
            newCount: pendingChange.new_count,
            requestedAt: pendingChange.created_at,
          }
        : null,
    }
  })
}

function buildProfileSummary(profile: Record<string, any> | null, pendingMealRequests: number, signalNotificationsEnabled: boolean): ClientProfileWorkSummary {
  const profileChecks = [
    Boolean(profile?.full_name),
    Boolean(profile?.phone),
    Boolean(profile?.address),
    Array.isArray(profile?.dietary_restrictions) ? profile.dietary_restrictions.length > 0 : false,
    Array.isArray(profile?.allergies) ? profile.allergies.length > 0 : false,
    Array.isArray(profile?.favorite_cuisines) ? profile.favorite_cuisines.length > 0 : false,
  ]
  const completedFields = profileChecks.filter(Boolean).length
  const totalFields = profileChecks.length

  return {
    completionPercent: totalFields === 0 ? 0 : Math.round((completedFields / totalFields) * 100),
    completedFields,
    totalFields,
    pendingMealRequests,
    signalNotificationsEnabled,
  }
}

function mapEventStubs(stubs: Array<Record<string, any>>): ClientEventStubSummary[] {
  return stubs
    .filter((stub) => stub.status !== 'cancelled' && stub.status !== 'adopted')
    .map((stub) => ({
      id: String(stub.id),
      title: String(stub.title ?? 'Planned dinner'),
      occasion: typeof stub.occasion === 'string' ? stub.occasion : null,
      status: stub.status as ClientEventStubSummary['status'],
      hubGroupId: typeof stub.hub_group_id === 'string' ? stub.hub_group_id : null,
      eventDate: typeof stub.event_date === 'string' ? stub.event_date : null,
      guestCount: typeof stub.guest_count === 'number' ? stub.guest_count : null,
    }))
}

export async function getClientWorkGraphSnapshot(
  options?: { pastLimit?: number }
): Promise<ClientWorkGraphSnapshot> {
  await requireClient()
  const db: any = createServerClient()

  const [
    eventsResult,
    quotesResult,
    inquiriesResult,
    profile,
    mealCollab,
    signalNotificationsEnabled,
    profileToken,
    groups,
    friends,
    pendingFriendRequests,
    unreadNotificationsCount,
    notifications,
  ] = await Promise.all([
    getClientEvents({ pastLimit: options?.pastLimit ?? 5 }),
    getClientQuotes().catch(() => []),
    getClientInquiries().catch(() => []),
    getMyProfile().catch(() => null),
    getMyMealCollaborationData().catch(() => ({ history: [], requests: [] })),
    getClientSignalNotificationPref().catch(() => true),
    getClientProfileToken().catch(() => ''),
    getClientHubGroups().catch(() => []),
    getMyFriends().catch(() => []),
    getPendingFriendRequests().catch(() => []),
    getUnreadCount().catch(() => 0),
    getNotifications(10).catch(() => []),
  ])

  const pendingMealRequests = Array.isArray(mealCollab.requests)
    ? mealCollab.requests.filter((request: any) =>
        ['requested', 'reviewed', 'scheduled'].includes(String(request.status))
      ).length
    : 0

  const quotes = quotesResult as ClientGraphQuote[]
  const inquiries = inquiriesResult as ClientGraphInquiry[]

  let unreadLoadFailed = false
  const totalUnreadCount = profileToken
    ? await getHubTotalUnreadCount(profileToken).catch(() => {
        unreadLoadFailed = true
        return 0
      })
    : 0

  const allEvents = [
    ...eventsResult.upcoming,
    ...eventsResult.past,
    ...eventsResult.cancelled,
  ] as Array<Record<string, any>>
  const eventIds = allEvents.map((event) => String(event.id))

  let contractRows: Array<{
    event_id: string
    signed_at: string | null
    status: string | null
    created_at: string
  }> = []
  let reviewRows: Array<{ event_id: string }> = []
  let balanceRows: Array<{ event_id: string; outstanding_balance_cents: number }> = []
  let pendingGuestCountChangeMap = new Map<
    string,
    {
      id: string
      previous_count: number
      new_count: number
      created_at: string
    }
  >()

  if (eventIds.length > 0) {
    ;[{ data: contractRows = [] }, { data: reviewRows = [] }, { data: balanceRows = [] }] =
      await Promise.all([
        db
          .from('event_contracts')
          .select('event_id, signed_at, status, created_at')
          .in('event_id', eventIds)
          .not('status', 'eq', 'voided')
          .order('created_at', { ascending: false }),
        db.from('client_reviews').select('event_id').in('event_id', eventIds),
        db
          .from('event_financial_summary')
          .select('event_id, outstanding_balance_cents')
          .in('event_id', eventIds)
          .gt('outstanding_balance_cents', 0),
      ])
    const pendingChanges = await getLatestPendingClientGuestCountChangeMap(eventIds)
    pendingGuestCountChangeMap = new Map(
      Array.from(pendingChanges.entries()).map(([eventId, change]) => [
        eventId,
        {
          id: change.id,
          previous_count: change.previous_count,
          new_count: change.new_count,
          created_at: change.created_at,
        },
      ])
    )
  }

  const contractMap = new Map<string, { signedAt: string | null; status: string | null }>()
  for (const row of contractRows) {
    const eventId = String(row.event_id)
    if (contractMap.has(eventId)) continue
    contractMap.set(eventId, {
      signedAt: row.signed_at ?? null,
      status: row.status ?? null,
    })
  }
  const reviewedEventIds = new Set(reviewRows.map((row) => String(row.event_id)))
  const pastWithBalance = new Set(
    balanceRows
      .filter((row) => Number(row.outstanding_balance_cents ?? 0) > 0)
      .map((row) => String(row.event_id))
  )

  const enrichedUpcoming = enrichEvents(
    eventsResult.upcoming as Array<Record<string, any>>,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )
  const enrichedPast = enrichEvents(
    eventsResult.past as Array<Record<string, any>>,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )
  const enrichedCancelled = enrichEvents(
    eventsResult.cancelled as Array<Record<string, any>>,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )
  const enrichedAll = enrichEvents(
    eventsResult.all as Array<Record<string, any>>,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )

  const unreviewedEvent =
    [...enrichedPast]
      .sort((left, right) => new Date(String(right.event_date)).getTime() - new Date(String(left.event_date)).getTime())
      .find((event) => !event.hasReview) ?? null

  const profileSummary = buildProfileSummary(
    profile as Record<string, any> | null,
    pendingMealRequests,
    signalNotificationsEnabled
  )

  const hubSummary: ClientHubWorkSummary = {
    groupCount: groups.length,
    friendCount: friends.length,
    pendingFriendRequestCount: pendingFriendRequests.length,
    totalUnreadCount,
    unreadLoadFailed,
  }

  const rsvpEvent = enrichedUpcoming.find((event) =>
    ['accepted', 'paid', 'confirmed', 'in_progress'].includes(String(event.status))
  )

  let rsvpSummary: ClientRsvpWorkSummary = null
  if (rsvpEvent?.id) {
    const [summary, shares] = await Promise.all([
      getEventRSVPSummary(String(rsvpEvent.id)).catch(() => null),
      getEventShares(String(rsvpEvent.id)).catch(() => []),
    ])

    const hasActiveShare = Array.isArray(shares)
      ? shares.some((share: any) => Boolean(share?.is_active))
      : false

    rsvpSummary = {
      eventId: String(rsvpEvent.id),
      occasion: (rsvpEvent.occasion as string | null) ?? null,
      totalGuests: Number((summary as any)?.total_guests ?? 0),
      attendingCount: Number((summary as any)?.attending_count ?? 0),
      pendingCount: Number((summary as any)?.pending_count ?? 0),
      hasActiveShare,
    }
  }

  const eventStubs = profileToken
    ? mapEventStubs((await getProfileEventStubs(profileToken).catch(() => [])) as Array<Record<string, any>>)
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
    events: enrichedAll,
    quotes,
    inquiries,
    profileSummary,
    hubSummary,
    rsvpSummary,
    notificationSummary,
    eventStubs,
  })

  return {
    eventsResult: {
      upcoming: enrichedUpcoming,
      past: enrichedPast,
      pastTotalCount: eventsResult.pastTotalCount,
      cancelled: enrichedCancelled,
      all: enrichedAll,
    },
    quotes,
    inquiries,
    profileSummary,
    hubSummary,
    rsvpSummary,
    notificationSummary,
    eventStubs,
    pastWithBalance,
    unreviewedEvent,
    workGraph,
  }
}
