import type { BreadcrumbSession } from '@/lib/activity/breadcrumb-types'
import type { ChefActivityEntry, ChefActivityDomain, ResumeItem } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'
import { getChefActivityEntityHref } from '@/lib/activity/entity-routes'
import type { ActivityEvent } from '@/lib/activity/types'

export type ReplayPeriodId = 'today' | 'yesterday' | 'earlier-week'
export type ReplaySource = 'chef' | 'client'

export type ReplayItem = {
  id: string
  source: ReplaySource
  label: string
  detail: string | null
  createdAt: string
  href: string | null
  domainLabel: string
}

export type ReplayPeriod = {
  id: ReplayPeriodId
  label: string
  chefActionCount: number
  clientSignalCount: number
  items: ReplayItem[]
}

export type ReplayDomainCount = {
  domain: ChefActivityDomain
  label: string
  count: number
}

export type ChefFlowReplay = {
  generatedAt: string
  chefActionCount: number
  clientSignalCount: number
  resumeCount: number
  retraceSessionCount: number
  topDomains: ReplayDomainCount[]
  periods: ReplayPeriod[]
  resumeItems: ResumeItem[]
  retraceSessions: BreadcrumbSession[]
}

type ReplayInput = {
  chefActivity: ChefActivityEntry[]
  clientActivity: ActivityEvent[]
  resumeItems: ResumeItem[]
  breadcrumbSessions: BreadcrumbSession[]
  now?: Date
}

const CLIENT_EVENT_LABELS: Record<string, string> = {
  portal_login: 'Client logged into the portal',
  event_viewed: 'Client viewed an event',
  quote_viewed: 'Client viewed a quote',
  invoice_viewed: 'Client viewed an invoice',
  proposal_viewed: 'Client viewed a proposal',
  chat_message_sent: 'Client sent a chat message',
  rsvp_submitted: 'Client submitted an RSVP',
  form_submitted: 'Client submitted a form',
  page_viewed: 'Client visited a page',
  payment_page_visited: 'Client reached the payment page',
  document_downloaded: 'Client downloaded a document',
  events_list_viewed: 'Client browsed events',
  quotes_list_viewed: 'Client browsed quotes',
  chat_opened: 'Client opened messages',
  rewards_viewed: 'Client browsed rewards',
  public_profile_viewed: 'Client viewed the public profile',
}

export function buildChefFlowReplay(input: ReplayInput): ChefFlowReplay {
  const now = input.now ?? new Date()
  const periods = createReplayPeriods()
  const periodMap = new Map(periods.map((period) => [period.id, period]))

  for (const entry of input.chefActivity) {
    const periodId = resolveReplayPeriod(entry.created_at, now)
    if (!periodId) continue

    const period = periodMap.get(periodId)
    if (!period) continue

    period.chefActionCount += 1
    period.items.push(normalizeChefActivity(entry))
  }

  for (const event of input.clientActivity) {
    const periodId = resolveReplayPeriod(event.created_at, now)
    if (!periodId) continue

    const period = periodMap.get(periodId)
    if (!period) continue

    period.clientSignalCount += 1
    period.items.push(normalizeClientActivity(event))
  }

  for (const period of periods) {
    period.items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    period.items = period.items.slice(0, 12)
  }

  return {
    generatedAt: now.toISOString(),
    chefActionCount: input.chefActivity.length,
    clientSignalCount: input.clientActivity.length,
    resumeCount: input.resumeItems.length,
    retraceSessionCount: input.breadcrumbSessions.length,
    topDomains: getTopDomains(input.chefActivity),
    periods,
    resumeItems: input.resumeItems.slice(0, 8),
    retraceSessions: input.breadcrumbSessions.slice(0, 4),
  }
}

function createReplayPeriods(): ReplayPeriod[] {
  return [
    {
      id: 'today',
      label: 'Today',
      chefActionCount: 0,
      clientSignalCount: 0,
      items: [],
    },
    {
      id: 'yesterday',
      label: 'Yesterday',
      chefActionCount: 0,
      clientSignalCount: 0,
      items: [],
    },
    {
      id: 'earlier-week',
      label: 'Earlier this week',
      chefActionCount: 0,
      clientSignalCount: 0,
      items: [],
    },
  ]
}

function resolveReplayPeriod(createdAt: string, now: Date): ReplayPeriodId | null {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null

  const startToday = startOfDay(now)
  const startYesterday = new Date(startToday)
  startYesterday.setDate(startYesterday.getDate() - 1)
  const startSevenDaysAgo = new Date(startToday)
  startSevenDaysAgo.setDate(startSevenDaysAgo.getDate() - 6)

  if (date >= startToday) return 'today'
  if (date >= startYesterday && date < startToday) return 'yesterday'
  if (date >= startSevenDaysAgo && date < startYesterday) return 'earlier-week'
  return null
}

function startOfDay(input: Date): Date {
  const date = new Date(input)
  date.setHours(0, 0, 0, 0)
  return date
}

function normalizeChefActivity(entry: ChefActivityEntry): ReplayItem {
  const config = DOMAIN_CONFIG[entry.domain] ?? DOMAIN_CONFIG.operational
  return {
    id: `chef-${entry.id}`,
    source: 'chef',
    label: entry.summary,
    detail: buildChefDetail(entry),
    createdAt: entry.created_at,
    href: getChefActivityEntityHref(entry.entity_type, entry.entity_id),
    domainLabel: config.label,
  }
}

function normalizeClientActivity(event: ActivityEvent): ReplayItem {
  return {
    id: `client-${event.id}`,
    source: 'client',
    label: CLIENT_EVENT_LABELS[event.event_type] ?? event.event_type.replace(/_/g, ' '),
    detail: buildClientDetail(event),
    createdAt: event.created_at,
    href: event.client_id
      ? `/clients/${event.client_id}`
      : getChefActivityEntityHref(event.entity_type, event.entity_id),
    domainLabel: 'Client',
  }
}

function buildChefDetail(entry: ChefActivityEntry): string | null {
  const context = entry.context ?? {}
  const parts = [
    stringValue(context.client_name),
    stringValue(context.event_name),
    stringValue(context.channel) ? `via ${stringValue(context.channel)}` : null,
    numberValue(context.guest_count) ? `${numberValue(context.guest_count)} guests` : null,
    stringValue(context.amount_display),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' | ') : null
}

function buildClientDetail(event: ActivityEvent): string | null {
  const metadata = event.metadata ?? {}
  const parts = [
    stringValue(metadata.client_name),
    stringValue(metadata.occasion),
    stringValue(metadata.page_path),
    stringValue(metadata.amount_display),
  ].filter(Boolean)

  if (parts.length > 0) return parts.join(' | ')
  if (event.entity_type) return event.entity_type
  return null
}

function getTopDomains(entries: ChefActivityEntry[]): ReplayDomainCount[] {
  const counts = new Map<ChefActivityDomain, number>()

  for (const entry of entries) {
    counts.set(entry.domain, (counts.get(entry.domain) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([domain, count]) => ({
      domain,
      label: DOMAIN_CONFIG[domain]?.label ?? domain,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
