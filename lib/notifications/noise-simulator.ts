import type { ChannelSet } from './tier-config'
import {
  applySignalChannelPolicy,
  getSignalPolicy,
  type SignalAttentionClass,
  type SignalDeliveryDecision,
  type SignalRisk,
} from './signal-os'
import type { NotificationAction } from './types'

export type ChefSignalContext = {
  duplicateKey?: string
  alreadyHandled?: boolean
  chefCurrentlyViewingContext?: boolean
  hoursUntilEvent?: number | null
  activeEventLinked?: boolean
  sourceFailure?: boolean
}

export type ChefSignal = {
  id: string
  action: NotificationAction
  title: string
  body?: string
  occurredAt: string
  eventId?: string
  inquiryId?: string
  clientId?: string
  staffId?: string
  vendorId?: string
  moneyAmountCents?: number
  context?: ChefSignalContext
}

export type EvaluatedChefSignal = ChefSignal & {
  attention: SignalAttentionClass
  risk: SignalRisk
  decision: SignalDeliveryDecision
  channels: ChannelSet
  requiredAction: string | null
  reasons: string[]
}

export type NoiseSimulationResult = {
  rawSignalCount: number
  deliveredCount: number
  suppressedCount: number
  batchedCount: number
  archivedCount: number
  smsCount: number
  pushCount: number
  emailCount: number
  requiredDecisions: string[]
  evaluatedSignals: EvaluatedChefSignal[]
}

export type NoiseSimulationOptions = {
  duplicateWindowMinutes?: number
  now?: Date
}

function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000
}

function isRecentDuplicate(
  signal: ChefSignal,
  previous: EvaluatedChefSignal[],
  duplicateWindowMinutes: number
): boolean {
  const duplicateKey =
    signal.context?.duplicateKey ??
    `${signal.action}:${signal.eventId ?? ''}:${signal.inquiryId ?? ''}:${signal.clientId ?? ''}`

  return previous.some((item) => {
    const itemKey =
      item.context?.duplicateKey ??
      `${item.action}:${item.eventId ?? ''}:${item.inquiryId ?? ''}:${item.clientId ?? ''}`
    return (
      itemKey === duplicateKey &&
      minutesBetween(item.occurredAt, signal.occurredAt) <= duplicateWindowMinutes
    )
  })
}

function shouldEscalateForTiming(
  risk: SignalRisk,
  hoursUntilEvent: number | null | undefined
): boolean {
  if (hoursUntilEvent === null || hoursUntilEvent === undefined) return false
  if (risk === 'safety' && hoursUntilEvent <= 24 * 14) return true
  if (risk === 'money' && hoursUntilEvent <= 24 * 7) return true
  if (risk === 'service' && hoursUntilEvent <= 72) return true
  return false
}

function decisionForAttention(attention: SignalAttentionClass): SignalDeliveryDecision {
  switch (attention) {
    case 'interrupt':
    case 'decide':
      return 'deliver_now'
    case 'do':
    case 'review':
      return 'batch'
    case 'archive':
      return 'archive'
    case 'suppress':
      return 'suppress'
  }
}

export function evaluateChefSignal(
  signal: ChefSignal,
  previousSignals: EvaluatedChefSignal[] = [],
  options: NoiseSimulationOptions = {}
): EvaluatedChefSignal {
  const duplicateWindowMinutes = options.duplicateWindowMinutes ?? 15
  const policy = getSignalPolicy(signal.action)
  const reasons: string[] = [policy.why]
  let decision = decisionForAttention(policy.attention)
  let channels = applySignalChannelPolicy(signal.action, policy.defaultChannels)
  let attention = policy.attention

  if (signal.context?.alreadyHandled) {
    decision = 'suppress'
    attention = 'suppress'
    channels = { email: false, push: false, sms: false }
    reasons.push('Suppressed because the required action is already complete.')
  } else if (isRecentDuplicate(signal, previousSignals, duplicateWindowMinutes)) {
    decision = 'suppress'
    attention = 'suppress'
    channels = { email: false, push: false, sms: false }
    reasons.push(`Suppressed as a duplicate within ${duplicateWindowMinutes} minutes.`)
  } else if (signal.context?.chefCurrentlyViewingContext && policy.risk !== 'safety') {
    decision = 'archive'
    attention = 'archive'
    channels = { email: false, push: false, sms: false }
    reasons.push('Archived because the chef is already viewing the relevant context.')
  } else if (shouldEscalateForTiming(policy.risk, signal.context?.hoursUntilEvent)) {
    decision = 'escalate'
    attention = 'interrupt'
    channels.push = true
    if (policy.risk === 'safety') channels.sms = true
    reasons.push('Escalated because the signal affects an imminent event window.')
  }

  if (signal.action === 'low_stock' && !signal.context?.activeEventLinked) {
    channels.sms = false
    if (decision === 'deliver_now') decision = 'batch'
    reasons.push('Low-stock signal is not linked to an active event, so SMS is blocked.')
  }

  return {
    ...signal,
    attention,
    risk: policy.risk,
    decision,
    channels,
    requiredAction: policy.requiresAction ? signal.title : null,
    reasons,
  }
}

export function simulateNoiseScenario(
  signals: ChefSignal[],
  options: NoiseSimulationOptions = {}
): NoiseSimulationResult {
  const evaluatedSignals: EvaluatedChefSignal[] = []

  for (const signal of signals) {
    evaluatedSignals.push(evaluateChefSignal(signal, evaluatedSignals, options))
  }

  const delivered = evaluatedSignals.filter(
    (signal) => signal.decision === 'deliver_now' || signal.decision === 'escalate'
  )
  const batched = evaluatedSignals.filter((signal) => signal.decision === 'batch')
  const suppressed = evaluatedSignals.filter((signal) => signal.decision === 'suppress')
  const archived = evaluatedSignals.filter((signal) => signal.decision === 'archive')

  return {
    rawSignalCount: signals.length,
    deliveredCount: delivered.length,
    suppressedCount: suppressed.length,
    batchedCount: batched.length,
    archivedCount: archived.length,
    smsCount: evaluatedSignals.filter((signal) => signal.channels.sms).length,
    pushCount: evaluatedSignals.filter((signal) => signal.channels.push).length,
    emailCount: evaluatedSignals.filter((signal) => signal.channels.email).length,
    requiredDecisions: evaluatedSignals
      .filter((signal) => signal.requiredAction && signal.decision !== 'suppress')
      .map((signal) => signal.requiredAction as string),
    evaluatedSignals,
  }
}

export function createDefaultEventDaySimulation(): ChefSignal[] {
  const baseDate = '2026-05-01'
  return [
    {
      id: 'calendar-conflict',
      action: 'reminder_fired',
      title: 'Personal calendar conflict with grocery pickup',
      occurredAt: `${baseDate}T05:45:00-04:00`,
    },
    {
      id: 'daily-brief',
      action: 'goal_weekly_digest',
      title: 'Daily operating brief ready',
      occurredAt: `${baseDate}T06:30:00-04:00`,
    },
    {
      id: 'new-inquiry',
      action: 'new_inquiry',
      title: 'New private dinner inquiry',
      occurredAt: `${baseDate}T07:05:00-04:00`,
      inquiryId: 'inq_1',
      context: { duplicateKey: 'lead:inq_1' },
    },
    {
      id: 'new-inquiry-email-copy',
      action: 'inquiry_reply',
      title: 'Email copy of new inquiry',
      occurredAt: `${baseDate}T07:08:00-04:00`,
      inquiryId: 'inq_1',
      context: { duplicateKey: 'lead:inq_1' },
    },
    {
      id: 'quote-viewed',
      action: 'client_viewed_quote',
      title: 'Client viewed quote',
      occurredAt: `${baseDate}T07:30:00-04:00`,
      clientId: 'client_1',
      context: { duplicateKey: 'quote:view:client_1' },
    },
    {
      id: 'staff-confirmed',
      action: 'staff_assignment',
      title: 'Staff member confirmed tonight',
      occurredAt: `${baseDate}T08:15:00-04:00`,
      staffId: 'staff_1',
      context: { alreadyHandled: true },
    },
    {
      id: 'vendor-delay',
      action: 'order_status',
      title: 'Fish delivery delayed',
      occurredAt: `${baseDate}T08:40:00-04:00`,
      vendorId: 'vendor_1',
      context: { hoursUntilEvent: 9, activeEventLinked: true },
    },
    {
      id: 'allergy-change',
      action: 'client_allergy_changed',
      title: 'Guest added shellfish allergy',
      occurredAt: `${baseDate}T09:10:00-04:00`,
      eventId: 'event_1',
      context: { hoursUntilEvent: 8, duplicateKey: 'event_1:allergy' },
    },
    {
      id: 'allergy-email-copy',
      action: 'guest_dietary_alert',
      title: 'Email copy of shellfish allergy',
      occurredAt: `${baseDate}T09:12:00-04:00`,
      eventId: 'event_1',
      context: { hoursUntilEvent: 8, duplicateKey: 'event_1:allergy' },
    },
    {
      id: 'payment-received',
      action: 'payment_received',
      title: 'Payment received for next week',
      occurredAt: `${baseDate}T10:00:00-04:00`,
      moneyAmountCents: 120000,
    },
    {
      id: 'low-stock',
      action: 'low_stock',
      title: 'Low stock: parchment paper',
      occurredAt: `${baseDate}T10:35:00-04:00`,
      context: { activeEventLinked: false },
    },
    {
      id: 'social-lead',
      action: 'new_guest_lead',
      title: 'Social DM asks for availability',
      occurredAt: `${baseDate}T11:20:00-04:00`,
    },
    {
      id: 'briefing-unopened',
      action: 'task_assigned',
      title: 'Staff briefing not opened',
      occurredAt: `${baseDate}T12:15:00-04:00`,
      context: { hoursUntilEvent: 5, activeEventLinked: true },
    },
    {
      id: 'receipt-missing',
      action: 'reminder_fired',
      title: 'Yesterday receipt missing',
      occurredAt: `${baseDate}T13:00:00-04:00`,
    },
    {
      id: 'missing-address',
      action: 'event_reminder_1d',
      title: "Tomorrow's event has no address",
      occurredAt: `${baseDate}T14:30:00-04:00`,
      context: { hoursUntilEvent: 25, activeEventLinked: true },
    },
    {
      id: 'missing-access',
      action: 'event_reminder_1d',
      title: 'Tonight access notes missing',
      occurredAt: `${baseDate}T15:00:00-04:00`,
      eventId: 'event_1',
      context: { hoursUntilEvent: 2, activeEventLinked: true },
    },
    {
      id: 'gate-code',
      action: 'new_message',
      title: 'Client sent gate code',
      occurredAt: `${baseDate}T16:15:00-04:00`,
      context: { chefCurrentlyViewingContext: true },
    },
    {
      id: 'leave-now',
      action: 'reminder_fired',
      title: 'Leave now for dinner service',
      occurredAt: `${baseDate}T17:00:00-04:00`,
      eventId: 'event_1',
      context: { hoursUntilEvent: 1, activeEventLinked: true },
    },
    {
      id: 'guest-count-change',
      action: 'guest_count_changed',
      title: 'Guest count changed from 10 to 12',
      occurredAt: `${baseDate}T18:20:00-04:00`,
      eventId: 'event_1',
      context: { hoursUntilEvent: 0, activeEventLinked: true },
    },
    {
      id: 'thank-you',
      action: 'new_message',
      title: 'Guest says thank you',
      occurredAt: `${baseDate}T20:45:00-04:00`,
      context: { chefCurrentlyViewingContext: true },
    },
    {
      id: 'event-complete',
      action: 'event_completed',
      title: 'Event completed, closeout needed',
      occurredAt: `${baseDate}T22:20:00-04:00`,
      eventId: 'event_1',
    },
  ]
}
