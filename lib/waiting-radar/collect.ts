import type { UnifiedActionItem } from '@/lib/action-center/types'
import type { OperatingLoopItem } from '@/lib/operating-loop/types'
import { dedupeWaitingRadarItems, rankWaitingRadarItems } from './rank'
import {
  mapOperatingWaitingKind,
  type PaymentWaitingSource,
  type SystemWaitingSource,
  type VendorWaitingSource,
  type WaitingRadarItem,
  type WaitingRadarOptions,
  type WaitingRadarOwner,
  type WaitingRadarResult,
  type WaitingRadarRiskLevel,
  type WaitingRadarSources,
  type WaitingRadarSummary,
} from './types'

const WAITING_STATUSES = new Set([
  'awaiting',
  'awaiting_reply',
  'awaiting_client',
  'awaiting_payment',
  'backordered',
  'delayed',
  'failed',
  'pending',
  'pending_quote',
  'processing',
  'queued',
  'running',
  'snoozed',
  'stalled',
  'waiting',
])

export function collectWaitingRadar(
  sources: WaitingRadarSources,
  options?: WaitingRadarOptions
): WaitingRadarResult {
  const now = options?.now ?? new Date()
  const items = rankWaitingRadarItems(
    dedupeWaitingRadarItems([
      ...collectActionCenterWaitingItems(sources.actionCenterItems ?? [], options),
      ...collectOperatingLoopWaitingItems(sources.operatingLoopItems ?? []),
      ...collectPaymentWaitingItems(sources.payments ?? [], options),
      ...collectVendorWaitingItems(sources.vendors ?? [], options),
      ...collectSystemWaitingItems(sources.systems ?? [], options),
    ]),
    { now }
  )

  return {
    items,
    summary: summarizeWaitingRadar(items, {
      now,
      dueSoonHours: options?.dueSoonHours,
      hasAnySourceData: hasAnySourceData(sources),
    }),
  }
}

export function collectActionCenterWaitingItems(
  items: UnifiedActionItem[],
  options?: WaitingRadarOptions
): WaitingRadarItem[] {
  const now = options?.now ?? new Date()
  const dueSoonHours = options?.dueSoonHours ?? 24

  return items.flatMap((item) => {
    const metadata = item.metadata ?? {}
    const explicitWaitingOn = readString(metadata.waitingOn)
    const explicitReason = readString(metadata.waitingReason)
    const explicitFollowUpAt = readString(metadata.followUpAt)
    const waitingOn = normalizeWaitingOn(explicitWaitingOn) ?? inferActionWaitingOn(item)
    const isSnoozed = item.status === 'snoozed'

    if (!waitingOn && !isSnoozed) return []
    if (item.status === 'completed' || item.status === 'dismissed') return []

    const followUpAt = explicitFollowUpAt ?? item.snoozedUntil ?? item.dueAt
    if (isSnoozed && shouldSuppressSnoozed(followUpAt, now, dueSoonHours)) return []

    const missingFollowUp = !followUpAt
    const waitingReason =
      explicitReason ??
      (isSnoozed ? `Snoozed until ${formatIsoDate(item.snoozedUntil)}` : item.description) ??
      item.title

    return [
      {
        id: `action-center:${item.source}:${item.sourceId}`,
        sourceId: item.sourceId,
        sourceKind: item.source,
        title: item.title,
        description: item.description,
        waitingOn: isSnoozed ? 'time' : (waitingOn ?? 'unknown'),
        waitingReason: missingFollowUp ? `Set follow-up: ${waitingReason}` : waitingReason,
        followUpAt,
        proofHref: item.actionUrl ?? fallbackActionHref(item),
        riskLevel: missingFollowUp
          ? bumpMinimumRisk(deriveActionRisk(item.priority, followUpAt, now), 'medium')
          : deriveActionRisk(item.priority, followUpAt, now),
        createdAt: item.createdAt,
        waitingSince: item.createdAt,
        metadata: {
          ...metadata,
          operatingLoopContract: missingFollowUp ? 'missing_follow_up' : 'waiting_with_follow_up',
        },
      },
    ]
  })
}

export function collectOperatingLoopWaitingItems(
  items: OperatingLoopItem[],
  options?: WaitingRadarOptions
): WaitingRadarItem[] {
  const now = options?.now ?? new Date()
  const dueSoonHours = options?.dueSoonHours ?? 24

  return items.flatMap((item) => {
    if (!['waiting', 'blocked', 'snoozed'].includes(item.loopState)) return []
    const proofHref = item.proofHref ?? item.sourceRoute
    if (!proofHref) return []

    const followUpAt = item.waitingOn?.followUpAt ?? item.dueAt
    if (item.loopState === 'snoozed' && shouldSuppressSnoozed(followUpAt, now, dueSoonHours)) {
      return []
    }

    const missingFollowUp = !followUpAt
    const waitingReason = item.waitingOn?.label ?? item.nextAction ?? item.description ?? item.title

    return [
      {
        id: `operating-loop:${item.sourceKind}:${item.sourceId}`,
        sourceId: item.sourceId,
        sourceKind: item.sourceKind,
        title: item.title,
        description: item.description,
        waitingOn:
          item.loopState === 'snoozed'
            ? 'time'
            : mapOperatingWaitingKind(item.waitingOn?.kind ?? null),
        waitingReason: missingFollowUp ? `Set follow-up: ${waitingReason}` : waitingReason,
        followUpAt,
        proofHref,
        riskLevel: missingFollowUp
          ? bumpMinimumRisk(deriveOperatingRisk(item), 'medium')
          : deriveOperatingRisk(item),
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
  payments: PaymentWaitingSource[],
  options?: WaitingRadarOptions
): WaitingRadarItem[] {
  const now = options?.now ?? new Date()

  return payments.flatMap((payment) => {
    if (!isWaitingStatus(payment.status)) return []
    const followUpAt = payment.followUpAt ?? payment.dueAt ?? null

    return [
      {
        id: `payment:${payment.id}`,
        sourceId: payment.id,
        sourceKind: 'payment',
        title: payment.title ?? payment.clientName ?? 'Payment waiting',
        description:
          payment.outstandingCents == null
            ? null
            : `Outstanding balance: ${formatCurrencyCents(payment.outstandingCents)}`,
        waitingOn: 'payment',
        waitingReason: payment.status ? humanizeStatus(payment.status) : 'Payment is pending',
        followUpAt,
        proofHref: requiredHref(
          payment.proofHref ?? payment.href ?? payment.route,
          payment.id,
          'payments'
        ),
        riskLevel: deriveDatedRisk(
          followUpAt,
          now,
          payment.status === 'failed' ? 'critical' : 'high'
        ),
        createdAt: payment.createdAt ?? null,
        waitingSince: payment.waitingSince ?? payment.createdAt ?? null,
        metadata: payment.metadata ?? {},
      },
    ]
  })
}

export function collectVendorWaitingItems(
  vendors: VendorWaitingSource[],
  options?: WaitingRadarOptions
): WaitingRadarItem[] {
  const now = options?.now ?? new Date()

  return vendors.flatMap((vendor) => {
    if (!isWaitingStatus(vendor.status)) return []
    const followUpAt = vendor.followUpAt ?? vendor.neededBy ?? null

    return [
      {
        id: `vendor:${vendor.id}`,
        sourceId: vendor.id,
        sourceKind: 'vendor',
        title: vendor.title ?? vendor.vendorName ?? 'Vendor waiting',
        description: vendor.neededBy ? `Needed by ${formatIsoDate(vendor.neededBy)}` : null,
        waitingOn: 'vendor',
        waitingReason: vendor.status ? humanizeStatus(vendor.status) : 'Vendor response is pending',
        followUpAt,
        proofHref: requiredHref(
          vendor.proofHref ?? vendor.href ?? vendor.route,
          vendor.id,
          'vendors'
        ),
        riskLevel: deriveDatedRisk(followUpAt, now, 'medium'),
        createdAt: vendor.createdAt ?? null,
        waitingSince: vendor.waitingSince ?? vendor.createdAt ?? null,
        metadata: vendor.metadata ?? {},
      },
    ]
  })
}

export function collectSystemWaitingItems(
  systems: SystemWaitingSource[],
  options?: WaitingRadarOptions
): WaitingRadarItem[] {
  const now = options?.now ?? new Date()

  return systems.flatMap((system) => {
    if (!isWaitingStatus(system.status)) return []
    const followUpAt = system.followUpAt ?? null

    return [
      {
        id: `system:${system.id}`,
        sourceId: system.id,
        sourceKind: 'system',
        title: system.title ?? system.jobName ?? 'System job waiting',
        description: system.status ? humanizeStatus(system.status) : null,
        waitingOn: 'system',
        waitingReason: system.status ? humanizeStatus(system.status) : 'System work is pending',
        followUpAt,
        proofHref: requiredHref(
          system.proofHref ?? system.href ?? system.route,
          system.id,
          'system'
        ),
        riskLevel: deriveDatedRisk(followUpAt, now, system.status === 'failed' ? 'high' : 'low'),
        createdAt: system.createdAt ?? system.startedAt ?? null,
        waitingSince: system.waitingSince ?? system.startedAt ?? system.createdAt ?? null,
        metadata: system.metadata ?? {},
      },
    ]
  })
}

export function summarizeWaitingRadar(
  items: WaitingRadarItem[],
  options?: { now?: Date; dueSoonHours?: number; hasAnySourceData?: boolean }
): WaitingRadarSummary {
  const now = options?.now ?? new Date()
  const dueSoonMs = (options?.dueSoonHours ?? 24) * 60 * 60 * 1000
  const dueSoonCutoff = now.getTime() + dueSoonMs

  return {
    total: items.length,
    overdue: items.filter((item) => isBeforeOrAt(item.followUpAt, now)).length,
    dueSoon: items.filter((item) => {
      if (!item.followUpAt) return false
      const time = new Date(item.followUpAt).getTime()
      return time > now.getTime() && time <= dueSoonCutoff
    }).length,
    noFollowUp: items.filter((item) => !item.followUpAt).length,
    waitingOnClient: items.filter((item) => item.waitingOn === 'client').length,
    waitingOnVendor: items.filter((item) => item.waitingOn === 'vendor').length,
    waitingOnPayment: items.filter((item) => item.waitingOn === 'payment').length,
    waitingOnSystem: items.filter((item) => item.waitingOn === 'system').length,
    emptyReason:
      items.length > 0
        ? null
        : options?.hasAnySourceData === false
          ? 'no_source_data'
          : 'no_waiting_items',
  }
}

function inferActionWaitingOn(item: UnifiedActionItem): WaitingRadarOwner | null {
  const action = readString(item.metadata?.action) ?? item.metadata?.category
  const text = `${item.title} ${item.description ?? ''} ${String(action ?? '')}`.toLowerCase()

  if (item.status === 'snoozed') return 'time'
  if (text.includes('payment') || text.includes('deposit') || text.includes('balance'))
    return 'payment'
  if (text.includes('vendor')) return 'vendor'
  if (text.includes('system') || text.includes('import') || text.includes('sync')) return 'system'
  if (text.includes('reply') || text.includes('inquiry') || text.includes('follow-up'))
    return 'client'
  return null
}

function normalizeWaitingOn(value: string | null): WaitingRadarOwner | null {
  if (!value) return null
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '')
  if (['client', 'reply', 'person'].includes(normalized)) return 'client'
  if (['chef'].includes(normalized)) return 'chef'
  if (['vendor'].includes(normalized)) return 'vendor'
  if (['staff', 'team'].includes(normalized)) return 'staff'
  if (['system', 'import', 'job'].includes(normalized)) return 'system'
  if (['time', 'date'].includes(normalized)) return 'time'
  if (['decision', 'approval'].includes(normalized)) return 'decision'
  if (['payment', 'deposit', 'balance'].includes(normalized)) return 'payment'
  if (['unknown'].includes(normalized)) return 'unknown'
  return null
}

function deriveActionRisk(
  priority: UnifiedActionItem['priority'],
  followUpAt: string | null,
  now: Date
): WaitingRadarRiskLevel {
  if (followUpAt && new Date(followUpAt).getTime() <= now.getTime()) return 'high'
  if (priority === 'urgent') return 'critical'
  if (priority === 'high') return 'high'
  if (priority === 'medium') return 'medium'
  return 'low'
}

function deriveOperatingRisk(item: OperatingLoopItem): WaitingRadarRiskLevel {
  if (item.loopState === 'blocked') return 'high'
  if (item.sourceKind === 'payment') return 'high'
  if (item.sourceKind === 'quote' || item.sourceKind === 'event') return 'medium'
  return 'low'
}

function deriveDatedRisk(
  followUpAt: string | null,
  now: Date,
  defaultRisk: WaitingRadarRiskLevel
): WaitingRadarRiskLevel {
  if (!followUpAt) return defaultRisk
  return new Date(followUpAt).getTime() <= now.getTime() ? 'critical' : defaultRisk
}

function bumpMinimumRisk(
  risk: WaitingRadarRiskLevel,
  minimum: Exclude<WaitingRadarRiskLevel, 'low'>
): WaitingRadarRiskLevel {
  const order: Record<WaitingRadarRiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  }

  return order[risk] >= order[minimum] ? risk : minimum
}

function shouldSuppressSnoozed(
  followUpAt: string | null,
  now: Date,
  dueSoonHours: number
): boolean {
  if (!followUpAt) return false
  const time = new Date(followUpAt).getTime()
  if (!Number.isFinite(time)) return false
  return time - now.getTime() > dueSoonHours * 60 * 60 * 1000
}

function isWaitingStatus(status: string | null | undefined): boolean {
  if (!status) return true
  return WAITING_STATUSES.has(status.toLowerCase())
}

function isBeforeOrAt(value: string | null, now: Date): boolean {
  return value ? new Date(value).getTime() <= now.getTime() : false
}

function hasAnySourceData(sources: WaitingRadarSources): boolean {
  return [
    sources.actionCenterItems,
    sources.operatingLoopItems,
    sources.payments,
    sources.vendors,
    sources.systems,
  ].some((items) => (items?.length ?? 0) > 0)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function requiredHref(value: string | null | undefined, id: string, routeBase: string): string {
  return value && value.trim() ? value : `/${routeBase}/${id}`
}

function fallbackActionHref(item: UnifiedActionItem): string {
  if (item.eventId) return `/events/${item.eventId}`
  if (item.clientId) return `/clients/${item.clientId}`
  if (item.inquiryId) return `/inquiries/${item.inquiryId}`
  return `/${item.source}s`
}

function formatIsoDate(value: string | null): string {
  if (!value) return 'follow-up'
  return value.slice(0, 10)
}

function humanizeStatus(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatCurrencyCents(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100)
}
