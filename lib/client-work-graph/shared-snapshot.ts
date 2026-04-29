import { createServerClient } from '@/lib/db/server'
import {
  getLatestPendingClientGuestCountChangeMap,
  type GuestCountChange,
} from '@/lib/guests/count-changes'
import type {
  ClientGraphEvent,
  ClientGraphInquiry,
  ClientGraphQuote,
  ClientProfileWorkSummary,
  ClientRsvpWorkSummary,
  ClientWorkGraphSummary,
} from './types'

export type ClientWorkGraphEventRecord = ClientGraphEvent & Record<string, any>

type ClientWorkGraphProfileRecord = {
  id: string
  full_name: string | null
  phone: string | null
  address: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  favorite_cuisines: string[] | null
  availability_signal_notifications: boolean | null
}

type PendingGuestCountChangeMapLoader = (
  eventIds: string[]
) => Promise<Map<string, GuestCountChange>>

type SharedClientWorkGraphDependencies = {
  db?: any
  getPendingGuestCountChangeMap?: PendingGuestCountChangeMapLoader
}

export type SharedClientWorkGraphSnapshot = {
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
  rsvpSummary: ClientRsvpWorkSummary
  pastWithBalance: Set<string>
  unreviewedEvent: ClientWorkGraphEventRecord | null
}

export type ClientActionRequiredSummary = {
  proposalCount: number
  paymentDueCount: number
  outstandingBalanceCount: number
  quotePendingCount: number
  inquiryAwaitingCount: number
  friendRequestCount: number
  totalItems: number
}

function enrichEvents(
  events: Array<Record<string, any>>,
  contractMap: Map<string, { signedAt: string | null; status: string | null }>,
  reviewedEventIds: Set<string>,
  outstandingBalanceIds: Set<string>,
  pendingGuestCountChangeMap: Map<string, GuestCountChange>
): ClientWorkGraphEventRecord[] {
  return events.map((event) => {
    const eventId = String(event.id)
    const contract = contractMap.get(eventId)
    const pendingChange = pendingGuestCountChangeMap.get(eventId)

    return {
      ...(event as ClientWorkGraphEventRecord),
      hasContract: Boolean(contract),
      contractStatus: contract?.status ?? null,
      contractSignedAt: contract?.signedAt ?? null,
      hasReview: reviewedEventIds.has(eventId),
      hasOutstandingBalance: outstandingBalanceIds.has(eventId),
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

function buildProfileSummary(
  profile: ClientWorkGraphProfileRecord | null,
  pendingMealRequests: number
): ClientProfileWorkSummary {
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
    signalNotificationsEnabled: profile?.availability_signal_notifications ?? true,
  }
}

export function buildClientActionRequiredSummary(
  summary: Pick<
    ClientWorkGraphSummary,
    | 'proposalCount'
    | 'paymentDueCount'
    | 'outstandingBalanceCount'
    | 'quotePendingCount'
    | 'inquiryAwaitingCount'
    | 'friendRequestCount'
    | 'totalItems'
  >
): ClientActionRequiredSummary {
  return {
    proposalCount: summary.proposalCount,
    paymentDueCount: summary.paymentDueCount,
    outstandingBalanceCount: summary.outstandingBalanceCount,
    quotePendingCount: summary.quotePendingCount,
    inquiryAwaitingCount: summary.inquiryAwaitingCount,
    friendRequestCount: summary.friendRequestCount,
    totalItems: summary.totalItems,
  }
}

export async function getSharedClientWorkGraphSnapshot(
  options: {
    tenantId: string
    clientId: string
    pastLimit?: number
  },
  deps: SharedClientWorkGraphDependencies = {}
): Promise<SharedClientWorkGraphSnapshot | null> {
  const db: any = deps.db ?? createServerClient()
  const getPendingGuestCountChangeMap =
    deps.getPendingGuestCountChangeMap ?? getLatestPendingClientGuestCountChangeMap

  const { data: clientProfile, error: clientProfileError } = await db
    .from('clients')
    .select(
      'id, full_name, phone, address, dietary_restrictions, allergies, favorite_cuisines, availability_signal_notifications'
    )
    .eq('id', options.clientId)
    .eq('tenant_id', options.tenantId)
    .single()

  if (clientProfileError) {
    throw new Error('Failed to fetch client profile for work graph')
  }

  if (!clientProfile) {
    return null
  }

  const [eventsResponse, quotesResponse, inquiriesResponse, mealRequestsResponse] =
    await Promise.all([
      db
        .from('events')
        .select(
          `
        *,
        client:clients!inner(id, full_name, email),
        hub_group:hub_groups(group_token)
      `
        )
        .eq('client_id', options.clientId)
        .eq('tenant_id', options.tenantId)
        .not('status', 'eq', 'draft')
        .order('event_date', { ascending: false }),
      db
        .from('quotes')
        .select(
          `
        *,
        inquiry:inquiries(id, confirmed_occasion, confirmed_date, confirmed_guest_count),
        event:events(occasion, event_date)
      `
        )
        .eq('client_id', options.clientId)
        .eq('tenant_id', options.tenantId)
        .in('status', ['sent', 'accepted', 'rejected'])
        .order('created_at', { ascending: false }),
      db
        .from('inquiries')
        .select(
          `
        id,
        status,
        confirmed_occasion,
        confirmed_date,
        confirmed_guest_count,
        confirmed_location,
        follow_up_due_at,
        next_action_required,
        first_contact_at,
        updated_at,
        converted_to_event_id
      `
        )
        .eq('client_id', options.clientId)
        .eq('tenant_id', options.tenantId)
        .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted', 'confirmed'])
        .order('first_contact_at', { ascending: false }),
      db
        .from('client_meal_requests')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', options.clientId)
        .eq('tenant_id', options.tenantId)
        .in('status', ['requested', 'reviewed', 'scheduled']),
    ])

  if (eventsResponse.error) {
    throw new Error('Failed to fetch client events for work graph')
  }
  if (quotesResponse.error) {
    throw new Error('Failed to fetch client quotes for work graph')
  }
  if (inquiriesResponse.error) {
    throw new Error('Failed to fetch client inquiries for work graph')
  }
  if (mealRequestsResponse.error) {
    throw new Error('Failed to fetch client meal requests for work graph')
  }

  const pendingMealRequests = Number(mealRequestsResponse.count ?? 0)
  const profileSummary = buildProfileSummary(
    clientProfile as ClientWorkGraphProfileRecord,
    pendingMealRequests
  )
  const pastLimit = options.pastLimit ?? 5

  const rawEvents = (eventsResponse.data ?? []) as Array<Record<string, any>>
  const allEvents = [...rawEvents].sort(
    (left, right) =>
      new Date(String(left.event_date)).getTime() - new Date(String(right.event_date)).getTime()
  )
  const upcoming = rawEvents
    .filter((event) =>
      ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(String(event.status))
    )
    .sort(
      (left, right) =>
        new Date(String(left.event_date)).getTime() - new Date(String(right.event_date)).getTime()
    )
  const completed = rawEvents.filter((event) => event.status === 'completed')
  const cancelled = rawEvents.filter((event) => event.status === 'cancelled')
  const pastTotalCount = completed.length
  const past = Number.isFinite(pastLimit) ? completed.slice(0, pastLimit) : completed

  const eventIds = allEvents.map((event) => String(event.id))

  let contractRows: Array<{
    event_id: string
    signed_at: string | null
    status: string | null
    created_at: string
  }> = []
  let reviewRows: Array<{ event_id: string }> = []
  let balanceRows: Array<{ event_id: string; outstanding_balance_cents: number }> = []
  let pendingGuestCountChangeMap = new Map<string, GuestCountChange>()

  if (eventIds.length > 0) {
    const [contractsResponse, reviewsResponse, balancesResponse, pendingChanges] =
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
        getPendingGuestCountChangeMap(eventIds),
      ])

    if (contractsResponse.error) {
      throw new Error('Failed to fetch client contracts for work graph')
    }
    if (reviewsResponse.error) {
      throw new Error('Failed to fetch client reviews for work graph')
    }
    if (balancesResponse.error) {
      throw new Error('Failed to fetch client balances for work graph')
    }

    contractRows = (contractsResponse.data ?? []) as typeof contractRows
    reviewRows = (reviewsResponse.data ?? []) as typeof reviewRows
    balanceRows = (balancesResponse.data ?? []) as typeof balanceRows
    pendingGuestCountChangeMap = pendingChanges
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
    upcoming,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )
  const enrichedPast = enrichEvents(
    past,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )
  const enrichedCancelled = enrichEvents(
    cancelled,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )
  const enrichedAll = enrichEvents(
    allEvents,
    contractMap,
    reviewedEventIds,
    pastWithBalance,
    pendingGuestCountChangeMap
  )

  const unreviewedEvent =
    [...enrichedPast]
      .sort(
        (left, right) =>
          new Date(String(right.event_date)).getTime() - new Date(String(left.event_date)).getTime()
      )
      .find((event) => !event.hasReview) ?? null

  const rsvpEvent = enrichedUpcoming.find((event) =>
    ['accepted', 'paid', 'confirmed', 'in_progress'].includes(String(event.status))
  )

  let rsvpSummary: ClientRsvpWorkSummary = null
  if (rsvpEvent?.id) {
    const [rsvpSummaryResponse, eventSharesResponse] = await Promise.all([
      db
        .from('event_rsvp_summary')
        .select('event_id, total_guests, attending_count, pending_count')
        .eq('event_id', String(rsvpEvent.id))
        .eq('tenant_id', options.tenantId)
        .maybeSingle(),
      db
        .from('event_shares')
        .select('id, is_active')
        .eq('event_id', String(rsvpEvent.id))
        .eq('tenant_id', options.tenantId)
        .eq('created_by_client_id', options.clientId),
    ])

    if (rsvpSummaryResponse.error && rsvpSummaryResponse.error.code !== 'PGRST116') {
      throw new Error('Failed to fetch RSVP summary for work graph')
    }
    if (eventSharesResponse.error) {
      throw new Error('Failed to fetch event shares for work graph')
    }

    const summary = rsvpSummaryResponse.data
    const shares = eventSharesResponse.data ?? []

    rsvpSummary = {
      eventId: String(rsvpEvent.id),
      occasion: (rsvpEvent.occasion as string | null) ?? null,
      totalGuests: Number((summary as any)?.total_guests ?? 0),
      attendingCount: Number((summary as any)?.attending_count ?? 0),
      pendingCount: Number((summary as any)?.pending_count ?? 0),
      hasActiveShare: shares.some((share: any) => Boolean(share?.is_active)),
    }
  }

  return {
    eventsResult: {
      upcoming: enrichedUpcoming,
      past: enrichedPast,
      pastTotalCount,
      cancelled: enrichedCancelled,
      all: enrichedAll,
    },
    quotes: (quotesResponse.data ?? []) as ClientGraphQuote[],
    inquiries: (inquiriesResponse.data ?? []) as ClientGraphInquiry[],
    profileSummary,
    rsvpSummary,
    pastWithBalance,
    unreviewedEvent,
  }
}
