'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getClientEvents } from '@/lib/events/client-actions'
import { getMyLoyaltyStatus } from '@/lib/loyalty/actions'
import { getConversationInbox } from '@/lib/chat/actions'
import { getClientSpendingSummary } from '@/lib/clients/spending-actions'
import { getClientWorkGraphSnapshot } from '@/lib/client-work-graph/actions'
import type { ClientWorkGraph } from '@/lib/client-work-graph/types'
import { buildClientActionRequiredSummary } from '@/lib/client-work-graph/shared-snapshot'
import type {
  ClientDashboardEvent,
  ClientDashboardWidgetPreference,
} from '@/lib/client-dashboard/types'
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

type UpdateClientDashboardPreferencesInput = z.infer<typeof UpdateClientDashboardPreferencesSchema>

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
    .eq('tenant_id', user.tenantId!)
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
    .eq('tenant_id', user.tenantId!)
    .single()

  if (existing) {
    const { error } = await fromClientPreferences(db)
      .update(payload)
      .eq('client_id', user.entityId)
      .eq('tenant_id', user.tenantId!)

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

export async function revalidateClientDashboardProfileState(): Promise<{ success: true }> {
  await requireClient()

  revalidatePath('/my-events')
  revalidatePath('/my-profile')
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
  workGraph: ClientWorkGraph
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

  const [snapshot, loyaltyStatus, inbox, spendingSummary] = await Promise.all([
    getClientWorkGraphSnapshot({ pastLimit: 5 }),
    getMyLoyaltyStatus().catch(() => null),
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
  ])

  const {
    eventsResult,
    quotes,
    inquiries,
    profileSummary,
    hubSummary,
    rsvpSummary,
    unreviewedEvent,
    pastWithBalance,
    workGraph,
  } = snapshot
  const { upcoming, past } = eventsResult

  let chefDisplayName = 'your chef'
  if (unreviewedEvent && user.tenantId) {
    const { data: chef } = await db
      .from('chefs')
      .select('business_name')
      .eq('id', user.tenantId)
      .single()
    chefDisplayName = chef?.business_name || 'your chef'
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
    profileSummary,
    hubSummary,
    rsvpSummary,
    documentsSummary: {
      nextEventId,
      lastPastEventId,
      quoteIdForPdf,
    },
    unreviewedEvent: unreviewedEvent as ClientDashboardEvent | null,
    chefDisplayName,
    pastWithBalance,
    workGraph,
    actionRequired: buildClientActionRequiredSummary(workGraph.summary),
  }
}
