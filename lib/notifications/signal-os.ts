import { NOTIFICATION_CONFIG, type NotificationAction, type NotificationCategory } from './types'
import {
  DEFAULT_TIER_MAP,
  TIER_CHANNEL_DEFAULTS,
  type ChannelSet,
  type NotificationTier,
} from './tier-config'

export type SignalAttentionClass = 'interrupt' | 'decide' | 'do' | 'review' | 'archive' | 'suppress'

export type SignalCadence =
  | 'realtime'
  | 'daily_brief'
  | 'weekly_brief'
  | 'monthly_report'
  | 'quarterly_report'
  | 'yearly_report'
  | 'digest'
  | 'in_app'

export type SignalRisk =
  | 'safety'
  | 'money'
  | 'service'
  | 'relationship'
  | 'capacity'
  | 'reputation'
  | 'system'
  | 'growth'
  | 'admin'
  | 'none'

export type SignalSource =
  | 'client'
  | 'event'
  | 'payment'
  | 'staff'
  | 'vendor'
  | 'inventory'
  | 'social'
  | 'personal'
  | 'system'
  | 'marketplace'
  | 'loyalty'
  | 'directory'

export type SignalDeliveryDecision = 'deliver_now' | 'batch' | 'archive' | 'suppress' | 'escalate'

export type SignalPolicy = {
  action: NotificationAction
  category: NotificationCategory
  tier: NotificationTier
  attention: SignalAttentionClass
  cadence: SignalCadence
  risk: SignalRisk
  source: SignalSource
  sourceOfTruth: string
  defaultChannels: ChannelSet
  requiresAction: boolean
  digestGroup: string
  why: string
}

type SignalPolicyOverride = Partial<
  Pick<
    SignalPolicy,
    | 'attention'
    | 'cadence'
    | 'risk'
    | 'source'
    | 'sourceOfTruth'
    | 'defaultChannels'
    | 'requiresAction'
    | 'digestGroup'
    | 'why'
  >
>

const INTENT_ACTIONS = new Set<NotificationAction>([
  'client_on_payment_page',
  'client_viewed_quote',
  'quote_viewed_after_delay',
  'client_viewed_proposal',
  'client_portal_visit',
])

const SAFETY_ACTIONS = new Set<NotificationAction>([
  'guest_dietary_alert',
  'client_allergy_changed',
  'dietary_menu_conflict',
  'recall_alert_matched',
])

const MONEY_ACTIONS = new Set<NotificationAction>([
  'payment_received',
  'payment_failed',
  'payment_amount_mismatch',
  'payment_due_approaching',
  'payment_overdue',
  'dispute_created',
  'dispute_funds_withdrawn',
  'cancellation_pending_refund',
  'full_refund_active_event',
  'refund_processed',
  'refund_processed_to_client',
])

const REPORT_ACTIONS = new Set<NotificationAction>([
  'goal_weekly_digest',
  'quarterly_checkin_due',
  'no_education_logged_90d',
  'relationship_cooling',
])

const CLIENT_FACING_SIGNAL_ACTIONS = new Set<NotificationAction>([
  'quote_sent_to_client',
  'quote_expiring_soon',
  'event_proposed_to_client',
  'event_confirmed_to_client',
  'event_reminder_7d',
  'event_reminder_2d',
  'event_reminder_1d',
  'event_cancelled_to_client',
  'event_completed_to_client',
  'event_in_progress_to_client',
  'event_paid_to_client',
  'inquiry_quoted_to_client',
  'inquiry_converted_to_client',
  'inquiry_declined_to_client',
  'inquiry_expired_to_client',
  'meal_request_scheduled_to_client',
  'meal_request_declined_to_client',
  'meal_request_fulfilled_to_client',
  'meal_recommendation_sent_to_client',
  'new_chat_message_to_client',
  'refund_processed_to_client',
  'dispute_funds_withdrawn',
  'points_awarded',
  'tier_upgraded',
  'raffle_winner',
  'photos_ready',
])

const OVERRIDES: Partial<Record<NotificationAction, SignalPolicyOverride>> = {
  new_inquiry: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'growth',
    source: 'client',
    requiresAction: true,
    why: 'New inquiries are time-sensitive booking opportunities.',
  },
  wix_submission: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'growth',
    source: 'client',
    requiresAction: true,
    why: 'External submissions need fast triage before the lead cools.',
  },
  inquiry_reply: {
    attention: 'do',
    cadence: 'realtime',
    risk: 'growth',
    source: 'client',
    requiresAction: true,
    why: 'A client replied and may be waiting for the next booking step.',
  },
  follow_up_due: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'growth',
    source: 'client',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Follow-ups belong in an operating brief unless they are event-day blockers.',
  },
  quote_accepted: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'money',
    source: 'client',
    requiresAction: true,
    why: 'Accepted quotes create a booking and payment follow-through obligation.',
  },
  quote_rejected: {
    attention: 'review',
    cadence: 'digest',
    risk: 'growth',
    source: 'client',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Rejected quotes are useful pattern data, not an interruption.',
  },
  quote_expiring: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'growth',
    source: 'client',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Expiring quotes should be batched unless tied to an imminent event.',
  },
  proposal_accepted: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'money',
    source: 'client',
    requiresAction: true,
    why: 'Accepted proposals require payment and event confirmation follow-through.',
  },
  proposal_declined: {
    attention: 'review',
    cadence: 'digest',
    risk: 'growth',
    source: 'client',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Declined proposals should feed owner review without interrupting service.',
  },
  event_cancelled: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'money',
    source: 'event',
    requiresAction: true,
    why: 'Cancellations can create refund, staff, vendor, and calendar consequences.',
  },
  event_completed: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'admin',
    source: 'event',
    defaultChannels: { email: true, push: false, sms: false },
    requiresAction: true,
    why: 'Completed events should prompt closeout, receipts, notes, and follow-up.',
  },
  event_in_progress: {
    attention: 'archive',
    cadence: 'in_app',
    risk: 'service',
    source: 'event',
    defaultChannels: { email: false, push: false, sms: false },
    why: 'In-progress state is context unless a blocker appears.',
  },
  payment_received: {
    attention: 'review',
    cadence: 'realtime',
    risk: 'money',
    source: 'payment',
    defaultChannels: { email: false, push: true, sms: false },
    why: 'Payment receipts belong in the ledger; push is enough for awareness.',
  },
  payment_failed: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'money',
    source: 'payment',
    requiresAction: true,
    why: 'Failed payments can block service or require client follow-up.',
  },
  payment_overdue: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'money',
    source: 'payment',
    requiresAction: true,
    why: 'Overdue payments require action, with escalation when an event is close.',
  },
  payment_due_approaching: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'money',
    source: 'payment',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Approaching payment due dates should batch unless the event is imminent.',
  },
  client_on_payment_page: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'money',
    source: 'client',
    defaultChannels: { email: false, push: true, sms: false },
    why: 'Payment-page intent is a real-time nudge; email would be noise.',
  },
  client_viewed_quote: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'growth',
    source: 'client',
    defaultChannels: { email: false, push: true, sms: false },
    why: 'Quote views show buying intent and should group into one real-time nudge.',
  },
  quote_viewed_after_delay: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'growth',
    source: 'client',
    defaultChannels: { email: false, push: true, sms: false },
    why: 'Delayed quote views indicate reactivated buying intent.',
  },
  client_viewed_proposal: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'growth',
    source: 'client',
    defaultChannels: { email: false, push: true, sms: false },
    why: 'Proposal views are intent signals and should not create email noise.',
  },
  client_portal_visit: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'relationship',
    source: 'client',
    defaultChannels: { email: false, push: true, sms: false },
    why: 'Portal visits are useful awareness, not an email event.',
  },
  guest_dietary_alert: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'safety',
    source: 'client',
    requiresAction: true,
    why: 'Guest dietary alerts can affect safety and service execution.',
  },
  client_allergy_changed: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'safety',
    source: 'client',
    requiresAction: true,
    why: 'Allergy changes must break through when tied to active service.',
  },
  dietary_menu_conflict: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'safety',
    source: 'event',
    requiresAction: true,
    why: 'Dietary conflicts can produce unsafe menus and need chef review.',
  },
  recall_alert_matched: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'safety',
    source: 'vendor',
    requiresAction: true,
    why: 'Recall matches can affect active ingredients and must interrupt.',
  },
  staff_assignment: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'service',
    source: 'staff',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Staff assignment is operational context unless a gap or day-of change exists.',
  },
  task_assigned: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'service',
    source: 'staff',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Assigned tasks should roll into the operating brief unless overdue.',
  },
  schedule_change: {
    attention: 'decide',
    cadence: 'realtime',
    risk: 'service',
    source: 'staff',
    requiresAction: true,
    why: 'Schedule changes may affect staffing, arrival, or client timing.',
  },
  low_stock: {
    attention: 'decide',
    cadence: 'daily_brief',
    risk: 'service',
    source: 'inventory',
    defaultChannels: { email: true, push: true, sms: false },
    requiresAction: true,
    why: 'Low stock should not SMS unless it threatens an imminent event.',
  },
  price_watch_alert: {
    attention: 'review',
    cadence: 'digest',
    risk: 'money',
    source: 'vendor',
    defaultChannels: { email: true, push: true, sms: false },
    why: 'Price changes are owner intelligence unless they block current sourcing.',
  },
  review_submitted: {
    attention: 'review',
    cadence: 'digest',
    risk: 'reputation',
    source: 'social',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Reviews are reputation data and should batch unless negative.',
  },
  new_negative_mention: {
    attention: 'interrupt',
    cadence: 'realtime',
    risk: 'reputation',
    source: 'social',
    requiresAction: true,
    why: 'Negative public mentions need fast owner review.',
  },
  capacity_limit_approaching: {
    attention: 'decide',
    cadence: 'weekly_brief',
    risk: 'capacity',
    source: 'personal',
    defaultChannels: { email: true, push: true, sms: false },
    requiresAction: true,
    why: 'Capacity warnings should guide booking decisions without SMS noise.',
  },
  burnout_risk_high: {
    attention: 'decide',
    cadence: 'weekly_brief',
    risk: 'capacity',
    source: 'personal',
    defaultChannels: { email: true, push: true, sms: false },
    requiresAction: true,
    why: 'Burnout risk should protect the chef without acting as an emergency by default.',
  },
  goal_weekly_digest: {
    attention: 'review',
    cadence: 'weekly_brief',
    risk: 'growth',
    source: 'system',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Weekly goal digests are owner-review material.',
  },
  quarterly_checkin_due: {
    attention: 'review',
    cadence: 'quarterly_report',
    risk: 'capacity',
    source: 'system',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Quarterly check-ins belong in an owner report.',
  },
  no_education_logged_90d: {
    attention: 'review',
    cadence: 'quarterly_report',
    risk: 'capacity',
    source: 'personal',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Professional momentum signals should be reviewed, not interruptive.',
  },
  relationship_cooling: {
    attention: 'review',
    cadence: 'weekly_brief',
    risk: 'relationship',
    source: 'client',
    defaultChannels: { email: true, push: false, sms: false },
    why: 'Cooling relationships are follow-up intelligence for the weekly brief.',
  },
  marketplace_lead_stale: {
    attention: 'do',
    cadence: 'daily_brief',
    risk: 'growth',
    source: 'marketplace',
    defaultChannels: { email: true, push: true, sms: false },
    requiresAction: true,
    why: 'Stale marketplace leads need action but should not create SMS noise.',
  },
}

function cloneChannels(channels: ChannelSet): ChannelSet {
  return { email: channels.email, push: channels.push, sms: channels.sms }
}

function sourceForCategory(category: NotificationCategory): SignalSource {
  switch (category) {
    case 'inquiry':
    case 'quote':
    case 'client':
    case 'chat':
      return 'client'
    case 'event':
      return 'event'
    case 'payment':
      return 'payment'
    case 'lead':
      return 'marketplace'
    case 'loyalty':
      return 'loyalty'
    case 'goals':
    case 'system':
      return 'system'
    case 'protection':
      return 'system'
    case 'wellbeing':
      return 'personal'
    case 'review':
      return 'social'
    case 'ops':
      return 'staff'
  }
}

function riskForAction(action: NotificationAction, category: NotificationCategory): SignalRisk {
  if (SAFETY_ACTIONS.has(action)) return 'safety'
  if (MONEY_ACTIONS.has(action)) return 'money'
  if (category === 'event' || category === 'ops') return 'service'
  if (category === 'client' || category === 'chat') return 'relationship'
  if (category === 'wellbeing') return 'capacity'
  if (category === 'protection') return 'system'
  if (category === 'lead' || category === 'inquiry' || category === 'quote') return 'growth'
  if (category === 'review') return 'reputation'
  if (category === 'goals' || category === 'loyalty') return 'growth'
  return 'none'
}

function attentionForAction(
  action: NotificationAction,
  tier: NotificationTier
): SignalAttentionClass {
  if (INTENT_ACTIONS.has(action)) return 'decide'
  if (SAFETY_ACTIONS.has(action)) return 'interrupt'
  if (REPORT_ACTIONS.has(action)) return 'review'
  if (tier === 'critical') return 'interrupt'
  if (tier === 'alert') return 'do'
  return 'review'
}

function cadenceForAttention(attention: SignalAttentionClass): SignalCadence {
  switch (attention) {
    case 'interrupt':
    case 'decide':
      return 'realtime'
    case 'do':
      return 'daily_brief'
    case 'review':
      return 'digest'
    case 'archive':
      return 'in_app'
    case 'suppress':
      return 'in_app'
  }
}

function sourceOfTruthForAction(
  action: NotificationAction,
  category: NotificationCategory
): string {
  if (MONEY_ACTIONS.has(action)) return 'ledger and payment records'
  if (SAFETY_ACTIONS.has(action)) return 'client, guest, menu, and recall records'
  if (CLIENT_FACING_SIGNAL_ACTIONS.has(action))
    return 'client portal and rich transactional records'
  switch (category) {
    case 'inquiry':
    case 'lead':
      return 'inquiry pipeline'
    case 'quote':
      return 'quote and proposal records'
    case 'event':
      return 'event FSM and lifecycle records'
    case 'client':
    case 'chat':
      return 'client profile and conversation records'
    case 'ops':
      return 'ops, staff, inventory, and scheduling records'
    case 'wellbeing':
      return 'capacity and protected-time records'
    case 'protection':
      return 'protection, certification, insurance, and recall records'
    case 'goals':
    case 'loyalty':
      return 'growth and loyalty records'
    case 'review':
      return 'review and reputation records'
    case 'payment':
      return 'ledger and payment records'
    case 'system':
      return 'system audit and account records'
  }
}

function applyDefaultNoiseRules(
  action: NotificationAction,
  attention: SignalAttentionClass,
  cadence: SignalCadence,
  channels: ChannelSet
): ChannelSet {
  const next = cloneChannels(channels)

  if (INTENT_ACTIONS.has(action)) {
    next.email = false
    next.sms = false
  }

  if (cadence !== 'realtime') {
    next.sms = false
  }

  if (attention === 'archive' || attention === 'suppress') {
    next.email = false
    next.push = false
    next.sms = false
  }

  if (REPORT_ACTIONS.has(action)) {
    next.push = false
    next.sms = false
  }

  return next
}

export function getSignalPolicy(action: NotificationAction): SignalPolicy {
  const config = NOTIFICATION_CONFIG[action]
  const tier = DEFAULT_TIER_MAP[action]
  const baseAttention = attentionForAction(action, tier)
  const override = OVERRIDES[action] ?? {}
  const attention = override.attention ?? baseAttention
  const cadence = override.cadence ?? cadenceForAttention(attention)
  const channels = applyDefaultNoiseRules(
    action,
    attention,
    cadence,
    override.defaultChannels ?? TIER_CHANNEL_DEFAULTS[tier]
  )

  return {
    action,
    category: config.category,
    tier,
    attention,
    cadence,
    risk: override.risk ?? riskForAction(action, config.category),
    source: override.source ?? sourceForCategory(config.category),
    sourceOfTruth: override.sourceOfTruth ?? sourceOfTruthForAction(action, config.category),
    defaultChannels: channels,
    requiresAction: override.requiresAction ?? (attention === 'interrupt' || attention === 'do'),
    digestGroup: override.digestGroup ?? `${config.category}:${cadence}`,
    why:
      override.why ??
      `${config.category} ${tier} signal routed as ${attention} with ${cadence} cadence.`,
  }
}

export function getSignalMatrix(): SignalPolicy[] {
  return (Object.keys(NOTIFICATION_CONFIG) as NotificationAction[]).map(getSignalPolicy)
}

export function applySignalChannelPolicy(
  action: NotificationAction,
  channels: ChannelSet
): ChannelSet {
  const policy = getSignalPolicy(action)
  return {
    email: channels.email && policy.defaultChannels.email,
    push: channels.push && policy.defaultChannels.push,
    sms: channels.sms && policy.defaultChannels.sms,
  }
}

export function explainSignalPolicy(action: NotificationAction): string {
  const policy = getSignalPolicy(action)
  const channels = [
    policy.defaultChannels.sms ? 'SMS' : null,
    policy.defaultChannels.push ? 'push' : null,
    policy.defaultChannels.email ? 'email' : null,
  ].filter(Boolean)

  return `${policy.why} Default delivery: ${channels.length > 0 ? channels.join(', ') : 'in-app only'}. Source of truth: ${policy.sourceOfTruth}.`
}
