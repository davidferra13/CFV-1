'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildClientDependencySimulation } from './strategy'
import { buildClientContributionPortfolio, buildClientContributionSnapshot } from './scoring'
import type {
  ClientDependencySimulation,
  ClientContributionPortfolio,
  ClientContributionReviewState,
  ClientContributionSnapshot,
  ClientContributionTier,
} from './types'

const CONTRIBUTION_NOTE_SOURCE = 'client_contribution'
const CONTRIBUTION_NOTE_PREFIX = '[client-contribution-review]'

const ReviewStateSchema = z.object({
  status: z.enum(['needs_review', 'reviewed', 'dismissed', 'pinned']),
  reviewedAt: z.string().nullable().optional(),
  dismissedAt: z.string().nullable().optional(),
  dismissReason: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
  tierOverride: z
    .enum(['strategic', 'growth', 'steady', 'repair', 'unknown'])
    .nullable()
    .optional(),
  nextReviewDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
})

const DEFAULT_REVIEW_STATE: ClientContributionReviewState = {
  status: 'needs_review',
  reviewedAt: null,
  dismissedAt: null,
  dismissReason: null,
  pinned: false,
  tierOverride: null,
  nextReviewDate: null,
  note: null,
}

function parseReviewState(
  noteText: string | null | undefined
): ClientContributionReviewState | null {
  if (!noteText?.startsWith(CONTRIBUTION_NOTE_PREFIX)) return null
  const raw = noteText.slice(CONTRIBUTION_NOTE_PREFIX.length).trim()
  try {
    const parsed = ReviewStateSchema.parse(JSON.parse(raw))
    return {
      status: parsed.status,
      reviewedAt: parsed.reviewedAt ?? null,
      dismissedAt: parsed.dismissedAt ?? null,
      dismissReason: parsed.dismissReason ?? null,
      pinned: parsed.pinned ?? false,
      tierOverride: parsed.tierOverride ?? null,
      nextReviewDate: parsed.nextReviewDate ?? null,
      note: parsed.note ?? null,
    }
  } catch {
    return null
  }
}

function serializeReviewState(state: ClientContributionReviewState): string {
  return `${CONTRIBUTION_NOTE_PREFIX} ${JSON.stringify(state)}`
}

async function getReviewStateMap(
  db: any,
  tenantId: string,
  clientIds: string[]
): Promise<Map<string, ClientContributionReviewState>> {
  if (clientIds.length === 0) return new Map()

  const { data } = await db
    .from('client_notes')
    .select('client_id, note_text, created_at')
    .eq('tenant_id', tenantId)
    .in('client_id', clientIds)
    .eq('source', CONTRIBUTION_NOTE_SOURCE)
    .order('created_at', { ascending: false })

  const map = new Map<string, ClientContributionReviewState>()
  for (const row of data ?? []) {
    if (map.has(row.client_id)) continue
    const parsed = parseReviewState(row.note_text)
    if (parsed) map.set(row.client_id, parsed)
  }

  return map
}

async function getLatestReviewState(
  db: any,
  tenantId: string,
  clientId: string
): Promise<ClientContributionReviewState> {
  const { data } = await db
    .from('client_notes')
    .select('note_text')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('source', CONTRIBUTION_NOTE_SOURCE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return parseReviewState(data?.note_text) ?? DEFAULT_REVIEW_STATE
}

async function writeReviewState(
  db: any,
  input: {
    tenantId: string
    actorId: string
    clientId: string
    state: ClientContributionReviewState
  }
) {
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('id', input.clientId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (!client) {
    throw new Error('Client not found')
  }

  const { error } = await db.from('client_notes').insert({
    tenant_id: input.tenantId,
    client_id: input.clientId,
    note_text: serializeReviewState(input.state),
    category: 'relationship',
    pinned: input.state.pinned,
    source: CONTRIBUTION_NOTE_SOURCE,
  })

  if (error) {
    console.error('[writeClientContributionReviewState] Error:', error)
    throw new Error('Failed to save contribution review state')
  }

  revalidatePath('/clients/contribution')
  revalidatePath(`/clients/${input.clientId}`)
}

function eventFinancialByClient(events: any[], summaries: any[]) {
  const summaryByEventId = new Map(summaries.map((summary) => [summary.event_id, summary]))
  const byClient = new Map<string, any[]>()

  for (const event of events) {
    if (!event.client_id) continue
    const summary = summaryByEventId.get(event.id) ?? {}
    const list = byClient.get(event.client_id) ?? []
    list.push({
      eventId: event.id,
      eventDate: event.event_date ?? null,
      status: event.status ?? event.event_status ?? null,
      serviceStyle: event.service_style ?? null,
      occasion: event.occasion ?? null,
      guestCount: event.guest_count ?? null,
      locationCity: event.location_city ?? null,
      locationState: event.location_state ?? null,
      quotedPriceCents: event.quoted_price_cents ?? summary.quoted_price_cents ?? 0,
      totalPaidCents: summary.total_paid_cents ?? 0,
      totalExpensesCents: summary.total_expenses_cents ?? 0,
      netRevenueCents: summary.net_revenue_cents ?? 0,
      profitCents: summary.profit_cents ?? 0,
      profitMargin: summary.profit_margin ?? null,
      outstandingBalanceCents: summary.outstanding_balance_cents ?? 0,
    })
    byClient.set(event.client_id, list)
  }

  return byClient
}

export async function getClientContributionPortfolio(): Promise<ClientContributionPortfolio> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clients, error: clientsError } = await db
    .from('clients')
    .select(
      'id, full_name, email, status, created_at, referral_source, referral_source_detail, partner_name, preferred_event_days, preferred_service_style, automated_emails_enabled, communication_style_notes, communication_preference, referred_by_client_id, dinner_circle_group_id, recurring_pricing_model, referral_potential, red_flags, acquisition_cost_cents, complaint_handling_notes, payment_behavior, tipping_pattern, wow_factors'
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .order('full_name', { ascending: true })

  if (clientsError) {
    console.error('[getClientContributionPortfolio] Clients error:', clientsError)
    throw new Error('Could not load clients')
  }

  const clientIds = (clients ?? []).map((client: any) => client.id)
  const [financialsResult, eventsResult, reviewStates] = await Promise.all([
    clientIds.length > 0
      ? db
          .from('client_financial_summary')
          .select(
            'client_id, lifetime_value_cents, total_events_completed, average_spend_per_event, outstanding_balance_cents, last_event_date, days_since_last_event, is_dormant'
          )
          .eq('tenant_id', user.tenantId!)
          .in('client_id', clientIds)
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? db
          .from('events')
          .select(
            'id, client_id, event_date, status, event_status, quoted_price_cents, service_style, occasion, guest_count, location_city, location_state'
          )
          .eq('tenant_id', user.tenantId!)
          .in('client_id', clientIds)
          .is('deleted_at' as any, null)
      : Promise.resolve({ data: [] }),
    getReviewStateMap(db, user.tenantId!, clientIds),
  ])

  const eventIds = (eventsResult.data ?? []).map((event: any) => event.id)
  const summariesResult =
    eventIds.length > 0
      ? await db
          .from('event_financial_summary')
          .select(
            'event_id, tenant_id, quoted_price_cents, total_paid_cents, total_expenses_cents, net_revenue_cents, profit_cents, profit_margin, outstanding_balance_cents'
          )
          .eq('tenant_id', user.tenantId!)
          .in('event_id', eventIds)
      : { data: [] }

  const financialByClient = new Map(
    (financialsResult.data ?? []).map((row: any) => [row.client_id, row])
  )
  const eventByClient = eventFinancialByClient(eventsResult.data ?? [], summariesResult.data ?? [])

  const snapshots: ClientContributionSnapshot[] = (clients ?? []).map((client: any) =>
    buildClientContributionSnapshot({
      clientId: client.id,
      clientName: client.full_name ?? 'Unnamed client',
      email: client.email ?? null,
      status: client.status ?? null,
      acquisitionSource: client.referral_source ?? null,
      acquisitionSourceDetail: client.referral_source_detail ?? null,
      partnerName: client.partner_name ?? null,
      preferredEventDays: client.preferred_event_days ?? null,
      preferredServiceStyle: client.preferred_service_style ?? null,
      automatedEmailsEnabled: client.automated_emails_enabled ?? null,
      communicationStyleNotes: client.communication_style_notes ?? null,
      communicationPreference: client.communication_preference ?? null,
      referredByClientId: client.referred_by_client_id ?? null,
      dinnerCircleGroupId: client.dinner_circle_group_id ?? null,
      recurringPricingModel: client.recurring_pricing_model ?? null,
      referralPotential: client.referral_potential ?? null,
      createdAt: client.created_at ?? null,
      relationshipSignals: {
        redFlags: client.red_flags ?? null,
        paymentBehavior: client.payment_behavior ?? null,
        complaintHandlingNotes: client.complaint_handling_notes ?? null,
        tippingPattern: client.tipping_pattern ?? null,
        wowFactors: client.wow_factors ?? null,
        acquisitionCostCents: client.acquisition_cost_cents ?? null,
      },
      hasInternalAssessment: Boolean(
        client.red_flags ||
        client.acquisition_cost_cents ||
        client.complaint_handling_notes ||
        client.payment_behavior ||
        client.tipping_pattern ||
        client.wow_factors
      ),
      financials: financialByClient.get(client.id) ?? null,
      eventFinancials: eventByClient.get(client.id) ?? [],
      reviewState: reviewStates.get(client.id) ?? null,
    })
  )

  snapshots.sort((a, b) => {
    if (a.reviewState.pinned !== b.reviewState.pinned) return a.reviewState.pinned ? -1 : 1
    return b.contributionScore - a.contributionScore
  })

  return buildClientContributionPortfolio(snapshots)
}

export async function getClientContributionSnapshot(
  clientId: string
): Promise<ClientContributionSnapshot | null> {
  const portfolio = await getClientContributionPortfolio()
  return portfolio.snapshots.find((snapshot) => snapshot.clientId === clientId) ?? null
}

export async function getClientContributionProfileContext(clientId: string): Promise<{
  snapshot: ClientContributionSnapshot
  dependencySimulation: ClientDependencySimulation
} | null> {
  const portfolio = await getClientContributionPortfolio()
  const snapshot = portfolio.snapshots.find((item) => item.clientId === clientId)
  if (!snapshot) return null
  return {
    snapshot,
    dependencySimulation: buildClientDependencySimulation(portfolio, snapshot),
  }
}

export async function markClientContributionReviewed(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const current = await getLatestReviewState(db, user.tenantId!, clientId)
  await writeReviewState(db, {
    tenantId: user.tenantId!,
    actorId: user.id,
    clientId,
    state: {
      ...current,
      status: current.pinned ? 'pinned' : 'reviewed',
      reviewedAt: new Date().toISOString(),
      dismissedAt: null,
      dismissReason: null,
    },
  })
}

export async function dismissClientContribution(clientId: string, formData: FormData) {
  const user = await requireChef()
  const db: any = createServerClient()
  const reason = String(formData.get('reason') ?? '')
    .trim()
    .slice(0, 300)
  const current = await getLatestReviewState(db, user.tenantId!, clientId)
  await writeReviewState(db, {
    tenantId: user.tenantId!,
    actorId: user.id,
    clientId,
    state: {
      ...current,
      status: 'dismissed',
      dismissedAt: new Date().toISOString(),
      dismissReason: reason || 'Dismissed by chef',
    },
  })
}

export async function toggleClientContributionPinned(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()
  const current = await getLatestReviewState(db, user.tenantId!, clientId)
  const pinned = !current.pinned
  await writeReviewState(db, {
    tenantId: user.tenantId!,
    actorId: user.id,
    clientId,
    state: {
      ...current,
      pinned,
      status: pinned ? 'pinned' : current.reviewedAt ? 'reviewed' : 'needs_review',
    },
  })
}

export async function updateClientContributionReviewPlan(clientId: string, formData: FormData) {
  const user = await requireChef()
  const db: any = createServerClient()
  const tierValue = String(formData.get('tierOverride') ?? '')
  const tierOverride = tierValue === '' ? null : (tierValue as ClientContributionTier)
  const nextReviewDate = String(formData.get('nextReviewDate') ?? '').trim() || null
  const note =
    String(formData.get('note') ?? '')
      .trim()
      .slice(0, 500) || null
  const current = await getLatestReviewState(db, user.tenantId!, clientId)

  await writeReviewState(db, {
    tenantId: user.tenantId!,
    actorId: user.id,
    clientId,
    state: {
      ...current,
      status: current.pinned ? 'pinned' : 'reviewed',
      reviewedAt: current.reviewedAt ?? new Date().toISOString(),
      tierOverride,
      nextReviewDate,
      note,
    },
  })
}
