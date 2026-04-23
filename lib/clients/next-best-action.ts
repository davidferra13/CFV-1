'use server'

import {
  compareActionGraphActions,
  getChefBookingAction,
  getChefInquiryAction,
  getChefQuoteAction,
  type ActionGraphAction,
  type BookingAction,
  type BookingActionSource,
} from '@/lib/action-graph/bookings'
import type { ClientActionType } from '@/lib/clients/action-vocabulary'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getLatestPendingClientGuestCountChangeMap } from '@/lib/guests/count-changes'
import { getClientHealthScores } from './health-score'
import { getClientInteractionSignalMap } from './interaction-signals'
import {
  selectNextBestAction,
  type BookingBlockerOverride,
  type GraphActionOverride,
  type NextBestAction,
  type NextBestActionPrimarySignal,
} from './next-best-action-core'

export type {
  BookingBlockerOverride,
  GraphActionOverride,
  NextBestAction,
  NextBestActionPrimarySignal,
  NextBestActionReason,
} from './next-best-action-core'

type BookingActionEventRow = {
  id: string
  client_id: string | null
  occasion: string | null
  event_date: string | null
  status: string
  menu_approval_status: string | null
  menu_modified_after_approval: boolean | null
}

type ContractRow = {
  event_id: string
  status: string | null
  signed_at: string | null
  created_at: string
}

type InquiryGraphRow = {
  id: string
  client_id: string | null
  status: string
  confirmed_occasion: string | null
  confirmed_date: string | null
  follow_up_due_at: string | null
  next_action_required: string | null
}

type QuoteGraphRow = {
  id: string
  client_id: string | null
  inquiry_id: string | null
  event_id: string | null
  status: string
  quote_name: string | null
  valid_until: string | null
  sent_at: string | null
  rejected_reason: string | null
  pricing_model: string | null
  guest_count_estimated: number | null
  total_quoted_cents: number | null
  price_per_person_cents: number | null
  deposit_required: boolean | null
  deposit_amount_cents: number | null
  deposit_percentage: number | null
  pricing_notes: string | null
  internal_notes: string | null
  is_superseded: boolean | null
  inquiry:
    | {
        confirmed_occasion?: string | null
        confirmed_date?: string | null
        confirmed_guest_count?: number | null
      }
    | null
  event:
    | {
        occasion?: string | null
        event_date?: string | null
      }
    | null
}

type NextBestActionOptions = {
  limit: number
  clientId?: string
}

const URGENCY_ORDER: NextBestAction['urgency'][] = ['critical', 'high', 'normal', 'low']

function urgencyRank(urgency: NextBestAction['urgency']): number {
  return URGENCY_ORDER.indexOf(urgency)
}

function getInterventionLabel(action: ActionGraphAction): string | null {
  if (!action.intervention) return null
  return action.intervention.mode === 'prepare' ? 'Prepared draft' : 'Approval required'
}

function isBookingBlockerAction(action: ActionGraphAction): action is BookingAction {
  if (action.entityType !== 'event') return false

  switch (action.kind) {
    case 'proposal_review':
    case 'contract_send':
    case 'contract_sign':
    case 'deposit_payment':
    case 'guest_count_review':
    case 'menu_review':
    case 'menu_revision':
      return true
    default:
      return false
  }
}

function toGraphActionOverride(action: ActionGraphAction): GraphActionOverride | null {
  const projection = action.chef
  if (!projection) return null

  let actionType: ClientActionType
  let primarySignal: NextBestActionPrimarySignal

  switch (action.kind) {
    case 'inquiry_reply':
      actionType = 'reply_inquiry'
      primarySignal = 'awaiting_chef_reply'
      break
    case 'quote_follow_up':
      actionType = 'follow_up_quote'
      primarySignal = 'quote_expiring_soon'
      break
    case 'quote_revision':
      actionType = 'quote_revision'
      primarySignal = 'quote_revision_ready'
      break
    default:
      return null
  }

  return {
    actionId: action.id,
    entityType: action.entityType,
    entityId: action.entityId,
    actionKind: action.kind,
    actionSource: action.source,
    evidence: action.evidence,
    label: projection.label,
    description: projection.description,
    href: projection.href,
    urgency:
      action.urgency === 'critical' ? 'critical' : action.urgency === 'high' ? 'high' : 'normal',
    actionType,
    primarySignal,
    intervention: action.intervention,
    interventionLabel: getInterventionLabel(action),
  }
}

function toBookingBlockerOverride(action: ActionGraphAction): BookingBlockerOverride | null {
  const projection = action.chef
  if (!projection) return null
  if (!isBookingBlockerAction(action)) return null

  return {
    actionId: action.id,
    eventId: action.eventId ?? action.entityId,
    bookingSource: action.source as BookingActionSource,
    evidence: action.evidence,
    label: projection.label,
    description: projection.description,
    href: projection.href,
    urgency:
      action.urgency === 'critical' ? 'critical' : action.urgency === 'high' ? 'high' : 'normal',
    priority: action.priority,
    eventDate: action.eventDate,
  }
}

function pushCandidateAction(
  actionsByClientId: Map<string, ActionGraphAction>,
  clientId: string,
  action: ActionGraphAction | null
) {
  if (!action?.chef) return

  const current = actionsByClientId.get(clientId)
  if (!current || compareActionGraphActions(action, current) < 0) {
    actionsByClientId.set(clientId, action)
  }
}

async function loadClientChefActionGraph(params: {
  db: any
  tenantId: string
  clientIds: string[]
}): Promise<Map<string, ActionGraphAction>> {
  const { db, tenantId, clientIds } = params
  if (clientIds.length === 0) return new Map()

  const [
    { data: bookingEvents },
    { data: inquiryRows },
    { data: quoteRows },
  ] = await Promise.all([
    db
      .from('events')
      .select(
        'id, client_id, occasion, event_date, status, menu_approval_status, menu_modified_after_approval'
      )
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .in('status', ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress']),
    db
      .from('inquiries')
      .select(
        'id, client_id, status, confirmed_occasion, confirmed_date, follow_up_due_at, next_action_required'
      )
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .in('status', ['new', 'awaiting_chef']),
    db
      .from('quotes')
      .select(
        `
        id,
        client_id,
        inquiry_id,
        event_id,
        status,
        quote_name,
        valid_until,
        sent_at,
        rejected_reason,
        pricing_model,
        guest_count_estimated,
        total_quoted_cents,
        price_per_person_cents,
        deposit_required,
        deposit_amount_cents,
        deposit_percentage,
        pricing_notes,
        internal_notes,
        is_superseded,
        inquiry:inquiries(confirmed_occasion, confirmed_date, confirmed_guest_count),
        event:events(occasion, event_date)
      `
      )
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .in('status', ['sent', 'rejected']),
  ])

  const bookingRows = (bookingEvents ?? []) as BookingActionEventRow[]
  const eventIds = bookingRows.map((event) => event.id)

  const latestContractMap = new Map<string, { status: string | null; signedAt: string | null }>()
  let pendingGuestCountChangeMap = new Map<
    string,
    {
      id: string
      previousCount: number
      newCount: number
      requestedAt: string
    }
  >()

  if (eventIds.length > 0) {
    const { data: contractRows } = await db
      .from('event_contracts')
      .select('event_id, status, signed_at, created_at')
      .in('event_id', eventIds)
      .not('status', 'eq', 'voided')
      .order('created_at', { ascending: false })

    for (const row of (contractRows ?? []) as ContractRow[]) {
      const eventId = String(row.event_id)
      if (latestContractMap.has(eventId)) continue
      latestContractMap.set(eventId, {
        status: row.status ?? null,
        signedAt: row.signed_at ?? null,
      })
    }

    const pendingChanges = await getLatestPendingClientGuestCountChangeMap(eventIds)
    pendingGuestCountChangeMap = new Map(
      Array.from(pendingChanges.entries()).map(([eventId, change]) => [
        eventId,
        {
          id: change.id,
          previousCount: change.previous_count,
          newCount: change.new_count,
          requestedAt: change.created_at,
        },
      ])
    )
  }

  const actionsByClientId = new Map<string, ActionGraphAction>()

  for (const event of bookingRows) {
    if (!event.client_id) continue

    const contract = latestContractMap.get(event.id)
    const pendingGuestCountChange = pendingGuestCountChangeMap.get(event.id) ?? null
    pushCandidateAction(
      actionsByClientId,
      event.client_id,
      getChefBookingAction({
        id: event.id,
        status: event.status,
        occasion: event.occasion ?? null,
        event_date: event.event_date ?? null,
        hasContract: Boolean(contract),
        contractStatus: contract?.status ?? null,
        contractSignedAt: contract?.signedAt ?? null,
        menu_approval_status: event.menu_approval_status ?? null,
        menu_modified_after_approval: event.menu_modified_after_approval ?? null,
        pendingGuestCountChange,
      })
    )
  }

  for (const inquiry of (inquiryRows ?? []) as InquiryGraphRow[]) {
    if (!inquiry.client_id) continue
    pushCandidateAction(actionsByClientId, inquiry.client_id, getChefInquiryAction(inquiry))
  }

  for (const quote of (quoteRows ?? []) as QuoteGraphRow[]) {
    if (!quote.client_id) continue
    if (quote.status === 'rejected' && quote.is_superseded) continue
    pushCandidateAction(actionsByClientId, quote.client_id, getChefQuoteAction(quote))
  }

  return actionsByClientId
}

async function getNextBestActionsInternal(options: NextBestActionOptions): Promise<NextBestAction[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { scores } = await getClientHealthScores()
  const scopedScores = options.clientId
    ? scores.filter((score) => score.clientId === options.clientId)
    : scores
  if (scopedScores.length === 0) return []

  let clientsQuery = db
    .from('clients')
    .select('id, full_name, birthday, anniversary')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (options.clientId) {
    clientsQuery = clientsQuery.eq('id', options.clientId)
  } else {
    clientsQuery = clientsQuery.in(
      'id',
      scopedScores.map((score) => score.clientId)
    )
  }

  const { data: clients } = await clientsQuery
  const activeClients = (clients ?? []) as Array<{
    id: string
    full_name: string | null
    birthday: string | null
    anniversary: string | null
  }>
  if (activeClients.length === 0) return []

  const activeClientIds = activeClients.map((client) => client.id)
  const clientNameMap = new Map(
    activeClients.map((client) => [client.id, client.full_name || 'Unknown Client'])
  )
  const healthScoreByClientId = new Map(
    scopedScores
      .filter((score) => activeClientIds.includes(score.clientId))
      .map((score) => [score.clientId, score])
  )
  const milestoneByClientId = new Map(
    activeClients.map((client) => [
      client.id,
      {
        birthday: client.birthday ?? null,
        anniversary: client.anniversary ?? null,
      },
    ])
  )

  const [chefActionGraph, signalMap] = await Promise.all([
    loadClientChefActionGraph({
      db,
      tenantId: user.tenantId!,
      clientIds: activeClientIds,
    }),
    getClientInteractionSignalMap(activeClientIds, {
      healthScoreByClientId,
      milestoneByClientId,
    }),
  ])

  const actions: NextBestAction[] = []

  for (const client of activeClients) {
    const healthScore = healthScoreByClientId.get(client.id)
    if (!healthScore) continue

    const topGraphAction = chefActionGraph.get(client.id) ?? null
    const bookingBlocker = topGraphAction ? toBookingBlockerOverride(topGraphAction) : null
    const graphAction =
      !bookingBlocker && topGraphAction ? toGraphActionOverride(topGraphAction) : null

    const nextAction = selectNextBestAction({
      clientId: client.id,
      clientName: clientNameMap.get(client.id) ?? 'Unknown Client',
      healthScore,
      bookingBlocker,
      graphAction,
      signals: signalMap.get(client.id)?.ordered ?? [],
    })

    if (nextAction) actions.push(nextAction)
  }

  actions.sort((left, right) => {
    const urgencyDiff = urgencyRank(left.urgency) - urgencyRank(right.urgency)
    if (urgencyDiff !== 0) return urgencyDiff
    return right.healthScore - left.healthScore
  })

  return actions.slice(0, options.limit)
}

export async function getNextBestActions(limit = 10): Promise<NextBestAction[]> {
  return getNextBestActionsInternal({ limit })
}

export async function getClientNextBestAction(clientId: string): Promise<NextBestAction | null> {
  const actions = await getNextBestActionsInternal({ limit: 1, clientId })
  return actions[0] ?? null
}
