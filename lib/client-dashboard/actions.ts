'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getClientEvents } from '@/lib/events/client-actions'
import { getMyLoyaltyStatus } from '@/lib/loyalty/actions'
import { getClientQuotes } from '@/lib/quotes/client-actions'
import { getClientInquiries } from '@/lib/inquiries/client-actions'
import { getConversationInbox } from '@/lib/chat/actions'
import { getClientSpendingSummary } from '@/lib/clients/spending-actions'
import { getMyMealCollaborationData, getMyProfile } from '@/lib/clients/client-profile-actions'
import { getClientSignalNotificationPref } from '@/lib/calendar/signal-settings-actions'
import { getClientHubGroups, getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { getMyFriends, getPendingFriendRequests } from '@/lib/hub/friend-actions'
import { getHubTotalUnreadCount } from '@/lib/hub/notification-actions'
import { getEventRSVPSummary, getEventShares } from '@/lib/sharing/actions'
import type { Database } from '@/types/database'
import type { ClientDashboardWidgetPreference } from '@/lib/client-dashboard/types'
import { CLIENT_DASHBOARD_WIDGET_IDS } from '@/lib/client-dashboard/types'
import {
  cloneDefaultClientDashboardWidgets,
  getClientDashboardWidgetsFromUnknown,
  sanitizeClientDashboardWidgets,
} from '@/lib/client-dashboard/preferences'

const ClientDashboardWidgetPreferenceSchema = z.object({
  id: z.enum(CLIENT_DASHBOARD_WIDGET_IDS),
  enabled: z.boolean(),
})

const UpdateClientDashboardPreferencesSchema = z.object({
  dashboard_widgets: z.array(ClientDashboardWidgetPreferenceSchema).optional(),
})

export type UpdateClientDashboardPreferencesInput = z.infer<
  typeof UpdateClientDashboardPreferencesSchema
>

type EventRow = Database['public']['Tables']['events']['Row']
export type ClientDashboardEvent = EventRow & {
  client: { id: string; full_name: string; email: string }
  hub_group?: { group_token: string } | null
}

function fromClientPreferences(db: any): any {
  return db.from('client_preferences')
}

export async function getClientDashboardPreferences(): Promise<{
  dashboard_widgets: ClientDashboardWidgetPreference[]
}> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data, error } = await fromClientPreferences(db)
    .select('dashboard_widgets')
    .eq('client_id', user.entityId)
    .single()

  if (error || !data) {
    return {
      dashboard_widgets: cloneDefaultClientDashboardWidgets(),
    }
  }

  const row = data as Record<string, unknown>
  return {
    dashboard_widgets: getClientDashboardWidgetsFromUnknown(row.dashboard_widgets),
  }
}

export async function updateClientDashboardPreferences(
  input: UpdateClientDashboardPreferencesInput
): Promise<{ success: true }> {
  const user = await requireClient()
  const validated = UpdateClientDashboardPreferencesSchema.parse(input)
  const payload: Record<string, unknown> = {}

  if (validated.dashboard_widgets) {
    payload.dashboard_widgets = sanitizeClientDashboardWidgets(validated.dashboard_widgets)
  }

  const db: any = createServerClient()

  const { data: existing } = await fromClientPreferences(db)
    .select('id')
    .eq('client_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromClientPreferences(db).update(payload).eq('client_id', user.entityId)

    if (error) {
      console.error('[updateClientDashboardPreferences] Update error:', error)
      throw new Error('Failed to update client dashboard preferences')
    }
  } else {
    const { error } = await fromClientPreferences(db).insert({
      client_id: user.entityId,
      tenant_id: user.tenantId!,
      ...payload,
    })

    if (error) {
      console.error('[updateClientDashboardPreferences] Insert error:', error)
      throw new Error('Failed to save client dashboard preferences')
    }
  }

  revalidatePath('/my-events')
  revalidatePath('/my-events/settings/dashboard')
  return { success: true }
}

export async function getClientDashboardData(): Promise<{
  eventsResult: Awaited<ReturnType<typeof getClientEvents>>
  loyaltyStatus: Awaited<ReturnType<typeof getMyLoyaltyStatus>> | null
  quotes: Array<Record<string, any>>
  inquiries: Array<Record<string, any>>
  inbox: Array<Record<string, any>>
  spendingSummary: Awaited<ReturnType<typeof getClientSpendingSummary>>
  profileSummary: {
    completionPercent: number
    completedFields: number
    totalFields: number
    pendingMealRequests: number
    signalNotificationsEnabled: boolean
  }
  hubSummary: {
    groupCount: number
    friendCount: number
    pendingFriendRequestCount: number
    totalUnreadCount: number
    unreadLoadFailed?: boolean
  }
  rsvpSummary: {
    eventId: string
    occasion: string | null
    totalGuests: number
    attendingCount: number
    pendingCount: number
    hasActiveShare: boolean
  } | null
  documentsSummary: {
    nextEventId: string | null
    lastPastEventId: string | null
    quoteIdForPdf: string | null
  }
  unreviewedEvent: ClientDashboardEvent | null
  chefDisplayName: string
  pastWithBalance: Set<string>
  actionRequired: {
    proposalCount: number
    paymentDueCount: number
    outstandingBalanceCount: number
    quotePendingCount: number
    inquiryAwaitingCount: number
    totalItems: number
  }
}> {
  const user = await requireClient()
  const db: any = createServerClient()

  const [
    eventsResult,
    loyaltyStatus,
    quotes,
    inquiries,
    inbox,
    spendingSummary,
    myProfile,
    mealCollab,
    signalNotificationsEnabled,
  ] = await Promise.all([
    getClientEvents({ pastLimit: 5 }),
    getMyLoyaltyStatus().catch(() => null),
    getClientQuotes().catch(() => []),
    getClientInquiries().catch(() => []),
    getConversationInbox().catch(() => []),
    getClientSpendingSummary().catch(() => ({
      lifetimeSpendCents: 0,
      thisYearSpendCents: 0,
      eventsAttended: 0,
      averageEventCents: 0,
      upcomingCommittedCents: 0,
      events: [],
      loadError: true as const,
    })),
    getMyProfile().catch(() => null),
    getMyMealCollaborationData().catch(() => ({ history: [], requests: [] })),
    getClientSignalNotificationPref().catch(() => true),
  ])

  const { upcoming, past } = eventsResult

  let unreviewedEvent: ClientDashboardEvent | null = null
  let pastWithBalance = new Set<string>()

  if (past.length > 0) {
    const pastIds = past.map((event: any) => event.id)

    const [reviewRows, balanceRows] = await Promise.all([
      db
        .from('client_reviews')
        .select('event_id')
        .in('event_id', pastIds)
        .then((result: any) => result.data ?? []),
      db
        .from('event_financial_summary')
        .select('event_id, outstanding_balance_cents')
        .in('event_id', pastIds)
        .gt('outstanding_balance_cents', 0)
        .then((result: any) => result.data ?? []),
    ])

    const reviewedEventIds = new Set(
      (reviewRows as Array<{ event_id: string }>).map((row) => row.event_id)
    )
    pastWithBalance = new Set(
      (balanceRows as Array<{ event_id: string; outstanding_balance_cents: number }>)
        .filter((row) => (row.outstanding_balance_cents ?? 0) > 0)
        .map((row) => row.event_id)
    )

    const latestFirst = [...past].sort(
      (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    )
    unreviewedEvent = (latestFirst.find((event) => !reviewedEventIds.has(event.id)) ??
      null) as ClientDashboardEvent | null
  }

  let chefDisplayName = 'your chef'
  if (unreviewedEvent && user.tenantId) {
    const { data: chef } = await db
      .from('chefs')
      .select('business_name')
      .eq('id', user.tenantId)
      .single()
    chefDisplayName = chef?.business_name || 'your chef'
  }

  const proposalCount = upcoming.filter((event: any) => event.status === 'proposed').length
  const paymentDueCount = upcoming.filter(
    (event: any) => event.status === 'accepted' && (event.quoted_price_cents ?? 0) > 0
  ).length
  const outstandingBalanceCount = pastWithBalance.size
  const quotePendingCount = (quotes as Array<Record<string, any>>).filter(
    (quote) => quote.status === 'sent'
  ).length
  const inquiryAwaitingCount = (inquiries as Array<Record<string, any>>).filter(
    (inquiry) => inquiry.status === 'awaiting_client'
  ).length

  const [profileToken, groups, friends, pendingFriendRequests] = await Promise.all([
    getClientProfileToken().catch(() => ''),
    getClientHubGroups().catch(() => []),
    getMyFriends().catch(() => []),
    getPendingFriendRequests().catch(() => []),
  ])
  let unreadLoadFailed = false
  const totalUnreadCount = profileToken
    ? await getHubTotalUnreadCount(profileToken).catch(() => {
        unreadLoadFailed = true
        return 0
      })
    : 0

  const profileChecks = [
    Boolean((myProfile as any)?.full_name),
    Boolean((myProfile as any)?.phone),
    Boolean((myProfile as any)?.address),
    Array.isArray((myProfile as any)?.dietary_restrictions)
      ? (myProfile as any).dietary_restrictions.length > 0
      : false,
    Array.isArray((myProfile as any)?.allergies) ? (myProfile as any).allergies.length > 0 : false,
    Array.isArray((myProfile as any)?.favorite_cuisines)
      ? (myProfile as any).favorite_cuisines.length > 0
      : false,
  ]
  const completedFields = profileChecks.filter(Boolean).length
  const totalFields = profileChecks.length
  const completionPercent = Math.round((completedFields / totalFields) * 100)
  const pendingMealRequests = Array.isArray(mealCollab.requests)
    ? mealCollab.requests.filter((request: any) =>
        ['requested', 'reviewed', 'scheduled'].includes(String(request.status))
      ).length
    : 0

  let rsvpSummary: {
    eventId: string
    occasion: string | null
    totalGuests: number
    attendingCount: number
    pendingCount: number
    hasActiveShare: boolean
  } | null = null
  const rsvpEvent = (upcoming as Array<Record<string, any>>).find((event) =>
    ['accepted', 'paid', 'confirmed', 'in_progress'].includes(String(event.status))
  )

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

  const quoteIdForPdf =
    (quotes as Array<Record<string, any>>).find((quote) => quote.status === 'sent')?.id ?? null
  const nextEventId = (upcoming as Array<Record<string, any>>)[0]?.id ?? null
  const lastPastEventId =
    [...(past as Array<Record<string, any>>)].sort(
      (a, b) =>
        new Date(b.event_date as Date | string).getTime() -
        new Date(a.event_date as Date | string).getTime()
    )[0]?.id ?? null

  return {
    eventsResult,
    loyaltyStatus,
    quotes: quotes as Array<Record<string, any>>,
    inquiries: inquiries as Array<Record<string, any>>,
    inbox: inbox as Array<Record<string, any>>,
    spendingSummary,
    profileSummary: {
      completionPercent,
      completedFields,
      totalFields,
      pendingMealRequests,
      signalNotificationsEnabled,
    },
    hubSummary: {
      groupCount: groups.length,
      friendCount: friends.length,
      pendingFriendRequestCount: pendingFriendRequests.length,
      totalUnreadCount,
      unreadLoadFailed,
    },
    rsvpSummary,
    documentsSummary: {
      nextEventId,
      lastPastEventId,
      quoteIdForPdf,
    },
    unreviewedEvent,
    chefDisplayName,
    pastWithBalance,
    actionRequired: {
      proposalCount,
      paymentDueCount,
      outstandingBalanceCount,
      quotePendingCount,
      inquiryAwaitingCount,
      totalItems:
        proposalCount +
        paymentDueCount +
        outstandingBalanceCount +
        quotePendingCount +
        inquiryAwaitingCount,
    },
  }
}
