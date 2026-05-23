import type {
  CILSignalLikeSource,
  EvidenceLabel,
  LoopState,
  NotificationLikeSource,
  OperatingLoopAdapterOptions,
  OperatingLoopItem,
  ProfileCompletenessLikeSource,
  ReminderLikeSource,
  ResumeContext,
  SourceKind,
  TaskLikeSource,
  WaitingOn,
} from './types'
import { evidenceLabelForLoopState } from './evidence-labels'

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000

function clampConfidence(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }

  return Math.max(0, Math.min(1, value))
}

function normalizeIso(value: string | number | null | undefined): string | null {
  if (value == null || value === '') {
    return null
  }

  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) {
    return typeof value === 'string' ? value : null
  }

  return new Date(time).toISOString()
}

function isBefore(value: string | null | undefined, now: Date): boolean {
  if (!value) {
    return false
  }

  const time = new Date(value).getTime()
  return Number.isFinite(time) && time < now.getTime()
}

function isStale(createdAt: string | null, dueAt: string | null, now: Date): boolean {
  if (isBefore(dueAt, now)) {
    return true
  }

  if (!createdAt) {
    return false
  }

  const createdTime = new Date(createdAt).getTime()
  return Number.isFinite(createdTime) && now.getTime() - createdTime > STALE_AFTER_MS
}

function routeFrom(input: {
  route?: string | null
  actionUrl?: string | null
  sourceRoute?: string | null
  href?: string | null
}): string | null {
  return input.route ?? input.actionUrl ?? input.sourceRoute ?? input.href ?? null
}

function resumeContext(input: ResumeContext): ResumeContext | null {
  if (!input.lastAction && !input.timestamp && !input.sourceRoute && !input.nextStep) {
    return null
  }

  return input
}

function baseItem(input: {
  id: string
  sourceId: string
  sourceKind: SourceKind
  loopState: LoopState
  evidenceLabel: EvidenceLabel
  confidence: number | null
  title: string
  description: string | null
  nextAction: string | null
  waitingOn: WaitingOn | null
  route: string | null
  createdAt: string | null
  dueAt: string | null
  lastAction?: string | null
}): OperatingLoopItem {
  return {
    id: input.id,
    sourceId: input.sourceId,
    sourceKind: input.sourceKind,
    loopState: input.loopState,
    evidenceLabel: evidenceLabelForLoopState(input.loopState, input.evidenceLabel),
    confidence: input.confidence,
    title: input.title,
    description: input.description,
    nextAction: input.nextAction,
    waitingOn: input.waitingOn,
    resumeContext: resumeContext({
      lastAction: input.lastAction ?? null,
      timestamp: input.createdAt,
      sourceRoute: input.route,
      nextStep: input.nextAction,
    }),
    proofHref: input.route,
    sourceRoute: input.route,
    createdAt: input.createdAt,
    dueAt: input.dueAt,
  }
}

function statusIs(status: string | null | undefined, values: string[]): boolean {
  return values.includes(String(status ?? '').toLowerCase())
}

function priorityConfidence(priority: string | null | undefined): number {
  switch (String(priority ?? '').toLowerCase()) {
    case 'urgent':
    case 'critical':
      return 1
    case 'high':
      return 0.85
    case 'medium':
    case 'normal':
      return 0.65
    case 'low':
      return 0.45
    default:
      return 0.7
  }
}

export function mapTaskToOperatingLoopItem(
  task: TaskLikeSource,
  options: OperatingLoopAdapterOptions = {}
): OperatingLoopItem {
  const now = options.now ?? new Date()
  const createdAt = normalizeIso(task.createdAt)
  const dueAt = normalizeIso(task.dueAt)
  const completedAt = normalizeIso(task.completedAt)
  const route = routeFrom(task)
  const done = statusIs(task.status, ['done', 'complete', 'completed'])
  const dismissed = statusIs(task.status, ['dismissed', 'archived', 'cancelled', 'canceled'])
  const blocked = statusIs(task.status, ['blocked'])

  let loopState: LoopState = 'active'
  if (done || completedAt) {
    loopState = 'done'
  } else if (dismissed) {
    loopState = 'dismissed'
  } else if (blocked) {
    loopState = 'blocked'
  } else if (isStale(createdAt, dueAt, now)) {
    loopState = 'stale'
  }

  const nextAction =
    loopState === 'done' || loopState === 'dismissed' ? null : (task.nextAction ?? task.title)

  return baseItem({
    id: `task:${task.id}`,
    sourceId: task.id,
    sourceKind: 'task',
    loopState,
    evidenceLabel: 'user_entered',
    confidence: priorityConfidence(task.priority),
    title: task.title,
    description: task.description ?? null,
    nextAction,
    waitingOn: blocked ? { kind: 'decision', label: 'Task blocker', followUpAt: dueAt } : null,
    route,
    createdAt,
    dueAt,
    lastAction: done ? 'Completed' : null,
  })
}

export function mapReminderToOperatingLoopItem(
  reminder: ReminderLikeSource,
  options: OperatingLoopAdapterOptions = {}
): OperatingLoopItem {
  const now = options.now ?? new Date()
  const createdAt = normalizeIso(reminder.createdAt)
  const dueAt = normalizeIso(reminder.dueAt)
  const snoozedUntil = normalizeIso(reminder.snoozedUntil)
  const route = routeFrom(reminder)
  const done = statusIs(reminder.status, ['done', 'complete', 'completed'])
  const dismissed = statusIs(reminder.status, ['dismissed', 'archived'])
  const snoozed = statusIs(reminder.status, ['snoozed']) || Boolean(snoozedUntil)

  let loopState: LoopState = 'waiting'
  if (done) {
    loopState = 'done'
  } else if (dismissed) {
    loopState = 'dismissed'
  } else if (snoozed) {
    loopState = 'snoozed'
  } else if (isStale(createdAt, dueAt, now)) {
    loopState = 'stale'
  }

  return baseItem({
    id: `reminder:${reminder.id}`,
    sourceId: reminder.id,
    sourceKind: 'reminder',
    loopState,
    evidenceLabel: 'user_entered',
    confidence: 0.9,
    title: reminder.title,
    description: reminder.description ?? null,
    nextAction:
      loopState === 'done' || loopState === 'dismissed'
        ? null
        : (reminder.nextAction ?? `Follow up on ${reminder.title}`),
    waitingOn:
      loopState === 'snoozed'
        ? { kind: 'time', label: 'Snooze window', followUpAt: snoozedUntil }
        : { kind: 'time', label: 'Reminder due date', followUpAt: dueAt },
    route,
    createdAt,
    dueAt,
  })
}

export function mapNotificationToOperatingLoopItem(
  notification: NotificationLikeSource,
  options: OperatingLoopAdapterOptions = {}
): OperatingLoopItem {
  const now = options.now ?? new Date()
  const createdAt = normalizeIso(notification.createdAt)
  const dueAt = normalizeIso(notification.dueAt)
  const route = routeFrom(notification)
  const action = notification.action ?? String(notification.metadata?.action ?? '')
  const dismissed = statusIs(notification.status, ['dismissed', 'archived'])
  const done = statusIs(notification.status, ['done', 'complete', 'completed'])
  const payment = action.includes('payment')
  const reply = action.includes('reply') || action.includes('inquiry') || action.includes('quote')

  let loopState: LoopState = reply || payment ? 'waiting' : 'active'
  if (done) {
    loopState = 'done'
  } else if (dismissed) {
    loopState = 'dismissed'
  } else if (isStale(createdAt, dueAt, now)) {
    loopState = 'stale'
  }

  const waitingOn: WaitingOn | null = payment
    ? { kind: 'payment', label: 'Payment resolution', followUpAt: dueAt }
    : reply
      ? { kind: 'reply', label: 'Client reply', followUpAt: dueAt }
      : null

  return baseItem({
    id: `notification:${notification.id}`,
    sourceId: notification.id,
    sourceKind: 'notification',
    loopState,
    evidenceLabel: 'confirmed',
    confidence: priorityConfidence(notification.priority),
    title: notification.title,
    description: notification.description ?? null,
    nextAction:
      loopState === 'done' || loopState === 'dismissed' ? null : action || notification.title,
    waitingOn,
    route,
    createdAt,
    dueAt,
  })
}

export function mapCILSignalToOperatingLoopItem(signal: CILSignalLikeSource): OperatingLoopItem {
  const createdAt = normalizeIso(signal.createdAt)
  const route =
    routeFrom(signal) ??
    (typeof signal.actionPayload?.href === 'string' ? signal.actionPayload.href : null)
  const confidence = clampConfidence(signal.confidence)
  const dismissed =
    statusIs(signal.status, ['dismissed', 'skipped']) ||
    Boolean((signal as { dismissedAt?: unknown }).dismissedAt)
  const uncertain = signal.actionType === 'confirm' || confidence == null || confidence < 0.7
  const loopState: LoopState = dismissed ? 'dismissed' : uncertain ? 'uncertain' : 'active'

  return baseItem({
    id: `cil_signal:${signal.id}`,
    sourceId: signal.id,
    sourceKind: 'cil_signal',
    loopState,
    evidenceLabel: confidence != null && confidence >= 0.85 ? 'computed' : 'inferred',
    confidence,
    title: signal.title,
    description: signal.detail ?? null,
    nextAction: dismissed ? null : (signal.suggestedAction ?? 'Review signal context'),
    waitingOn:
      loopState === 'uncertain'
        ? { kind: 'system', label: 'Evidence review', followUpAt: null }
        : null,
    route,
    createdAt,
    dueAt: null,
  })
}

export function mapProfileCompletenessToOperatingLoopItem(
  profile: ProfileCompletenessLikeSource
): OperatingLoopItem {
  const route = routeFrom(profile)
  const updatedAt = normalizeIso(profile.updatedAt)
  const confidence = clampConfidence(profile.score > 1 ? profile.score / 100 : profile.score)
  const primaryGap = profile.missing[0] ?? null
  const complete = profile.tier === 'complete' || profile.missing.length === 0
  const blocksService =
    !complete &&
    profile.missing.some((gap) => {
      const normalized = gap.toLowerCase()
      return (
        normalized.includes('allerg') ||
        normalized.includes('contact') ||
        normalized.includes('dietary')
      )
    })
  const loopState: LoopState = complete ? 'done' : blocksService ? 'blocked' : 'active'

  return baseItem({
    id: `client_profile:${profile.clientId}`,
    sourceId: profile.clientId,
    sourceKind: 'client_profile',
    loopState,
    evidenceLabel: 'computed',
    confidence,
    title: `${profile.clientName} profile memory`,
    description: complete
      ? 'Profile memory is complete.'
      : `Missing ${profile.missing.join(', ')}.`,
    nextAction: complete || !primaryGap ? null : `Fill in ${primaryGap}`,
    waitingOn:
      loopState === 'blocked'
        ? { kind: 'person', label: primaryGap ?? 'Client profile detail', followUpAt: null }
        : null,
    route,
    createdAt: updatedAt,
    dueAt: null,
  })
}

export function evidencePriority(label: EvidenceLabel): number {
  switch (label) {
    case 'confirmed':
    case 'user_entered':
      return 5
    case 'computed':
      return 4
    case 'claimed':
      return 3
    case 'inferred':
      return 2
    case 'stale':
    case 'disputed':
      return 1
    case 'unknown':
      return 0
  }
}

// ---------------------------------------------------------------------------
// Capture Entry Adapter
// Maps inbox capture entries into operating loop items so they appear
// in the chef's operating loop feed alongside tasks, notifications, etc.
// ---------------------------------------------------------------------------

export type CaptureEntryLikeSource = {
  id: string
  content: string
  category: string
  status: string
  priority: string
  captured_at: string
  linked_event_id?: string | null
  linked_client_id?: string | null
}

export function mapCaptureToOperatingLoopItem(capture: CaptureEntryLikeSource): OperatingLoopItem {
  const createdAt = normalizeIso(capture.captured_at)
  const dismissed = capture.status === 'dismissed' || capture.status === 'archived'
  const triaged = capture.status === 'triaged' || capture.status === 'actioned'
  const loopState: LoopState = dismissed ? 'dismissed' : triaged ? 'done' : 'active'

  const route = '/dashboard'

  const confidence =
    capture.priority === 'urgent'
      ? 0.95
      : capture.priority === 'high'
        ? 0.8
        : capture.priority === 'normal'
          ? 0.6
          : 0.4

  return baseItem({
    id: `capture:${capture.id}`,
    sourceId: capture.id,
    sourceKind: 'system',
    loopState,
    evidenceLabel: 'user_entered',
    confidence,
    title: capture.content.length > 80 ? capture.content.slice(0, 77) + '...' : capture.content,
    description: `Captured ${capture.category.replace(/_/g, ' ')}`,
    nextAction: loopState === 'active' ? 'Triage this capture' : null,
    waitingOn: null,
    route,
    createdAt,
    dueAt: null,
  })
}
