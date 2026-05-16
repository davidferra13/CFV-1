import type { OperatingLoopItem, SourceKind, WaitingOnKind } from './types'

export type WaitingRadarWaitingOn =
  | 'client'
  | 'chef'
  | 'vendor'
  | 'staff'
  | 'system'
  | 'time'
  | 'decision'
  | 'payment'
  | 'unknown'

export type WaitingRadarRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type WaitingRadarFollowUpState = 'overdue' | 'due_soon' | 'scheduled' | 'no_follow_up'

export type WaitingRadarEmptyReason = 'no_source_data' | 'no_waiting_items' | null

export interface WaitingRadarItem {
  id: string
  sourceId: string
  sourceKind: SourceKind
  title: string
  description: string | null
  waitingOn: WaitingRadarWaitingOn
  waitingReason: string
  followUpAt: string | null
  followUpState: WaitingRadarFollowUpState
  proofHref: string
  riskLevel: WaitingRadarRiskLevel
  createdAt: string | null
  waitingSince: string | null
  metadata: Record<string, unknown>
}

export interface PaymentWaitingSource {
  id: string
  clientName?: string | null
  status?: string | null
  outstandingCents?: number | null
  followUpAt?: string | null
  dueAt?: string | null
  createdAt?: string | null
  route?: string | null
  href?: string | null
  proofHref?: string | null
  eventId?: string | null
}

export interface VendorWaitingSource {
  id: string
  vendorName?: string | null
  status?: string | null
  waitingReason?: string | null
  neededBy?: string | null
  followUpAt?: string | null
  createdAt?: string | null
  route?: string | null
  href?: string | null
  proofHref?: string | null
}

export interface SystemWaitingSource {
  id: string
  jobName?: string | null
  status?: string | null
  waitingReason?: string | null
  followUpAt?: string | null
  createdAt?: string | null
  route?: string | null
  href?: string | null
  proofHref?: string | null
}

export interface WaitingRadarSources {
  operatingLoopItems?: OperatingLoopItem[]
  paymentItems?: PaymentWaitingSource[]
  vendorItems?: VendorWaitingSource[]
  systemItems?: SystemWaitingSource[]
}

export interface WaitingRadarSummary {
  total: number
  overdue: number
  dueSoon: number
  noFollowUp: number
  byWaitingOn: Record<WaitingRadarWaitingOn, number>
  bySourceKind: Partial<Record<SourceKind, number>>
  sourceCategories: SourceKind[]
  emptyReason: WaitingRadarEmptyReason
}

export interface WaitingRadarResult {
  items: WaitingRadarItem[]
  summary: WaitingRadarSummary
}

export interface WaitingRadarOptions {
  now?: Date
  dueSoonHours?: number
}

const HOUR_MS = 60 * 60 * 1000

const WAITING_ON_KEYS: WaitingRadarWaitingOn[] = [
  'client',
  'chef',
  'vendor',
  'staff',
  'system',
  'time',
  'decision',
  'payment',
  'unknown',
]

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

function routeFrom(input: {
  route?: string | null
  href?: string | null
  proofHref?: string | null
}): string | null {
  return input.proofHref ?? input.href ?? input.route ?? null
}

function fallbackRoute(sourceKind: SourceKind, sourceId: string): string {
  switch (sourceKind) {
    case 'client_profile':
      return `/clients/${sourceId}`
    case 'event':
      return `/events/${sourceId}`
    case 'inquiry':
      return `/inquiries/${sourceId}`
    case 'menu':
      return `/menus/${sourceId}`
    case 'payment':
      return `/billing/${sourceId}`
    case 'quote':
      return `/quotes/${sourceId}`
    case 'recipe':
      return `/recipes/${sourceId}`
    case 'reminder':
      return `/reminders/${sourceId}`
    case 'task':
      return `/tasks/${sourceId}`
    case 'vendor':
      return `/culinary/vendors/${sourceId}`
    case 'system':
      return '/settings/integrations'
    default:
      return `/operating-loop/${sourceKind}/${sourceId}`
  }
}

function canonicalRoute(
  sourceKind: SourceKind,
  sourceId: string,
  explicitRoute: string | null
): string {
  return explicitRoute ?? fallbackRoute(sourceKind, sourceId)
}

function followUpState(
  followUpAt: string | null,
  options: Required<Pick<WaitingRadarOptions, 'now' | 'dueSoonHours'>>
): WaitingRadarFollowUpState {
  if (!followUpAt) {
    return 'no_follow_up'
  }

  const time = new Date(followUpAt).getTime()
  if (!Number.isFinite(time)) {
    return 'no_follow_up'
  }

  const nowTime = options.now.getTime()
  if (time < nowTime) {
    return 'overdue'
  }

  return time - nowTime <= options.dueSoonHours * HOUR_MS ? 'due_soon' : 'scheduled'
}

function normalizeWaitingOn(
  kind: WaitingOnKind | WaitingRadarWaitingOn | string | null
): WaitingRadarWaitingOn {
  switch (kind) {
    case 'reply':
    case 'person':
      return 'client'
    case 'import':
    case 'system':
      return 'system'
    case 'time':
    case 'decision':
    case 'payment':
    case 'vendor':
      return kind
    case 'client':
    case 'chef':
    case 'staff':
      return kind
    default:
      return 'unknown'
  }
}

function statusIs(status: string | null | undefined, values: string[]): boolean {
  return values.includes(String(status ?? '').toLowerCase())
}

function riskFrom(input: {
  sourceKind: SourceKind
  followUpState: WaitingRadarFollowUpState
  waitingOn: WaitingRadarWaitingOn
  outstandingCents?: number | null
}): WaitingRadarRiskLevel {
  if (input.sourceKind === 'payment' && input.followUpState === 'overdue') {
    return 'critical'
  }

  if (input.sourceKind === 'payment' && (input.outstandingCents ?? 0) > 0) {
    return 'high'
  }

  if (input.followUpState === 'overdue') {
    return 'high'
  }

  if (input.followUpState === 'no_follow_up') {
    return 'medium'
  }

  if (input.waitingOn === 'decision' || input.waitingOn === 'client') {
    return input.followUpState === 'due_soon' ? 'high' : 'medium'
  }

  if (input.waitingOn === 'vendor' || input.followUpState === 'due_soon') {
    return 'medium'
  }

  return 'low'
}

function isWaitingLoopItem(item: OperatingLoopItem): boolean {
  if (item.loopState === 'done' || item.loopState === 'dismissed') {
    return false
  }

  return Boolean(item.waitingOn) || item.loopState === 'waiting' || item.loopState === 'snoozed'
}

export function collectOperatingLoopWaitingItems(
  items: OperatingLoopItem[],
  options: WaitingRadarOptions = {}
): WaitingRadarItem[] {
  const normalizedOptions = {
    now: options.now ?? new Date(),
    dueSoonHours: options.dueSoonHours ?? 24,
  }

  return items.filter(isWaitingLoopItem).flatMap((item) => {
    const followUpAt = normalizeIso(item.waitingOn?.followUpAt ?? item.dueAt)
    const state = followUpState(followUpAt, normalizedOptions)
    const waitingOn = normalizeWaitingOn(item.waitingOn?.kind ?? null)
    const proofHref = canonicalRoute(
      item.sourceKind,
      item.sourceId,
      item.proofHref ?? item.sourceRoute ?? item.resumeContext?.sourceRoute ?? null
    )

    if (item.loopState === 'snoozed' && state === 'scheduled') {
      return []
    }

    const missingFollowUp = state === 'no_follow_up'

    return [
      {
        id: `operating-loop:${item.id}`,
        sourceId: item.sourceId,
        sourceKind: item.sourceKind,
        title: item.title,
        description: item.description,
        waitingOn,
        waitingReason: missingFollowUp
          ? `Set follow-up: ${item.waitingOn?.label ?? item.nextAction ?? 'Waiting'}`
          : (item.waitingOn?.label ?? item.nextAction ?? 'Waiting'),
        followUpAt,
        followUpState: state,
        proofHref,
        riskLevel: riskFrom({ sourceKind: item.sourceKind, followUpState: state, waitingOn }),
        createdAt: item.createdAt,
        waitingSince: item.resumeContext?.timestamp ?? item.createdAt,
        metadata: {
          evidenceLabel: item.evidenceLabel,
          confidence: item.confidence,
          loopState: item.loopState,
          operatingLoopContract: missingFollowUp ? 'missing_follow_up' : 'waiting_with_follow_up',
        },
      },
    ]
  })
}

export function collectPaymentWaitingItems(
  items: PaymentWaitingSource[],
  options: WaitingRadarOptions = {}
): WaitingRadarItem[] {
  const normalizedOptions = {
    now: options.now ?? new Date(),
    dueSoonHours: options.dueSoonHours ?? 24,
  }

  return items
    .filter((item) =>
      statusIs(item.status, [
        'awaiting_payment',
        'pending',
        'past_due',
        'unpaid',
        'requires_payment_method',
        'processing',
      ])
    )
    .map((item) => {
      const followUpAt = normalizeIso(item.followUpAt ?? item.dueAt)
      const state = followUpState(followUpAt, normalizedOptions)
      const proofHref = canonicalRoute(
        'payment',
        item.id,
        routeFrom(item) ?? (item.eventId ? `/events/${item.eventId}/billing` : null)
      )

      return {
        id: `payment:${item.id}`,
        sourceId: item.id,
        sourceKind: 'payment',
        title: item.clientName ? `Payment from ${item.clientName}` : 'Payment follow-up',
        description: null,
        waitingOn: 'payment',
        waitingReason: 'Payment resolution',
        followUpAt,
        followUpState: state,
        proofHref,
        riskLevel: riskFrom({
          sourceKind: 'payment',
          followUpState: state,
          waitingOn: 'payment',
          outstandingCents: item.outstandingCents,
        }),
        createdAt: normalizeIso(item.createdAt),
        waitingSince: normalizeIso(item.createdAt),
        metadata: { status: item.status ?? null, outstandingCents: item.outstandingCents ?? null },
      }
    })
}

export function collectVendorWaitingItems(
  items: VendorWaitingSource[],
  options: WaitingRadarOptions = {}
): WaitingRadarItem[] {
  const normalizedOptions = {
    now: options.now ?? new Date(),
    dueSoonHours: options.dueSoonHours ?? 24,
  }

  return items
    .filter((item) =>
      statusIs(item.status, [
        'awaiting_vendor',
        'pending_quote',
        'pending',
        'backordered',
        'waiting_response',
      ])
    )
    .map((item) => {
      const followUpAt = normalizeIso(item.followUpAt ?? item.neededBy)
      const state = followUpState(followUpAt, normalizedOptions)
      const waitingOn: WaitingRadarWaitingOn = 'vendor'

      return {
        id: `vendor:${item.id}`,
        sourceId: item.id,
        sourceKind: 'vendor',
        title: item.vendorName ? `Vendor response from ${item.vendorName}` : 'Vendor response',
        description: null,
        waitingOn,
        waitingReason: item.waitingReason ?? 'Vendor response',
        followUpAt,
        followUpState: state,
        proofHref: canonicalRoute('vendor', item.id, routeFrom(item)),
        riskLevel: riskFrom({ sourceKind: 'vendor', followUpState: state, waitingOn }),
        createdAt: normalizeIso(item.createdAt),
        waitingSince: normalizeIso(item.createdAt),
        metadata: { status: item.status ?? null },
      }
    })
}

export function collectSystemWaitingItems(
  items: SystemWaitingSource[],
  options: WaitingRadarOptions = {}
): WaitingRadarItem[] {
  const normalizedOptions = {
    now: options.now ?? new Date(),
    dueSoonHours: options.dueSoonHours ?? 24,
  }

  return items
    .filter((item) =>
      statusIs(item.status, ['queued', 'pending', 'running', 'importing', 'syncing', 'waiting'])
    )
    .map((item) => {
      const followUpAt = normalizeIso(item.followUpAt)
      const state = followUpState(followUpAt, normalizedOptions)
      const waitingOn: WaitingRadarWaitingOn = 'system'

      return {
        id: `system:${item.id}`,
        sourceId: item.id,
        sourceKind: 'system',
        title: item.jobName ?? 'System job',
        description: null,
        waitingOn,
        waitingReason: item.waitingReason ?? 'System job completion',
        followUpAt,
        followUpState: state,
        proofHref: canonicalRoute('system', item.id, routeFrom(item)),
        riskLevel: riskFrom({ sourceKind: 'system', followUpState: state, waitingOn }),
        createdAt: normalizeIso(item.createdAt),
        waitingSince: normalizeIso(item.createdAt),
        metadata: { status: item.status ?? null },
      }
    })
}

function riskScore(riskLevel: WaitingRadarRiskLevel): number {
  switch (riskLevel) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'medium':
      return 2
    case 'low':
      return 1
  }
}

function followUpScore(followUpState: WaitingRadarFollowUpState): number {
  switch (followUpState) {
    case 'overdue':
      return 4
    case 'due_soon':
      return 3
    case 'scheduled':
      return 2
    case 'no_follow_up':
      return 1
  }
}

function sourceScore(sourceKind: SourceKind): number {
  switch (sourceKind) {
    case 'payment':
      return 4
    case 'inquiry':
    case 'quote':
    case 'client_profile':
      return 3
    case 'event':
    case 'vendor':
      return 2
    case 'system':
      return 0
    default:
      return 1
  }
}

export function rankWaitingRadarItems(items: WaitingRadarItem[]): WaitingRadarItem[] {
  return [...items].sort((left, right) => {
    const scoreDelta =
      followUpScore(right.followUpState) - followUpScore(left.followUpState) ||
      riskScore(right.riskLevel) - riskScore(left.riskLevel) ||
      sourceScore(right.sourceKind) - sourceScore(left.sourceKind)

    if (scoreDelta !== 0) {
      return scoreDelta
    }

    if (left.followUpAt && right.followUpAt) {
      return new Date(left.followUpAt).getTime() - new Date(right.followUpAt).getTime()
    }

    if (left.followUpAt) {
      return -1
    }

    if (right.followUpAt) {
      return 1
    }

    return left.id.localeCompare(right.id)
  })
}

function dedupeWaitingItems(items: WaitingRadarItem[]): WaitingRadarItem[] {
  const bySource = new Map<string, WaitingRadarItem>()

  for (const item of items) {
    const key = `${item.sourceKind}:${item.sourceId}`
    const existing = bySource.get(key)

    if (!existing || rankWaitingRadarItems([existing, item])[0] === item) {
      bySource.set(key, item)
    }
  }

  return [...bySource.values()]
}

function sourceDataCount(sources: WaitingRadarSources): number {
  return (
    (sources.operatingLoopItems?.length ?? 0) +
    (sources.paymentItems?.length ?? 0) +
    (sources.vendorItems?.length ?? 0) +
    (sources.systemItems?.length ?? 0)
  )
}

export function summarizeWaitingRadar(
  items: WaitingRadarItem[],
  sourceCount: number
): WaitingRadarSummary {
  const byWaitingOn = Object.fromEntries(WAITING_ON_KEYS.map((key) => [key, 0])) as Record<
    WaitingRadarWaitingOn,
    number
  >
  const bySourceKind: Partial<Record<SourceKind, number>> = {}

  for (const item of items) {
    byWaitingOn[item.waitingOn] += 1
    bySourceKind[item.sourceKind] = (bySourceKind[item.sourceKind] ?? 0) + 1
  }

  const emptyReason: WaitingRadarEmptyReason =
    items.length > 0 ? null : sourceCount === 0 ? 'no_source_data' : 'no_waiting_items'

  return {
    total: items.length,
    overdue: items.filter((item) => item.followUpState === 'overdue').length,
    dueSoon: items.filter((item) => item.followUpState === 'due_soon').length,
    noFollowUp: items.filter((item) => item.followUpState === 'no_follow_up').length,
    byWaitingOn,
    bySourceKind,
    sourceCategories: Object.keys(bySourceKind) as SourceKind[],
    emptyReason,
  }
}

export function collectWaitingRadar(
  sources: WaitingRadarSources,
  options: WaitingRadarOptions = {}
): WaitingRadarResult {
  const collected = [
    ...collectOperatingLoopWaitingItems(sources.operatingLoopItems ?? [], options),
    ...collectPaymentWaitingItems(sources.paymentItems ?? [], options),
    ...collectVendorWaitingItems(sources.vendorItems ?? [], options),
    ...collectSystemWaitingItems(sources.systemItems ?? [], options),
  ]
  const items = rankWaitingRadarItems(dedupeWaitingItems(collected))

  return {
    items,
    summary: summarizeWaitingRadar(items, sourceDataCount(sources)),
  }
}
