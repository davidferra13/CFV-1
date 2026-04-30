import type { NotificationAction, NotificationCategory } from './types'
import { NOTIFICATION_CONFIG } from './types'

export type InterruptionLevel = 'silent' | 'badge' | 'soft' | 'double' | 'urgent'
export type InterruptionGroup =
  | 'lead'
  | 'communication'
  | 'money'
  | 'event'
  | 'safety'
  | 'ops'
  | 'system'
  | 'digest'

export type ChefMode = 'available' | 'prep' | 'service' | 'driving' | 'off_hours'

export type EventDayFocusContext = {
  active: boolean
  eventIds: string[]
  eventCount: number
  reason: string | null
}

export type InterruptionDecision = {
  level: InterruptionLevel
  group: InterruptionGroup
  reason: string
  pattern: number[]
  tag: string
  renotify: boolean
  bypassQuietHours: boolean
  shouldDigest: boolean
  cooldownMs: number
  pushUrgency: 'very-low' | 'low' | 'normal' | 'high'
}

export type InterruptionInput = {
  action: NotificationAction
  category?: NotificationCategory
  metadata?: Record<string, unknown> | null
  eventId?: string | null
  inquiryId?: string | null
  clientId?: string | null
  actionUrl?: string | null
  chefMode?: ChefMode
  fatigueCount?: number
  eventDayFocus?: EventDayFocusContext | null
}

export type InterruptionAuditMetadata = {
  version: 1
  level: InterruptionLevel
  group: InterruptionGroup
  reason: string
  tag: string
  pattern: number[]
  bypassQuietHours: boolean
  shouldDigest: boolean
  eventDayFocusActive: boolean
  eventDayFocusApplied: boolean
  eventDayFocusReason: string | null
  evaluatedAt: string
}

export type HapticSimulationScenario = {
  label: string
  action: NotificationAction
  metadata?: Record<string, unknown>
  eventId?: string
  inquiryId?: string
  clientId?: string
}

export const CHEF_MODE_LABELS: Record<ChefMode, string> = {
  available: 'Available',
  prep: 'In prep',
  service: 'In service',
  driving: 'Driving',
  off_hours: 'Off hours',
}

export const HAPTIC_SIMULATION_SCENARIOS: HapticSimulationScenario[] = [
  {
    label: 'New inbox lead',
    action: 'new_inquiry',
    inquiryId: 'preview-inquiry',
    metadata: { lead_confidence: 0.93, source: 'inbox' },
  },
  {
    label: 'Low-confidence scraped lead',
    action: 'new_inquiry',
    inquiryId: 'preview-scraped-lead',
    metadata: { lead_confidence: 0.42, source: 'scraped' },
  },
  {
    label: 'VIP client reply',
    action: 'new_message',
    clientId: 'preview-client',
    metadata: { vip: true },
  },
  {
    label: 'Payment failed',
    action: 'payment_failed',
    eventId: 'preview-event',
  },
  {
    label: 'Guest RSVP',
    action: 'guest_rsvp_received',
    eventId: 'preview-event',
  },
  {
    label: 'New allergy conflict',
    action: 'client_allergy_changed',
    eventId: 'preview-event',
  },
]

const LEVEL_ORDER: Record<InterruptionLevel, number> = {
  silent: 0,
  badge: 1,
  soft: 2,
  double: 3,
  urgent: 4,
}

const VIBRATION_PATTERNS: Record<InterruptionLevel, number[]> = {
  silent: [],
  badge: [],
  soft: [45],
  double: [45, 70, 45],
  urgent: [90, 80, 90, 80, 140],
}

const HUMAN_WAITING_ACTIONS = new Set<NotificationAction>([
  'inquiry_reply',
  'new_message',
  'new_chat_message_to_client',
  'menu_revision_requested',
  'meal_recommendation_revision_requested',
  'client_meal_feedback_submitted',
  'event_collaboration_invite',
])

const LEAD_ACTIONS = new Set<NotificationAction>([
  'new_inquiry',
  'wix_submission',
  'new_guest_lead',
  'marketplace_lead_stale',
  'referral_booking_converted',
])

const MONEY_ACTIONS = new Set<NotificationAction>([
  'quote_accepted',
  'proposal_accepted',
  'event_paid',
  'payment_received',
  'payment_failed',
  'payment_amount_mismatch',
  'payment_overdue',
  'dispute_created',
  'dispute_funds_withdrawn',
  'cancellation_pending_refund',
  'full_refund_active_event',
  'gift_card_purchased',
  'ticket_purchased',
  'gift_card_redeemed',
  'contract_signed',
])

const EVENT_RISK_ACTIONS = new Set<NotificationAction>([
  'event_cancelled',
  'event_confirmed',
  'event_reminder_1d',
  'event_reminder_2d',
  'guest_count_changed',
  'schedule_change',
  'staff_assignment',
  'task_assigned',
  'low_stock',
  'order_status',
])

const SAFETY_ACTIONS = new Set<NotificationAction>([
  'guest_dietary_alert',
  'client_allergy_changed',
  'dietary_menu_conflict',
  'recall_alert_matched',
])

const QUIET_ACTIONS = new Set<NotificationAction>([
  'guest_rsvp_received',
  'client_portal_visit',
  'client_viewed_quote',
  'client_viewed_proposal',
  'client_on_payment_page',
  'quote_viewed_after_delay',
  'review_submitted',
  'goal_nudge',
  'goal_milestone',
  'goal_weekly_digest',
  'points_awarded',
  'raffle_entry_earned',
  'raffle_new_round',
  'relationship_cooling',
  'no_education_logged_90d',
  'quarterly_checkin_due',
  'price_watch_alert',
])

const DIGEST_ACTIONS = new Set<NotificationAction>([
  'guest_rsvp_received',
  'client_portal_visit',
  'client_viewed_quote',
  'client_viewed_proposal',
  'client_on_payment_page',
  'quote_viewed_after_delay',
  'review_submitted',
  'follow_up_due',
  'followup_rule_triggered',
  'price_watch_alert',
  'goal_nudge',
  'goal_weekly_digest',
  'directory_listing_verified',
  'directory_listing_removed',
])

function getNumberMetadata(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function getBooleanMetadata(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return false
  return keys.some((key) => metadata[key] === true || metadata[key] === 'true')
}

function getStringMetadata(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function levelMax(a: InterruptionLevel, b: InterruptionLevel): InterruptionLevel {
  return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b
}

function levelMin(a: InterruptionLevel, b: InterruptionLevel): InterruptionLevel {
  return LEVEL_ORDER[a] <= LEVEL_ORDER[b] ? a : b
}

function downgrade(level: InterruptionLevel): InterruptionLevel {
  if (level === 'urgent') return 'double'
  if (level === 'double') return 'soft'
  if (level === 'soft') return 'badge'
  return level
}

function getBaseDecision(
  action: NotificationAction
): Pick<InterruptionDecision, 'level' | 'group' | 'reason'> {
  if (SAFETY_ACTIONS.has(action)) {
    return { level: 'urgent', group: 'safety', reason: 'Safety or allergy risk' }
  }
  if (MONEY_ACTIONS.has(action)) {
    if (action === 'payment_received' || action === 'quote_accepted') {
      return { level: 'double', group: 'money', reason: 'Money or booking movement' }
    }
    return { level: 'urgent', group: 'money', reason: 'Payment or booking risk' }
  }
  if (LEAD_ACTIONS.has(action)) {
    return { level: 'double', group: 'lead', reason: 'New revenue opportunity' }
  }
  if (HUMAN_WAITING_ACTIONS.has(action)) {
    return { level: 'double', group: 'communication', reason: 'Human response waiting' }
  }
  if (EVENT_RISK_ACTIONS.has(action)) {
    return { level: 'double', group: 'event', reason: 'Event timing or operations risk' }
  }
  if (QUIET_ACTIONS.has(action)) {
    return { level: 'badge', group: 'digest', reason: 'Useful update, no interruption needed' }
  }
  if (action === 'system_alert' || action === 'account_access_alert') {
    return { level: 'double', group: 'system', reason: 'Account or system attention needed' }
  }
  return { level: 'badge', group: 'digest', reason: 'Routine update' }
}

function buildThreadTag(input: InterruptionInput, group: InterruptionGroup) {
  const thread =
    input.eventId ||
    input.inquiryId ||
    input.clientId ||
    getStringMetadata(input.metadata, ['thread_id', 'conversation_id', 'quote_id']) ||
    input.actionUrl ||
    input.action

  return `cheflow-${group}-${input.action}-${thread}`
}

function applyContext(base: ReturnType<typeof getBaseDecision>, input: InterruptionInput) {
  let level = base.level
  let group = base.group
  let reason = base.reason
  const metadata = input.metadata ?? null

  const confidence = getNumberMetadata(metadata, ['lead_confidence', 'confidence', 'score'])
  const isScraped = getStringMetadata(metadata, ['source', 'channel'])
    ?.toLowerCase()
    .includes('scrap')
  if (LEAD_ACTIONS.has(input.action) && (isScraped || confidence !== null)) {
    if (confidence !== null && confidence < 0.75) {
      level = 'badge'
      reason = 'Lead needs review before interrupting'
    } else if (confidence !== null && confidence >= 0.9) {
      level = levelMax(level, 'double')
      reason = 'High-confidence lead'
    }
  }

  if (getBooleanMetadata(metadata, ['vip', 'is_vip', 'repeat_client', 'high_value_client'])) {
    level = levelMax(level, 'double')
    group = group === 'digest' ? 'communication' : group
    reason = 'VIP or repeat client'
  }

  if (getBooleanMetadata(metadata, ['event_day', 'active_event_day', 'service_day'])) {
    level = levelMax(level, 'double')
    group = 'event'
    reason = 'Event-day issue'
  }

  const hoursUntilEvent = getNumberMetadata(metadata, [
    'hours_until_event',
    'event_starts_in_hours',
  ])
  if (hoursUntilEvent !== null && hoursUntilEvent <= 48) {
    level = levelMax(level, 'double')
    group = group === 'digest' ? 'event' : group
    reason = 'Near-term event issue'
  }

  const urgency = getStringMetadata(metadata, ['urgency', 'priority', 'severity'])
  if (urgency === 'critical' || urgency === 'urgent' || urgency === 'high') {
    level = levelMax(level, 'double')
    reason = 'Marked urgent'
  }
  if (urgency === 'low') {
    level = levelMin(level, 'soft')
  }

  return { level, group, reason }
}

function applyChefMode(level: InterruptionLevel, group: InterruptionGroup, mode: ChefMode) {
  if (mode === 'available') return level
  if (group === 'money' || group === 'safety') return level

  if (mode === 'service') {
    return group === 'event' || group === 'communication' ? levelMin(level, 'double') : 'badge'
  }

  if (mode === 'driving') {
    return group === 'event' ? levelMin(level, 'soft') : 'badge'
  }

  if (mode === 'prep') {
    return group === 'event' || group === 'communication'
      ? levelMin(level, 'double')
      : downgrade(level)
  }

  return group === 'event' || group === 'communication' ? levelMin(level, 'soft') : 'badge'
}

function isActiveEventNotification(input: InterruptionInput): boolean {
  if (
    getBooleanMetadata(input.metadata, [
      'event_day',
      'active_event_day',
      'service_day',
      'event_day_focus_allowed',
    ])
  ) {
    return true
  }

  const eventIds = input.eventDayFocus?.eventIds ?? []
  if (input.eventId && eventIds.includes(input.eventId)) return true

  const metadataEventId = getStringMetadata(input.metadata, ['event_id', 'eventId'])
  return Boolean(metadataEventId && eventIds.includes(metadataEventId))
}

function shouldEventDayFocusMute(input: InterruptionInput, group: InterruptionGroup): boolean {
  const focus = input.eventDayFocus
  if (!focus?.active) return false
  if (group === 'money' || group === 'safety') return false
  if (group === 'event' || group === 'communication' || group === 'ops') {
    return !isActiveEventNotification(input)
  }
  return true
}

function getPushUrgency(level: InterruptionLevel): InterruptionDecision['pushUrgency'] {
  if (level === 'urgent' || level === 'double') return 'high'
  if (level === 'soft') return 'normal'
  if (level === 'badge') return 'low'
  return 'very-low'
}

export function evaluateNotificationInterruption(input: InterruptionInput): InterruptionDecision {
  const category = input.category ?? NOTIFICATION_CONFIG[input.action]?.category ?? 'system'
  const contextual = applyContext(getBaseDecision(input.action), { ...input, category })
  let level = applyChefMode(contextual.level, contextual.group, input.chefMode ?? 'available')
  let reason = contextual.reason

  if (
    (input.fatigueCount ?? 0) >= 10 &&
    contextual.group !== 'money' &&
    contextual.group !== 'safety'
  ) {
    level = downgrade(level)
    reason = 'Notification fatigue protection'
  }

  if (shouldEventDayFocusMute(input, contextual.group)) {
    level = 'badge'
    reason = input.eventDayFocus?.reason ?? 'Event-day focus muted non-event interruption'
  }

  const shouldDigest = DIGEST_ACTIONS.has(input.action) || level === 'badge' || level === 'silent'
  const bypassQuietHours =
    contextual.group === 'money' ||
    contextual.group === 'safety' ||
    (contextual.group === 'event' && level !== 'badge')

  return {
    level,
    group: contextual.group,
    reason,
    pattern: VIBRATION_PATTERNS[level],
    tag: buildThreadTag({ ...input, category }, contextual.group),
    renotify: level === 'urgent',
    bypassQuietHours,
    shouldDigest,
    cooldownMs: level === 'urgent' ? 120_000 : 15 * 60_000,
    pushUrgency: getPushUrgency(level),
  }
}

export function buildInterruptionAuditMetadata(
  input: InterruptionInput,
  decision = evaluateNotificationInterruption(input),
  evaluatedAt = new Date()
): InterruptionAuditMetadata {
  const focusApplied = shouldEventDayFocusMute(input, decision.group)

  return {
    version: 1,
    level: decision.level,
    group: decision.group,
    reason: decision.reason,
    tag: decision.tag,
    pattern: decision.pattern,
    bypassQuietHours: decision.bypassQuietHours,
    shouldDigest: decision.shouldDigest,
    eventDayFocusActive: Boolean(input.eventDayFocus?.active),
    eventDayFocusApplied: focusApplied,
    eventDayFocusReason: focusApplied ? (input.eventDayFocus?.reason ?? decision.reason) : null,
    evaluatedAt: evaluatedAt.toISOString(),
  }
}

export function readInterruptionAuditMetadata(
  metadata: Record<string, unknown> | null | undefined
): InterruptionAuditMetadata | null {
  const audit = metadata?.haptic_audit
  if (!audit || typeof audit !== 'object' || Array.isArray(audit)) return null
  const candidate = audit as Partial<InterruptionAuditMetadata>
  if (candidate.version !== 1) return null
  if (
    candidate.level !== 'silent' &&
    candidate.level !== 'badge' &&
    candidate.level !== 'soft' &&
    candidate.level !== 'double' &&
    candidate.level !== 'urgent'
  ) {
    return null
  }
  if (typeof candidate.reason !== 'string' || !candidate.reason.trim()) return null

  return {
    version: 1,
    level: candidate.level,
    group:
      candidate.group === 'lead' ||
      candidate.group === 'communication' ||
      candidate.group === 'money' ||
      candidate.group === 'event' ||
      candidate.group === 'safety' ||
      candidate.group === 'ops' ||
      candidate.group === 'system' ||
      candidate.group === 'digest'
        ? candidate.group
        : 'digest',
    reason: candidate.reason,
    tag: typeof candidate.tag === 'string' ? candidate.tag : '',
    pattern: Array.isArray(candidate.pattern)
      ? candidate.pattern.filter((item): item is number => typeof item === 'number')
      : [],
    bypassQuietHours: Boolean(candidate.bypassQuietHours),
    shouldDigest: Boolean(candidate.shouldDigest),
    eventDayFocusActive: Boolean(candidate.eventDayFocusActive),
    eventDayFocusApplied: Boolean(candidate.eventDayFocusApplied),
    eventDayFocusReason:
      typeof candidate.eventDayFocusReason === 'string' ? candidate.eventDayFocusReason : null,
    evaluatedAt: typeof candidate.evaluatedAt === 'string' ? candidate.evaluatedAt : '',
  }
}
