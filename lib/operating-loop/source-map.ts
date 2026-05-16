import type { UnifiedActionItem } from '@/lib/action-center/types'
import type { CILSignal, ProactiveSignal } from '@/lib/cil/types'
import type { CurrentUnit } from '@/lib/current/types'
import type { QueueItem } from '@/lib/queue/types'
import type { WorkItem } from '@/lib/workflow/types'

import type {
  ClientProfileLoopSource,
  EvidenceLabel,
  LoopState,
  OperatingLoopItem,
  OperatingLoopSourceKind,
  ResumeContext,
  WaitingOn,
} from './types'
import { evidenceLabelForLoopState } from './evidence-labels'

const DAY_MS = 24 * 60 * 60 * 1000

function clampConfidence(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }

  return Math.max(0, Math.min(1, value))
}

function nowMs(now: Date): number {
  return now.getTime()
}

function isPast(iso: string | null | undefined, now: Date): boolean {
  if (!iso) {
    return false
  }

  const time = new Date(iso).getTime()
  return Number.isFinite(time) && time < nowMs(now)
}

function isOlderThan(iso: string | null | undefined, days: number, now: Date): boolean {
  if (!iso) {
    return false
  }

  const time = new Date(iso).getTime()
  return Number.isFinite(time) && nowMs(now) - time > days * DAY_MS
}

function firstActionLabel(actions: { label: string }[]): string | null {
  return actions[0]?.label ?? null
}

function sourceKindFromCurrent(unit: CurrentUnit): OperatingLoopSourceKind {
  if (unit.source === 'cil') {
    return 'cil_signal'
  }

  if (unit.entityType === 'event') {
    return 'event'
  }

  if (unit.entityType === 'menu') {
    return 'menu'
  }

  if (unit.entityType === 'recipe') {
    return 'recipe'
  }

  if (unit.entityType === 'client') {
    return 'client_profile'
  }

  if (unit.source === 'priority_queue' || unit.source === 'decision_queue') {
    return 'rail'
  }

  return 'task'
}

function loopStateFromUrgency(
  urgency: 'critical' | 'high' | 'normal' | 'low',
  dueAt: string | null,
  createdAt: string,
  now: Date
): LoopState {
  if (isPast(dueAt, now)) {
    return 'stale'
  }

  if (isOlderThan(createdAt, 14, now)) {
    return 'stale'
  }

  if (urgency === 'critical' || urgency === 'high') {
    return 'active'
  }

  return 'uncertain'
}

function actionCenterWaitingOn(item: UnifiedActionItem): WaitingOn | null {
  if (item.status === 'snoozed') {
    return {
      kind: 'time',
      label: 'Snooze window',
      followUpAt: item.snoozedUntil,
    }
  }

  const actionType = String(item.metadata.action ?? item.metadata.type ?? '')
  if (actionType.includes('payment')) {
    return { kind: 'payment', label: 'Payment resolution', followUpAt: item.dueAt }
  }

  if (actionType.includes('reply') || actionType.includes('inquiry')) {
    return { kind: 'reply', label: 'Client reply', followUpAt: item.dueAt }
  }

  return null
}

function resumeContext(input: {
  lastAction: string | null
  timestamp: string | null
  sourceRoute: string | null
  nextStep: string | null
}): ResumeContext | null {
  if (!input.lastAction && !input.timestamp && !input.sourceRoute && !input.nextStep) {
    return null
  }

  return input
}

export function mapCurrentUnitToOperatingLoopItem(
  unit: CurrentUnit,
  options: { now?: Date } = {}
): OperatingLoopItem {
  const now = options.now ?? new Date()
  const sourceKind = sourceKindFromCurrent(unit)
  const nextAction = firstActionLabel(unit.actions)
  const loopState = loopStateFromUrgency(unit.urgency, unit.dueAt, unit.createdAt, now)

  return {
    id: `current:${unit.id}`,
    sourceId: unit.id,
    sourceKind,
    loopState,
    evidenceLabel: evidenceLabelForLoopState(
      loopState,
      unit.source === 'cil' ? 'inferred' : 'computed'
    ),
    confidence: clampConfidence(unit.score / 1000),
    title: unit.title,
    description: unit.description,
    nextAction,
    waitingOn: null,
    resumeContext: resumeContext({
      lastAction: unit.contextLines[0] ?? null,
      timestamp: unit.createdAt,
      sourceRoute: unit.href,
      nextStep: nextAction,
    }),
    proofHref: unit.href,
    sourceRoute: unit.href,
    createdAt: unit.createdAt,
    dueAt: unit.dueAt,
  }
}

export function mapActionItemToOperatingLoopItem(
  item: UnifiedActionItem,
  options: { now?: Date } = {}
): OperatingLoopItem {
  const now = options.now ?? new Date()
  const waitingOn = actionCenterWaitingOn(item)
  const metadataAction = String(item.metadata.action ?? '')
  const nextAction =
    item.status === 'completed' || item.status === 'dismissed' ? null : metadataAction || item.title

  let loopState: LoopState = 'active'
  if (item.status === 'completed') {
    loopState = 'done'
  } else if (item.status === 'dismissed') {
    loopState = 'dismissed'
  } else if (item.status === 'snoozed') {
    loopState = 'snoozed'
  } else if (waitingOn) {
    loopState = 'waiting'
  } else if (isPast(item.dueAt, now)) {
    loopState = 'stale'
  } else if (item.status === 'pending' || item.status === 'active') {
    loopState = 'active'
  }

  return {
    id: `action-center:${item.id}`,
    sourceId: item.sourceId,
    sourceKind: item.source,
    loopState,
    evidenceLabel: evidenceLabelForLoopState(
      loopState,
      item.source === 'notification' ? 'confirmed' : 'user_entered'
    ),
    confidence: item.priority === 'urgent' ? 1 : item.priority === 'high' ? 0.85 : 0.65,
    title: item.title,
    description: item.description,
    nextAction,
    waitingOn,
    resumeContext: resumeContext({
      lastAction: item.status === 'active' ? 'Started' : null,
      timestamp: item.createdAt,
      sourceRoute: item.actionUrl,
      nextStep: nextAction,
    }),
    proofHref: item.actionUrl,
    sourceRoute: item.actionUrl,
    createdAt: item.createdAt,
    dueAt: item.dueAt,
  }
}

export function mapProactiveSignalToOperatingLoopItem(signal: ProactiveSignal): OperatingLoopItem {
  const loopState: LoopState = signal.dismissedAt
    ? 'dismissed'
    : signal.actionType === 'confirm' || signal.confidence < 0.7
      ? 'uncertain'
      : 'active'

  return {
    id: `cil:${signal.id}`,
    sourceId: signal.id,
    sourceKind: 'cil_signal',
    loopState,
    evidenceLabel: evidenceLabelForLoopState(
      loopState,
      signal.confidence >= 0.85 ? 'computed' : 'inferred'
    ),
    confidence: clampConfidence(signal.confidence),
    title: signal.title,
    description: signal.detail,
    nextAction: signal.dismissedAt ? null : signal.suggestedAction,
    waitingOn: null,
    resumeContext: resumeContext({
      lastAction: null,
      timestamp: new Date(signal.createdAt).toISOString(),
      sourceRoute:
        typeof signal.actionPayload?.href === 'string' ? signal.actionPayload.href : null,
      nextStep: signal.dismissedAt ? null : signal.suggestedAction,
    }),
    proofHref: typeof signal.actionPayload?.href === 'string' ? signal.actionPayload.href : null,
    sourceRoute: typeof signal.actionPayload?.href === 'string' ? signal.actionPayload.href : null,
    createdAt: new Date(signal.createdAt).toISOString(),
    dueAt: null,
  }
}

export function mapCILSignalToOperatingLoopItem(signal: CILSignal): OperatingLoopItem {
  const interpreted = signal.interpretation_status === 'interpreted'
  const skipped = signal.interpretation_status === 'skipped'
  const loopState: LoopState = skipped ? 'dismissed' : interpreted ? 'active' : 'uncertain'

  return {
    id: `cil:${signal.id}`,
    sourceId: signal.id,
    sourceKind: 'cil_signal',
    loopState,
    evidenceLabel: evidenceLabelForLoopState(loopState, interpreted ? 'computed' : 'unknown'),
    confidence: null,
    title: `Review ${signal.source.replaceAll('_', ' ')} signal`,
    description: signal.entity_ids.length
      ? `Signal references ${signal.entity_ids.length} known entities.`
      : null,
    nextAction: skipped ? null : 'Review signal context',
    waitingOn: interpreted
      ? null
      : { kind: 'system', label: 'Signal interpretation', followUpAt: null },
    resumeContext: resumeContext({
      lastAction: interpreted ? 'Interpreted by CIL' : null,
      timestamp: new Date(signal.created_at).toISOString(),
      sourceRoute: null,
      nextStep: skipped ? null : 'Review signal context',
    }),
    proofHref: null,
    sourceRoute: null,
    createdAt: new Date(signal.created_at).toISOString(),
    dueAt: null,
  }
}

export function mapClientProfileToOperatingLoopItem(
  profile: ClientProfileLoopSource
): OperatingLoopItem {
  const primaryGap = profile.missing[0] ?? null
  const nextAction = primaryGap ? `Fill in ${primaryGap}` : null
  const sourceRoute = profile.href ?? profile.route ?? null
  const loopState: LoopState =
    profile.tier === 'complete'
      ? 'done'
      : profile.missing.some((gap) => gap.includes('allerg') || gap.includes('contact'))
        ? 'blocked'
        : 'active'

  return {
    id: `client-profile:${profile.clientId}`,
    sourceId: profile.clientId,
    sourceKind: 'client_profile',
    loopState,
    evidenceLabel: evidenceLabelForLoopState(loopState, 'computed'),
    confidence: clampConfidence(profile.score / 100),
    title: `${profile.clientName} profile memory`,
    description: primaryGap
      ? `Missing ${profile.missing.join(', ')}.`
      : 'Profile memory is complete.',
    nextAction,
    waitingOn:
      loopState === 'blocked'
        ? { kind: 'person', label: primaryGap ?? 'Client profile detail', followUpAt: null }
        : null,
    resumeContext: resumeContext({
      lastAction: null,
      timestamp: profile.updatedAt ?? null,
      sourceRoute,
      nextStep: nextAction,
    }),
    proofHref: sourceRoute,
    sourceRoute,
    createdAt: profile.updatedAt ?? null,
    dueAt: null,
  }
}

export function mapQueueItemToOperatingLoopItem(item: QueueItem): OperatingLoopItem {
  const loopState: LoopState = item.blocks ? 'blocked' : 'active'
  const waitingOn: WaitingOn | null = item.blocks
    ? { kind: 'decision', label: item.blocks, followUpAt: item.dueAt }
    : null

  return {
    id: `rail:${item.id}`,
    sourceId: item.id,
    sourceKind: item.entityType === 'event' ? 'event' : 'rail',
    loopState,
    evidenceLabel: evidenceLabelForLoopState(loopState, 'computed'),
    confidence: clampConfidence(item.score / 1000),
    title: item.title,
    description: item.description,
    nextAction: item.inlineAction?.type ?? item.title,
    waitingOn,
    resumeContext: resumeContext({
      lastAction: item.contextLine ?? item.context.secondaryLabel ?? null,
      timestamp: item.createdAt,
      sourceRoute: item.href,
      nextStep: item.title,
    }),
    proofHref: item.href,
    sourceRoute: item.href,
    createdAt: item.createdAt,
    dueAt: item.dueAt,
  }
}

export function mapWorkItemToOperatingLoopItem(item: WorkItem): OperatingLoopItem {
  const loopState: LoopState =
    item.category === 'blocked' ? 'blocked' : item.urgency === 'fragile' ? 'active' : 'uncertain'
  const waitingOn: WaitingOn | null = item.blockedBy
    ? { kind: 'decision', label: item.blockedBy, followUpAt: null }
    : null

  return {
    id: `work-surface:${item.id}`,
    sourceId: item.id,
    sourceKind: 'event',
    loopState,
    evidenceLabel: evidenceLabelForLoopState(loopState, item.blockedBy ? 'confirmed' : 'computed'),
    confidence: item.blockedBy ? 1 : item.urgency === 'fragile' ? 0.85 : 0.65,
    title: item.title,
    description: item.description,
    nextAction: item.category === 'blocked' ? `Resolve ${item.blockedBy}` : item.title,
    waitingOn,
    resumeContext: resumeContext({
      lastAction: item.stageLabel,
      timestamp: null,
      sourceRoute: `/events/${item.eventId}`,
      nextStep: item.category === 'blocked' ? `Resolve ${item.blockedBy}` : item.title,
    }),
    proofHref: `/events/${item.eventId}`,
    sourceRoute: `/events/${item.eventId}`,
    createdAt: null,
    dueAt: item.eventDate,
  }
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
