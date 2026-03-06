'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { extractTakeAChefIntegrationSettings } from '@/lib/integrations/take-a-chef-defaults'
import {
  calculateTakeAChefFinanceSummary,
  extractTakeAChefFinanceMeta,
} from '@/lib/integrations/take-a-chef-finance'

export type TakeAChefCommandCenterLead = {
  inquiryId: string
  clientName: string
  status: 'new' | 'awaiting_chef'
  createdAt: string
  ageHours: number
  occasion: string | null
  date: string | null
  location: string | null
  guestCount: number | null
  nextActionRequired: string | null
  externalLink: string | null
  isStale: boolean
}

export type TakeAChefCommandCenterBooking = {
  eventId: string
  inquiryId: string | null
  clientName: string
  eventDate: string
  status: string
  occasion: string | null
  grossBookingCents: number | null
  expectedNetPayoutCents: number | null
  payoutAmountCents: number | null
  payoutStatus: string
  commissionState: string
  externalLink: string | null
}

export type TakeAChefCommandCenterWorkflowItem = {
  inquiryId: string
  eventId: string | null
  clientName: string
  status: string
  workflowType: 'proposal_follow_up' | 'menu_follow_up'
  capturedAt: string | null
  eventDate: string | null
  amountCents: number | null
  nextActionRequired: string | null
  externalLink: string | null
}

export type TakeAChefCommandCenterData = {
  summary: {
    untouchedLeadCount: number
    awaitingChefCount: number
    staleLeadCount: number
    proposalFollowUpCount: number
    menuFollowUpCount: number
    upcomingBookingCount: number
    payoutWatchCount: number
    commissionMismatchCount: number
  }
  leads: TakeAChefCommandCenterLead[]
  proposalFollowUps: TakeAChefCommandCenterWorkflowItem[]
  menuFollowUps: TakeAChefCommandCenterWorkflowItem[]
  upcomingBookings: TakeAChefCommandCenterBooking[]
  payoutWatchlist: TakeAChefCommandCenterBooking[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function extractTakeAChefWorkflow(unknownFields: unknown) {
  const root = asRecord(unknownFields)
  const workflow = asRecord(root?.take_a_chef_workflow)

  return {
    proposalCapturedAt:
      typeof workflow?.proposal_captured_at === 'string' ? workflow.proposal_captured_at : null,
    proposalAmountCents:
      typeof workflow?.proposal_amount_cents === 'number' ? workflow.proposal_amount_cents : null,
    menuCapturedAt:
      typeof workflow?.menu_captured_at === 'string' ? workflow.menu_captured_at : null,
    menuSeen: workflow?.menu_seen === true,
  }
}

export async function getTakeAChefCommandCenter(): Promise<TakeAChefCommandCenterData> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: inquiries }, { data: tenantSettings }] = await Promise.all([
    supabase
      .from('inquiries')
      .select(
        `
        id, status, created_at, first_contact_at, confirmed_occasion, confirmed_date,
        confirmed_location, confirmed_guest_count, next_action_required,
        external_link, unknown_fields, converted_to_event_id,
        client:clients(full_name)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('channel', 'take_a_chef')
      .in('status', ['new', 'awaiting_chef', 'confirmed', 'awaiting_client', 'quoted'])
      .order('created_at', { ascending: false }),
    supabase
      .from('tenant_settings')
      .select('integration_connection_settings')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ])

  const allInquiries = inquiries ?? []
  const leadRows = allInquiries.filter(
    (inquiry: any) => inquiry.status === 'new' || inquiry.status === 'awaiting_chef'
  )

  const leads = leadRows
    .map((inquiry: any) => {
      const ageHours = Math.floor((now - new Date(inquiry.created_at).getTime()) / 3600000)
      const client = Array.isArray(inquiry.client) ? inquiry.client[0] : inquiry.client
      return {
        inquiryId: inquiry.id,
        clientName: client?.full_name ?? 'Unknown',
        status: inquiry.status,
        createdAt: inquiry.created_at,
        ageHours,
        occasion: inquiry.confirmed_occasion ?? null,
        date: inquiry.confirmed_date ?? null,
        location: inquiry.confirmed_location ?? null,
        guestCount: inquiry.confirmed_guest_count ?? null,
        nextActionRequired: inquiry.next_action_required ?? null,
        externalLink: inquiry.external_link ?? null,
        isStale: inquiry.status === 'new' && ageHours > 24,
      } satisfies TakeAChefCommandCenterLead
    })
    .sort((a: TakeAChefCommandCenterLead, b: TakeAChefCommandCenterLead) => b.ageHours - a.ageHours)

  const proposalFollowUps = allInquiries
    .map((inquiry: any) => {
      const workflow = extractTakeAChefWorkflow(inquiry.unknown_fields)
      if (
        inquiry.status !== 'quoted' &&
        !(
          workflow.proposalCapturedAt &&
          inquiry.status !== 'confirmed' &&
          inquiry.status !== 'declined' &&
          inquiry.status !== 'expired'
        )
      ) {
        return null
      }

      const client = Array.isArray(inquiry.client) ? inquiry.client[0] : inquiry.client
      return {
        inquiryId: inquiry.id,
        eventId: inquiry.converted_to_event_id ?? null,
        clientName: client?.full_name ?? 'Unknown',
        status: inquiry.status,
        workflowType: 'proposal_follow_up',
        capturedAt: workflow.proposalCapturedAt,
        eventDate: inquiry.confirmed_date ?? null,
        amountCents: inquiry.confirmed_budget_cents ?? workflow.proposalAmountCents,
        nextActionRequired: inquiry.next_action_required ?? 'Waiting for client reply',
        externalLink: inquiry.external_link ?? null,
      } satisfies TakeAChefCommandCenterWorkflowItem
    })
    .filter(
      (
        item: TakeAChefCommandCenterWorkflowItem | null
      ): item is TakeAChefCommandCenterWorkflowItem => item != null
    )
    .sort((a: TakeAChefCommandCenterWorkflowItem, b: TakeAChefCommandCenterWorkflowItem) => {
      const aTime = a.capturedAt ? new Date(a.capturedAt).getTime() : 0
      const bTime = b.capturedAt ? new Date(b.capturedAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 10)

  const menuFollowUps = allInquiries
    .map((inquiry: any) => {
      const workflow = extractTakeAChefWorkflow(inquiry.unknown_fields)
      if (!workflow.menuSeen) return null

      const client = Array.isArray(inquiry.client) ? inquiry.client[0] : inquiry.client
      return {
        inquiryId: inquiry.id,
        eventId: inquiry.converted_to_event_id ?? null,
        clientName: client?.full_name ?? 'Unknown',
        status: inquiry.status,
        workflowType: 'menu_follow_up',
        capturedAt: workflow.menuCapturedAt,
        eventDate: inquiry.confirmed_date ?? null,
        amountCents: inquiry.confirmed_budget_cents ?? workflow.proposalAmountCents,
        nextActionRequired:
          inquiry.next_action_required ??
          (inquiry.converted_to_event_id
            ? 'Finalize the captured marketplace menu in ChefFlow'
            : 'Review captured marketplace menu draft'),
        externalLink: inquiry.external_link ?? null,
      } satisfies TakeAChefCommandCenterWorkflowItem
    })
    .filter(
      (
        item: TakeAChefCommandCenterWorkflowItem | null
      ): item is TakeAChefCommandCenterWorkflowItem => item != null
    )
    .sort((a: TakeAChefCommandCenterWorkflowItem, b: TakeAChefCommandCenterWorkflowItem) => {
      const aTime = a.capturedAt ? new Date(a.capturedAt).getTime() : 0
      const bTime = b.capturedAt ? new Date(b.capturedAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 10)

  const linkedEventIds = Array.from(
    new Set(
      allInquiries
        .map((inquiry: any) => inquiry.converted_to_event_id)
        .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    )
  )

  if (linkedEventIds.length === 0) {
    return {
      summary: {
        untouchedLeadCount: leads.filter(
          (lead: TakeAChefCommandCenterLead) => lead.status === 'new'
        ).length,
        awaitingChefCount: leads.filter(
          (lead: TakeAChefCommandCenterLead) => lead.status === 'awaiting_chef'
        ).length,
        staleLeadCount: leads.filter((lead: TakeAChefCommandCenterLead) => lead.isStale).length,
        proposalFollowUpCount: proposalFollowUps.length,
        menuFollowUpCount: menuFollowUps.length,
        upcomingBookingCount: 0,
        payoutWatchCount: 0,
        commissionMismatchCount: 0,
      },
      leads,
      proposalFollowUps,
      menuFollowUps,
      upcomingBookings: [],
      payoutWatchlist: [],
    }
  }

  const [{ data: events }, { data: expenses }] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, inquiry_id, event_date, status, occasion, quoted_price_cents, client:clients(full_name)'
      )
      .eq('tenant_id', tenantId)
      .in('id', linkedEventIds),
    supabase
      .from('expenses')
      .select('event_id, amount_cents')
      .eq('tenant_id', tenantId)
      .eq('vendor_name', 'Take a Chef')
      .eq('category', 'professional_services')
      .in('event_id', linkedEventIds),
  ])

  const expenseTotals = new Map<string, number>()
  for (const expense of expenses ?? []) {
    if (!expense.event_id) continue
    expenseTotals.set(
      expense.event_id,
      (expenseTotals.get(expense.event_id) ?? 0) + (expense.amount_cents ?? 0)
    )
  }

  const inquiryByEventId = new Map<string, any>()
  for (const inquiry of allInquiries) {
    if (inquiry.converted_to_event_id) inquiryByEventId.set(inquiry.converted_to_event_id, inquiry)
  }

  const bookings = (events ?? [])
    .map((event: any) => {
      const inquiry = inquiryByEventId.get(event.id)
      const financeMeta = extractTakeAChefFinanceMeta(inquiry?.unknown_fields ?? null)
      const defaultCommissionPercent = extractTakeAChefIntegrationSettings(
        tenantSettings?.integration_connection_settings ?? null,
        inquiry?.first_contact_at ?? null
      ).defaultCommissionPercent
      const finance = calculateTakeAChefFinanceSummary({
        grossBookingCents: financeMeta.grossBookingCents ?? event.quoted_price_cents ?? null,
        explicitCommissionPercent: financeMeta.commissionPercent,
        loggedCommissionCents: expenseTotals.get(event.id) ?? 0,
        payoutAmountCents: financeMeta.payoutAmountCents,
        payoutStatus: financeMeta.payoutStatus,
        payoutArrivalDate: financeMeta.payoutArrivalDate,
        payoutReference: financeMeta.payoutReference,
        notes: financeMeta.notes,
        updatedAt: financeMeta.updatedAt,
        defaultCommissionPercent,
      })
      const client = Array.isArray(event.client) ? event.client[0] : event.client

      return {
        eventId: event.id,
        inquiryId: inquiry?.id ?? null,
        clientName: client?.full_name ?? 'Unknown',
        eventDate: event.event_date,
        status: event.status,
        occasion: event.occasion ?? inquiry?.confirmed_occasion ?? null,
        grossBookingCents: finance.grossBookingCents,
        expectedNetPayoutCents: finance.expectedNetPayoutCents,
        payoutAmountCents: finance.payoutAmountCents,
        payoutStatus: finance.payoutStatus,
        commissionState: finance.commissionState,
        externalLink: inquiry?.external_link ?? null,
      } satisfies TakeAChefCommandCenterBooking
    })
    .sort((a: TakeAChefCommandCenterBooking, b: TakeAChefCommandCenterBooking) =>
      a.eventDate.localeCompare(b.eventDate)
    )

  const upcomingBookings = bookings
    .filter((booking: TakeAChefCommandCenterBooking) => booking.eventDate >= today)
    .slice(0, 10)
  const payoutWatchlist = bookings
    .filter(
      (booking: TakeAChefCommandCenterBooking) =>
        booking.payoutStatus !== 'paid' ||
        booking.commissionState === 'missing' ||
        booking.commissionState === 'mismatch'
    )
    .slice(0, 10)

  return {
    summary: {
      untouchedLeadCount: leads.filter((lead: TakeAChefCommandCenterLead) => lead.status === 'new')
        .length,
      awaitingChefCount: leads.filter(
        (lead: TakeAChefCommandCenterLead) => lead.status === 'awaiting_chef'
      ).length,
      staleLeadCount: leads.filter((lead: TakeAChefCommandCenterLead) => lead.isStale).length,
      proposalFollowUpCount: proposalFollowUps.length,
      menuFollowUpCount: menuFollowUps.length,
      upcomingBookingCount: upcomingBookings.length,
      payoutWatchCount: payoutWatchlist.length,
      commissionMismatchCount: payoutWatchlist.filter(
        (booking: TakeAChefCommandCenterBooking) => booking.commissionState === 'mismatch'
      ).length,
    },
    leads,
    proposalFollowUps,
    menuFollowUps,
    upcomingBookings,
    payoutWatchlist,
  }
}
