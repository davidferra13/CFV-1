import type {
  ActionGraphEntityType,
  ActionGraphIntervention,
  ActionGraphKind,
  ActionGraphSource,
  BookingActionSource,
} from '@/lib/action-graph/bookings'
import { getClientActionDefinition, type ClientActionType, type ClientActionUrgency } from './action-vocabulary'
import type { ClientHealthScore, ClientHealthTier } from './health-score'
import type {
  ClientInteractionSignal,
  ClientInteractionSignalReason,
  ClientInteractionSignalType,
} from './interaction-signals'

export type NextBestActionPrimarySignal =
  | ClientInteractionSignalType
  | 'booking_blocker_active'
  | 'quote_revision_ready'

export type NextBestActionReason =
  | ClientInteractionSignalReason
  | {
      code: string
      message: string
      sourceType: 'booking_blocker'
      sourceId: string
      eventId: string
      bookingSource: BookingActionSource
      evidence: string[]
    }
  | {
      code: string
      message: string
      sourceType: 'action_graph'
      sourceId: string
      entityType: ActionGraphEntityType
      entityId: string
      actionKind: ActionGraphKind
      actionSource: ActionGraphSource
      evidence: string[]
    }

export type NextBestAction = {
  clientId: string
  clientName: string
  actionType: ClientActionType
  label: string
  description: string
  href: string
  urgency: ClientActionUrgency
  tier: ClientHealthTier
  healthScore: number
  primarySignal: NextBestActionPrimarySignal
  reasons: NextBestActionReason[]
  interventionLabel: string | null
}

export type BookingBlockerOverride = {
  actionId: string
  eventId: string
  bookingSource: BookingActionSource
  evidence: string[]
  label: string
  description: string
  href: string
  urgency: ClientActionUrgency
  priority: number
  eventDate: string | null
}

export type GraphActionOverride = {
  actionId: string
  entityType: ActionGraphEntityType
  entityId: string
  actionKind: ActionGraphKind
  actionSource: ActionGraphSource
  evidence: string[]
  label: string
  description: string
  href: string
  urgency: ClientActionUrgency
  actionType: ClientActionType
  primarySignal: NextBestActionPrimarySignal
  intervention: ActionGraphIntervention | null
  interventionLabel: string | null
}

const SIGNAL_PRECEDENCE: ClientInteractionSignalType[] = [
  'awaiting_chef_reply',
  'quote_viewed_without_response',
  'quote_expiring_soon',
  'milestone_upcoming',
  'relationship_at_risk',
  'relationship_champion',
  'relationship_dormant',
  'first_event_conversion_needed',
]

function buildRelationshipHref(clientId: string): string {
  return `/clients/${clientId}/relationship`
}

function dedupeReasons(reasons: NextBestActionReason[]): NextBestActionReason[] {
  const seen = new Set<string>()
  const deduped: NextBestActionReason[] = []

  for (const reason of reasons) {
    const key =
      reason.sourceType === 'booking_blocker'
        ? `${reason.sourceType}:${reason.sourceId}:${reason.code}`
        : reason.sourceType === 'action_graph'
          ? `${reason.sourceType}:${reason.sourceId}:${reason.code}`
        : `${reason.sourceType}:${reason.sourceId}:${reason.code}:${reason.ledgerEntryId ?? 'none'}`

    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(reason)
  }

  return deduped
}

function getSignalUrgency(signalType: ClientInteractionSignalType): ClientActionUrgency {
  switch (signalType) {
    case 'awaiting_chef_reply':
      return 'critical'
    case 'quote_viewed_without_response':
    case 'quote_expiring_soon':
    case 'milestone_upcoming':
    case 'relationship_at_risk':
      return 'high'
    case 'relationship_champion':
    case 'relationship_dormant':
    case 'first_event_conversion_needed':
      return 'normal'
  }
}

function buildSignalDescription(
  signal: ClientInteractionSignal,
  healthScore: ClientHealthScore
): string {
  switch (signal.type) {
    case 'awaiting_chef_reply':
      return 'This inquiry is still waiting on your reply.'
    case 'quote_viewed_without_response':
      return 'The client viewed the quote, but no later client response is recorded.'
    case 'quote_expiring_soon': {
      const daysUntil = signal.context.daysUntil
      if (daysUntil === null || daysUntil === undefined) {
        return 'A sent quote is expiring soon.'
      }
      return `The latest sent quote expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`
    }
    case 'milestone_upcoming': {
      const milestoneType = signal.context.milestoneType
      const daysUntil = signal.context.daysUntil
      if (!milestoneType || daysUntil === null || daysUntil === undefined) {
        return 'A client milestone is coming up soon.'
      }
      return `Their ${milestoneType} is in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`
    }
    case 'relationship_at_risk':
      return `No event in ${healthScore.daysSinceLastEvent ?? '?'} days, time to reconnect.`
    case 'relationship_champion':
      return 'This is one of your strongest relationships, ideal for a referral ask.'
    case 'relationship_dormant':
      return `This client has gone dormant after ${healthScore.daysSinceLastEvent ?? '?'} days without an event.`
    case 'first_event_conversion_needed':
      return 'This client still has no recorded event history, convert the first booking.'
  }
}

function buildActionFromSignal(params: {
  clientId: string
  clientName: string
  healthScore: ClientHealthScore
  primarySignal: ClientInteractionSignal
  supportingSignals: ClientInteractionSignal[]
}): NextBestAction {
  const { clientId, clientName, healthScore, primarySignal, supportingSignals } = params
  const definition = getClientActionDefinition(primarySignal.actionType)
  const reasons = dedupeReasons([
    ...primarySignal.reasons,
    ...supportingSignals.flatMap((signal) => signal.reasons),
  ])

  let href = buildRelationshipHref(clientId)

  if (primarySignal.type === 'awaiting_chef_reply') {
    href = primarySignal.context.href ?? '/inquiries'
  }

  return {
    clientId,
    clientName,
    actionType: primarySignal.actionType,
    label: definition.defaultLabel,
    description: buildSignalDescription(primarySignal, healthScore),
    href,
    urgency: getSignalUrgency(primarySignal.type),
    tier: healthScore.tier,
    healthScore: healthScore.score,
    primarySignal: primarySignal.type,
    reasons,
    interventionLabel: null,
  }
}

function buildBookingBlockerAction(params: {
  clientId: string
  clientName: string
  healthScore: ClientHealthScore
  bookingBlocker: BookingBlockerOverride
}): NextBestAction {
  const { clientId, clientName, healthScore, bookingBlocker } = params

  return {
    clientId,
    clientName,
    actionType: 'booking_blocker',
    label: bookingBlocker.label,
    description: bookingBlocker.description,
    href: bookingBlocker.href,
    urgency: bookingBlocker.urgency,
    tier: healthScore.tier,
    healthScore: healthScore.score,
    primarySignal: 'booking_blocker_active',
    reasons: [
      {
        code: 'booking_blocker_active',
        message: 'A live booking handoff is blocked on the canonical booking action graph.',
        sourceType: 'booking_blocker',
        sourceId: bookingBlocker.actionId,
        eventId: bookingBlocker.eventId,
        bookingSource: bookingBlocker.bookingSource,
        evidence: bookingBlocker.evidence,
      },
    ],
    interventionLabel: null,
  }
}

function buildGraphAction(params: {
  clientId: string
  clientName: string
  healthScore: ClientHealthScore
  graphAction: GraphActionOverride
  supportingSignals: ClientInteractionSignal[]
}): NextBestAction {
  const { clientId, clientName, healthScore, graphAction, supportingSignals } = params

  return {
    clientId,
    clientName,
    actionType: graphAction.actionType,
    label: graphAction.label,
    description: graphAction.description,
    href: graphAction.href,
    urgency: graphAction.urgency,
    tier: healthScore.tier,
    healthScore: healthScore.score,
    primarySignal: graphAction.primarySignal,
    reasons: dedupeReasons([
      {
        code: graphAction.primarySignal,
        message: graphAction.description,
        sourceType: 'action_graph',
        sourceId: graphAction.actionId,
        entityType: graphAction.entityType,
        entityId: graphAction.entityId,
        actionKind: graphAction.actionKind,
        actionSource: graphAction.actionSource,
        evidence: graphAction.evidence,
      },
      ...supportingSignals.flatMap((signal) => signal.reasons),
    ]),
    interventionLabel: graphAction.interventionLabel,
  }
}

export function selectNextBestAction(params: {
  clientId: string
  clientName: string
  healthScore: ClientHealthScore
  bookingBlocker?: BookingBlockerOverride | null
  graphAction?: GraphActionOverride | null
  signals: ClientInteractionSignal[]
}): NextBestAction | null {
  if (params.bookingBlocker) {
    return buildBookingBlockerAction({
      clientId: params.clientId,
      clientName: params.clientName,
      healthScore: params.healthScore,
      bookingBlocker: params.bookingBlocker,
    })
  }

  if (params.graphAction) {
    return buildGraphAction({
      clientId: params.clientId,
      clientName: params.clientName,
      healthScore: params.healthScore,
      graphAction: params.graphAction,
      supportingSignals: params.signals.filter(
        (signal) => signal.actionType === params.graphAction?.actionType
      ),
    })
  }

  const primarySignal = SIGNAL_PRECEDENCE.map((type) =>
    params.signals.find((signal) => signal.type === type)
  ).find(Boolean)

  if (!primarySignal) return null

  const supportingSignals = params.signals.filter(
    (signal) =>
      signal.type !== primarySignal.type && signal.actionType === primarySignal.actionType
  )

  return buildActionFromSignal({
    clientId: params.clientId,
    clientName: params.clientName,
    healthScore: params.healthScore,
    primarySignal,
    supportingSignals,
  })
}
