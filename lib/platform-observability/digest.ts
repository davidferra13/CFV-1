import { createElement } from 'react'
import { createAdminClient } from '@/lib/db/admin'
import { sendEmail } from '@/lib/email/send'
import { PlatformObservabilityDigestEmail } from '@/lib/email/templates/platform-observability-digest'
import { getDeveloperNotificationRecipients } from '@/lib/platform/owner-account'
import { getPlatformRuntimeMetadata } from './context'
import {
  PLATFORM_OBSERVABILITY_DIGEST_CONFIG,
  PLATFORM_OBSERVABILITY_TAXONOMY,
  type PlatformObservabilityDigestSection,
  type PlatformObservabilityEventKey,
} from './taxonomy'
import type { PlatformObservabilityEventRecord } from './events'

export type PlatformDigestMetric = {
  label: string
  count: number
}

export type PlatformDigestBreakdown = {
  label: string
  count: number
  share: number
}

export type PlatformDigestChange = {
  label: string
  currentCount: number
  previousCount: number
  percentChange: number | null
}

export type PlatformDigestCriticalItem = {
  label: string
  summary: string
  occurredAt: string
  source: string
}

export type PlatformObservabilityDigestSummary = {
  generatedAt: string
  dateLabel: string
  periodLabel: string
  runtime: {
    environment: string
    buildSurface: string | null
    buildId: string | null
    release: string | null
    appUrl: string | null
  }
  totals: {
    totalEvents: number
    newUsers: number
    stayUpdatedSubscriptions: number
    betaWaitlistSignups: number
    authEvents: number
    featureEvents: number
    conversionEvents: number
    criticalEvents: number
    realtimeAlertsSent: number
  }
  sectionMetrics: PlatformDigestMetric[]
  eventKeyBreakdown: PlatformDigestBreakdown[]
  featureUsage: PlatformDigestBreakdown[]
  sourceBreakdown: PlatformDigestBreakdown[]
  pathBreakdown: PlatformDigestBreakdown[]
  actorBreakdown: PlatformDigestBreakdown[]
  notableChanges: PlatformDigestChange[]
  criticalItems: PlatformDigestCriticalItem[]
}

const DIGEST_RECIPIENTS = getDeveloperNotificationRecipients()
const MAX_DIGEST_ROWS = 10_000
const DIGEST_NOISE_EVENT_KEYS = new Set<PlatformObservabilityEventKey>([
  'feature.session_heartbeat',
])
const DIGEST_EXCLUDED_EVENT_KEYS = new Set<PlatformObservabilityEventKey>([
  'auth.sign_in_succeeded',
])

const FEATURE_KEYS = new Set(
  Object.entries(PLATFORM_OBSERVABILITY_TAXONOMY)
    .filter(
      ([eventKey, definition]) =>
        definition.group === 'feature' &&
        definition.dailyDigest &&
        !DIGEST_NOISE_EVENT_KEYS.has(eventKey as PlatformObservabilityEventKey)
    )
    .map(([eventKey]) => eventKey as PlatformObservabilityEventKey)
)

const CHANGE_METRICS: Array<{ label: string; keys: PlatformObservabilityEventKey[] }> = [
  {
    label: 'New users',
    keys: ['account.chef_signed_up', 'account.client_signed_up'],
  },
  {
    label: 'Stay Updated subscriptions',
    keys: ['subscription.stay_updated_subscribed'],
  },
  {
    label: 'Beta waitlist signups',
    keys: ['subscription.beta_waitlist_joined'],
  },
  {
    label: 'Public inquiries',
    keys: ['conversion.public_inquiry_submitted'],
  },
  {
    label: 'Critical system events',
    keys: ['system.client_error_reported', 'system.cron_job_failed'],
  },
]

function countByEventKeys(
  events: PlatformObservabilityEventRecord[],
  keys: PlatformObservabilityEventKey[]
): number {
  const keySet = new Set(keys)
  return events.filter((event) => keySet.has(event.event_key)).length
}

function countByGroup(events: PlatformObservabilityEventRecord[], group: string): number {
  return events.filter((event) => PLATFORM_OBSERVABILITY_TAXONOMY[event.event_key].group === group)
    .length
}

function countBySection(
  events: PlatformObservabilityEventRecord[],
  section: PlatformObservabilityDigestSection
): number {
  return events.filter(
    (event) =>
      PLATFORM_OBSERVABILITY_TAXONOMY[event.event_key].digestSection === section &&
      !DIGEST_NOISE_EVENT_KEYS.has(event.event_key)
  ).length
}

function toPercent(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

function buildBreakdown(
  counts: Map<string, number>,
  total: number,
  limit = 6
): PlatformDigestBreakdown[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      share: toPercent(count, total),
    }))
}

function buildFeatureUsage(events: PlatformObservabilityEventRecord[]): PlatformDigestBreakdown[] {
  const counts = new Map<string, number>()
  let total = 0

  for (const event of events) {
    if (!FEATURE_KEYS.has(event.event_key)) continue
    total += 1
    const label = PLATFORM_OBSERVABILITY_TAXONOMY[event.event_key].label
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return buildBreakdown(counts, total)
}

function buildSourceBreakdown(
  events: PlatformObservabilityEventRecord[]
): PlatformDigestBreakdown[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    counts.set(event.source, (counts.get(event.source) ?? 0) + 1)
  }
  return buildBreakdown(counts, events.length)
}

function buildEventKeyBreakdown(
  events: PlatformObservabilityEventRecord[]
): PlatformDigestBreakdown[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (DIGEST_NOISE_EVENT_KEYS.has(event.event_key)) continue
    counts.set(event.event_key, (counts.get(event.event_key) ?? 0) + 1)
  }
  return buildBreakdown(counts, events.length, 8)
}

function buildPathBreakdown(events: PlatformObservabilityEventRecord[]): PlatformDigestBreakdown[] {
  const counts = new Map<string, number>()
  let total = 0
  for (const event of events) {
    const path =
      typeof event.metadata?.request_path === 'string'
        ? event.metadata.request_path
        : typeof event.metadata?.pathname === 'string'
          ? event.metadata.pathname
          : null
    if (!path) continue
    total += 1
    counts.set(path, (counts.get(path) ?? 0) + 1)
  }
  return buildBreakdown(counts, total)
}

function buildActorBreakdown(
  events: PlatformObservabilityEventRecord[]
): PlatformDigestBreakdown[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    const actorLabel = event.actor_type.replace(/_/g, ' ')
    counts.set(actorLabel, (counts.get(actorLabel) ?? 0) + 1)
  }
  return buildBreakdown(counts, events.length)
}

function calculatePercentChange(currentCount: number, previousCount: number): number | null {
  if (previousCount === 0) {
    return currentCount === 0 ? 0 : null
  }
  return Math.round(((currentCount - previousCount) / previousCount) * 100)
}

function shouldIncludeNotableChange(currentCount: number, previousCount: number): boolean {
  if (currentCount === previousCount) return false
  if (previousCount === 0) return currentCount >= 3
  const absoluteDelta = Math.abs(currentCount - previousCount)
  const relativeDelta = absoluteDelta / previousCount
  return absoluteDelta >= 3 && relativeDelta >= 0.5
}

function buildNotableChanges(
  currentEvents: PlatformObservabilityEventRecord[],
  previousEvents: PlatformObservabilityEventRecord[]
): PlatformDigestChange[] {
  return CHANGE_METRICS.map((metric) => {
    const currentCount = countByEventKeys(currentEvents, metric.keys)
    const previousCount = countByEventKeys(previousEvents, metric.keys)
    return {
      label: metric.label,
      currentCount,
      previousCount,
      percentChange: calculatePercentChange(currentCount, previousCount),
    }
  })
    .filter((change) => shouldIncludeNotableChange(change.currentCount, change.previousCount))
    .slice(0, 6)
}

function buildCriticalItems(
  events: PlatformObservabilityEventRecord[]
): PlatformDigestCriticalItem[] {
  return events
    .filter((event) => event.severity === 'critical')
    .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
    .slice(0, 8)
    .map((event) => ({
      label: PLATFORM_OBSERVABILITY_TAXONOMY[event.event_key].label,
      summary: event.summary,
      occurredAt: event.occurred_at,
      source: event.source,
    }))
}

function getDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: PLATFORM_OBSERVABILITY_DIGEST_CONFIG.timezone,
  })
}

function getPeriodLabel(windowStart: string, windowEnd: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: PLATFORM_OBSERVABILITY_DIGEST_CONFIG.timezone,
  })

  return `${formatter.format(new Date(windowStart))} - ${formatter.format(new Date(windowEnd))} ${
    PLATFORM_OBSERVABILITY_DIGEST_CONFIG.timezone
  }`
}

export function summarizePlatformObservabilityEvents(
  currentEvents: PlatformObservabilityEventRecord[],
  previousEvents: PlatformObservabilityEventRecord[],
  options: {
    generatedAt?: string
    windowStart: string
    windowEnd: string
  }
): PlatformObservabilityDigestSummary {
  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const totalEvents = currentEvents.length
  const runtime = getPlatformRuntimeMetadata()

  return {
    generatedAt,
    dateLabel: getDateLabel(generatedAt),
    periodLabel: getPeriodLabel(options.windowStart, options.windowEnd),
    runtime: {
      environment: runtime.environment,
      buildSurface: runtime.build_surface,
      buildId: runtime.build_id,
      release: runtime.release,
      appUrl: runtime.app_url,
    },
    totals: {
      totalEvents,
      newUsers: countByEventKeys(currentEvents, [
        'account.chef_signed_up',
        'account.client_signed_up',
      ]),
      stayUpdatedSubscriptions: countByEventKeys(currentEvents, [
        'subscription.stay_updated_subscribed',
      ]),
      betaWaitlistSignups: countByEventKeys(currentEvents, ['subscription.beta_waitlist_joined']),
      authEvents: countByGroup(currentEvents, 'auth'),
      featureEvents: countByGroup(currentEvents, 'feature'),
      conversionEvents:
        countByGroup(currentEvents, 'conversion') + countByGroup(currentEvents, 'input'),
      criticalEvents: currentEvents.filter((event) => event.severity === 'critical').length,
      realtimeAlertsSent: currentEvents.filter((event) => event.realtime_alert_status === 'sent')
        .length,
    },
    sectionMetrics: [
      { label: 'Growth', count: countBySection(currentEvents, 'growth') },
      { label: 'Subscriptions', count: countBySection(currentEvents, 'subscriptions') },
      { label: 'Authentication', count: countBySection(currentEvents, 'auth') },
      { label: 'Engagement', count: countBySection(currentEvents, 'engagement') },
      { label: 'Conversions', count: countBySection(currentEvents, 'conversion') },
      { label: 'System', count: countBySection(currentEvents, 'system') },
    ],
    eventKeyBreakdown: buildEventKeyBreakdown(currentEvents),
    featureUsage: buildFeatureUsage(currentEvents),
    sourceBreakdown: buildSourceBreakdown(currentEvents),
    pathBreakdown: buildPathBreakdown(currentEvents),
    actorBreakdown: buildActorBreakdown(currentEvents),
    notableChanges: buildNotableChanges(currentEvents, previousEvents),
    criticalItems: buildCriticalItems(currentEvents),
  }
}

async function fetchDigestWindow(
  windowStart: string,
  windowEnd: string
): Promise<PlatformObservabilityEventRecord[]> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('platform_observability_events')
    .select(
      'id, event_key, severity, source, scope, summary, details, actor_type, actor_id, auth_user_id, tenant_id, subject_type, subject_id, metadata, occurred_at, realtime_alert_enabled, daily_digest_enabled, alert_dedupe_key, realtime_alert_sent_at, realtime_alert_status, created_at'
    )
    .eq('daily_digest_enabled', true)
    .gte('occurred_at', windowStart)
    .lt('occurred_at', windowEnd)
    .order('occurred_at', { ascending: false })
    .limit(MAX_DIGEST_ROWS)

  if (error) {
    console.error('[platform-observability] digest window query failed:', error)
    return []
  }

  return ((data ?? []) as PlatformObservabilityEventRecord[]).filter(
    (event) => !DIGEST_EXCLUDED_EVENT_KEYS.has(event.event_key)
  )
}

export async function buildPlatformObservabilityDigest(options?: {
  windowHours?: number
  now?: Date
}): Promise<PlatformObservabilityDigestSummary> {
  const now = options?.now ?? new Date()
  const windowHours = Math.max(
    1,
    options?.windowHours ?? PLATFORM_OBSERVABILITY_DIGEST_CONFIG.windowHours
  )
  const windowEnd = now.toISOString()
  const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString()
  const previousWindowStart = new Date(
    now.getTime() - windowHours * 2 * 60 * 60 * 1000
  ).toISOString()

  const [currentEvents, previousEvents] = await Promise.all([
    fetchDigestWindow(windowStart, windowEnd),
    fetchDigestWindow(previousWindowStart, windowStart),
  ])

  return summarizePlatformObservabilityEvents(currentEvents, previousEvents, {
    generatedAt: now.toISOString(),
    windowStart,
    windowEnd,
  })
}

export async function sendPlatformObservabilityDigest(): Promise<{
  sent: boolean
  summary: string
  totalEvents: number
  criticalEvents: number
  realtimeAlertsSent: number
  notableChanges: number
}> {
  try {
    const { isDeveloperAlertsEnabled } = await import('@/lib/email/developer-alerts')
    if (!isDeveloperAlertsEnabled()) {
      console.log('[platform-observability] Alerts disabled, skipping ops digest')
      return {
        sent: false,
        summary: 'Alerts disabled',
        totalEvents: 0,
        criticalEvents: 0,
        realtimeAlertsSent: 0,
        notableChanges: 0,
      }
    }

    const digest = await buildPlatformObservabilityDigest()
    const react = createElement(PlatformObservabilityDigestEmail, digest)
    const issueCount = digest.totals.criticalEvents + digest.notableChanges.length
    const subject =
      issueCount > 0
        ? `Developer Ops Digest ${digest.dateLabel} - ${issueCount} notable item(s)`
        : `Developer Ops Digest ${digest.dateLabel} - Stable`

    const sent = await sendEmail({
      to: DIGEST_RECIPIENTS,
      subject,
      react,
    })

    return {
      sent,
      summary: `${digest.totals.totalEvents} tracked event(s), ${digest.totals.criticalEvents} critical, ${digest.notableChanges.length} notable change(s)`,
      totalEvents: digest.totals.totalEvents,
      criticalEvents: digest.totals.criticalEvents,
      realtimeAlertsSent: digest.totals.realtimeAlertsSent,
      notableChanges: digest.notableChanges.length,
    }
  } catch (error) {
    console.error('[platform-observability] digest send failed:', error)
    return {
      sent: false,
      summary: `Digest failed: ${error instanceof Error ? error.message : String(error)}`,
      totalEvents: 0,
      criticalEvents: 0,
      realtimeAlertsSent: 0,
      notableChanges: 0,
    }
  }
}
