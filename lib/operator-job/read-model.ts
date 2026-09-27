'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventFinancialSummaryInternal } from '@/lib/ledger/compute'
import {
  buildChefOperatorJob,
  type ChefOperatorJobInput,
  type ChefOperatorJobJourney,
} from '@/lib/operator-job/journey'

type ChefIdentity = {
  tenantId: string
}

type EventRow = {
  id: string
  inquiry_id: string | null
  client_id: string | null
  occasion: string | null
  status: string
  menu_id: string | null
  timeline_ready: boolean | null
  grocery_list_ready: boolean | null
  prep_list_ready: boolean | null
  packing_list_ready: boolean | null
  service_started_at: string | null
  service_completed_at: string | null
  financially_closed: boolean | null
  follow_up_sent: boolean | null
}

async function loadClientName(db: any, tenantId: string, clientId: string | null) {
  if (!clientId) return null

  const { data, error } = await db
    .from('clients')
    .select('id, full_name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load operator-job client: ${error.message}`)
  return data?.full_name ?? null
}

async function loadLatestQuote(db: any, tenantId: string, filters: {
  inquiryId?: string | null
  eventId?: string | null
}) {
  let query = db
    .from('quotes')
    .select('id, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (filters.inquiryId) query = query.eq('inquiry_id', filters.inquiryId)
  else if (filters.eventId) query = query.eq('event_id', filters.eventId)
  else return null

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Failed to load operator-job quote: ${error.message}`)
  return data ?? null
}

async function loadEvent(db: any, tenantId: string, eventId: string): Promise<EventRow> {
  const { data, error } = await db
    .from('events')
    .select(
      'id, inquiry_id, client_id, occasion, status, menu_id, timeline_ready, grocery_list_ready, prep_list_ready, packing_list_ready, service_started_at, service_completed_at, financially_closed, follow_up_sent'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to load operator-job event: ${error?.message || 'not found'}`)
  }

  return data as EventRow
}

async function loadMenuLineage(db: any, tenantId: string, menuId: string | null) {
  if (!menuId) return null

  const { data, error } = await db
    .from('menus')
    .select('id, forked_from_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load operator-job menu lineage: ${error.message}`)
  return data ?? null
}

async function loadFinancialState(eventId: string, tenantId: string) {
  try {
    const financial = await getEventFinancialSummaryInternal(eventId, tenantId)

    if (!financial) {
      return {
        financialAvailable: false,
        paymentStatus: null,
        outstandingBalanceCents: null,
      }
    }

    return {
      financialAvailable: true,
      paymentStatus: financial.paymentStatus ?? null,
      outstandingBalanceCents: financial.outstandingBalanceCents,
    }
  } catch {
    return {
      financialAvailable: false,
      paymentStatus: null,
      outstandingBalanceCents: null,
    }
  }
}

function eventInput(event: EventRow, financial: Awaited<ReturnType<typeof loadFinancialState>>) {
  return {
    id: event.id,
    status: event.status,
    clientId: event.client_id,
    menuId: event.menu_id,
    timelineReady: event.timeline_ready,
    groceryListReady: event.grocery_list_ready,
    prepListReady: event.prep_list_ready,
    packingListReady: event.packing_list_ready,
    serviceStartedAt: event.service_started_at,
    serviceCompletedAt: event.service_completed_at,
    financiallyClosed: event.financially_closed,
    followUpSent: event.follow_up_sent,
    financialAvailable: financial.financialAvailable,
    paymentStatus: financial.paymentStatus,
    outstandingBalanceCents: financial.outstandingBalanceCents,
  } satisfies NonNullable<ChefOperatorJobInput['event']>
}

async function loadByInquiry(
  chef: ChefIdentity,
  inquiryId: string
): Promise<ChefOperatorJobJourney> {
  const db: any = createServerClient()
  const { data: inquiry, error } = await db
    .from('inquiries')
    .select(
      'id, status, client_id, selected_menu_id, converted_to_event_id, confirmed_occasion'
    )
    .eq('id', inquiryId)
    .eq('tenant_id', chef.tenantId)
    .is('deleted_at' as any, null)
    .single()

  if (error || !inquiry) {
    throw new Error(`Failed to load operator-job inquiry: ${error?.message || 'not found'}`)
  }

  const event = inquiry.converted_to_event_id
    ? await loadEvent(db, chef.tenantId, inquiry.converted_to_event_id)
    : null
  const [clientName, quote, financial, eventMenu] = await Promise.all([
    loadClientName(db, chef.tenantId, inquiry.client_id),
    loadLatestQuote(db, chef.tenantId, { inquiryId: inquiry.id }),
    event
      ? loadFinancialState(event.id, chef.tenantId)
      : Promise.resolve({
          financialAvailable: false,
          paymentStatus: null,
          outstandingBalanceCents: null,
        }),
    event ? loadMenuLineage(db, chef.tenantId, event.menu_id) : Promise.resolve(null),
  ])

  return buildChefOperatorJob({
    title: event?.occasion ?? inquiry.confirmed_occasion ?? 'Chef job',
    clientName,
    inquiry: {
      id: inquiry.id,
      status: inquiry.status,
      clientId: inquiry.client_id,
      convertedEventId: inquiry.converted_to_event_id,
    },
    client: inquiry.client_id ? { id: inquiry.client_id } : null,
    quote: quote ? { id: quote.id, status: quote.status } : null,
    selectedMenuId: inquiry.selected_menu_id ?? null,
    menu: event?.menu_id
      ? {
          id: event.menu_id,
          forkedFromId: eventMenu?.forked_from_id ?? null,
        }
      : null,
    event: event ? eventInput(event, financial) : null,
  })
}

async function loadByEvent(
  chef: ChefIdentity,
  eventId: string
): Promise<ChefOperatorJobJourney> {
  const db: any = createServerClient()
  const event = await loadEvent(db, chef.tenantId, eventId)

  if (event.inquiry_id) {
    return loadByInquiry(chef, event.inquiry_id)
  }

  const [clientName, quote, financial, eventMenu] = await Promise.all([
    loadClientName(db, chef.tenantId, event.client_id),
    loadLatestQuote(db, chef.tenantId, { eventId: event.id }),
    loadFinancialState(event.id, chef.tenantId),
    loadMenuLineage(db, chef.tenantId, event.menu_id),
  ])

  return buildChefOperatorJob({
    title: event.occasion ?? 'Chef job',
    clientName,
    client: event.client_id ? { id: event.client_id } : null,
    quote: quote ? { id: quote.id, status: quote.status } : null,
    menu: event.menu_id
      ? {
          id: event.menu_id,
          forkedFromId: eventMenu?.forked_from_id ?? null,
        }
      : null,
    event: eventInput(event, financial),
  })
}

export async function getChefOperatorJobByInquiry(
  inquiryId: string
): Promise<ChefOperatorJobJourney> {
  const user = await requireChef()
  return loadByInquiry({ tenantId: user.tenantId! }, inquiryId)
}

export async function getChefOperatorJobByEvent(
  eventId: string
): Promise<ChefOperatorJobJourney> {
  const user = await requireChef()
  return loadByEvent({ tenantId: user.tenantId! }, eventId)
}

export async function getChefOperatorTodayJob(): Promise<ChefOperatorJobJourney> {
  const user = await requireChef()
  const chef = { tenantId: user.tenantId! }
  const db: any = createServerClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: inProgressEvent, error: inProgressError } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', chef.tenantId)
    .eq('status', 'in_progress')
    .order('event_date', { ascending: true })
    .order('serve_time', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (inProgressError) {
    throw new Error(`Failed to load operator-job live event: ${inProgressError.message}`)
  }
  if (inProgressEvent?.id) return loadByEvent(chef, inProgressEvent.id)

  const { data: upcomingEvent, error: upcomingError } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', chef.tenantId)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed","in_progress")')
    .order('event_date', { ascending: true })
    .order('serve_time', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (upcomingError) {
    throw new Error(`Failed to load operator-job upcoming event: ${upcomingError.message}`)
  }
  if (upcomingEvent?.id) return loadByEvent(chef, upcomingEvent.id)

  const lookback = new Date()
  lookback.setDate(lookback.getDate() - 14)
  const completedSince = lookback.toISOString().slice(0, 10)
  const { data: recentCompleted, error: completedError } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', chef.tenantId)
    .eq('status', 'completed')
    .gte('event_date', completedSince)
    .order('event_date', { ascending: false })
    .order('serve_time', { ascending: false, nullsFirst: false })
    .limit(8)

  if (completedError) {
    throw new Error(`Failed to load operator-job recent closeout events: ${completedError.message}`)
  }

  for (const completed of recentCompleted || []) {
    const journey = await loadByEvent(chef, completed.id)
    if (!journey.complete) return journey
  }

  const { data: inquiry, error: inquiryError } = await db
    .from('inquiries')
    .select('id')
    .eq('tenant_id', chef.tenantId)
    .is('deleted_at' as any, null)
    .is('converted_to_event_id', null)
    .not('status', 'in', '("declined","expired")')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inquiryError) {
    throw new Error(`Failed to load operator-job Today inquiry: ${inquiryError.message}`)
  }
  if (inquiry?.id) return loadByInquiry(chef, inquiry.id)

  return buildChefOperatorJob({ title: 'First chef job' })
}
