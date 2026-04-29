import type { BreadcrumbSession } from '@/lib/activity/breadcrumb-types'
import type { ChefActivityEntry, ChefActivityDomain, ResumeItem } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'
import { getChefActivityEntityHref } from '@/lib/activity/entity-routes'
import type { ActivityEvent } from '@/lib/activity/types'

export type ReplayPeriodId = 'today' | 'yesterday' | 'earlier-week'
export type ReplaySource = 'chef' | 'client'
export type ReplayActionPriority = 'high' | 'medium' | 'low'
export type ReplayActionCategory =
  | 'needs-action'
  | 'client-signal'
  | 'money'
  | 'prep'
  | 'quote'
  | 'message'
  | 'history'

export type ReplayItem = {
  id: string
  source: ReplaySource
  label: string
  detail: string | null
  createdAt: string
  href: string | null
  domainLabel: string
  domain: ChefActivityDomain | 'client'
  entityType: string | null
  entityId: string | null
  clientId: string | null
  actionKey: string
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

export type ReplayActionItem = {
  id: string
  title: string
  reason: string
  priority: ReplayActionPriority
  category: ReplayActionCategory
  href: string | null
  primaryActionLabel: string
  secondaryHref: string | null
  secondaryActionLabel: string | null
  sourceItemIds: string[]
}

export type ReplayResumeCard = ResumeItem & {
  whyNow: string
  nextAction: string
  actionLabel: string
}

export type ReplayComebackSignal = {
  id: string
  title: string
  detail: string | null
  href: string | null
  communicationHref: string | null
  intent: 'payment' | 'proposal' | 'quote' | 'message' | 'rsvp' | 'document' | 'portal'
  createdAt: string
  sourceItemId: string
}

export type ReplayChangeGroup = {
  id: string
  title: string
  detail: string
  count: number
  href: string | null
  lastChangedAt: string
  domainLabels: string[]
  sourceItemIds: string[]
}

export type ReplayDailyStart = {
  title: string
  summary: string
  tone: 'quiet' | 'client' | 'prep' | 'money' | 'busy'
  openLoopCount: number
  clientSignalCount: number
  moneySignalCount: number
  prepSignalCount: number
}

export type ReplaySinceYouLeft = {
  anchorAt: string | null
  anchorLabel: string
  items: ReplayItem[]
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
  resumeCards: ReplayResumeCard[]
  retraceSessions: BreadcrumbSession[]
  actionDigest: ReplayActionItem[]
  comebackSignals: ReplayComebackSignal[]
  changeGroups: ReplayChangeGroup[]
  dailyStart: ReplayDailyStart
  sinceYouLeft: ReplaySinceYouLeft
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

const HIGH_INTENT_CLIENT_EVENTS = new Set<string>([
  'payment_page_visited',
  'proposal_viewed',
  'quote_viewed',
  'invoice_viewed',
  'chat_opened',
  'chat_message_sent',
  'rsvp_submitted',
  'document_downloaded',
])

export function buildChefFlowReplay(input: ReplayInput): ChefFlowReplay {
  const now = input.now ?? new Date()
  const periods = createReplayPeriods()
  const periodMap = new Map(periods.map((period) => [period.id, period]))
  const normalizedItems: ReplayItem[] = []

  for (const entry of input.chefActivity) {
    const item = normalizeChefActivity(entry)
    normalizedItems.push(item)

    const periodId = resolveReplayPeriod(entry.created_at, now)
    if (!periodId) continue

    const period = periodMap.get(periodId)
    if (!period) continue

    period.chefActionCount += 1
    period.items.push(item)
  }

  for (const event of input.clientActivity) {
    const item = normalizeClientActivity(event)
    normalizedItems.push(item)

    const periodId = resolveReplayPeriod(event.created_at, now)
    if (!periodId) continue

    const period = periodMap.get(periodId)
    if (!period) continue

    period.clientSignalCount += 1
    period.items.push(item)
  }

  for (const period of periods) {
    period.items.sort(sortReplayItems)
    period.items = period.items.slice(0, 12)
  }

  normalizedItems.sort(sortReplayItems)

  const resumeCards = input.resumeItems.slice(0, 8).map(buildResumeCard)
  const comebackSignals = buildComebackSignals(input.clientActivity)
  const changeGroups = buildChangeGroups(input.chefActivity)
  const actionDigest = buildActionDigest({
    resumeCards,
    comebackSignals,
    changeGroups,
  })

  return {
    generatedAt: now.toISOString(),
    chefActionCount: input.chefActivity.length,
    clientSignalCount: input.clientActivity.length,
    resumeCount: input.resumeItems.length,
    retraceSessionCount: input.breadcrumbSessions.length,
    topDomains: getTopDomains(input.chefActivity),
    periods,
    resumeItems: input.resumeItems.slice(0, 8),
    resumeCards,
    retraceSessions: input.breadcrumbSessions.slice(0, 4),
    actionDigest,
    comebackSignals,
    changeGroups,
    dailyStart: buildDailyStart({ actionDigest, comebackSignals, changeGroups }),
    sinceYouLeft: buildSinceYouLeft({
      items: normalizedItems,
      breadcrumbSessions: input.breadcrumbSessions,
    }),
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
    domain: entry.domain,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    clientId: entry.client_id,
    actionKey: entry.action,
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
    domain: 'client',
    entityType: event.entity_type,
    entityId: event.entity_id,
    clientId: event.client_id,
    actionKey: event.event_type,
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

function buildResumeCard(item: ResumeItem): ReplayResumeCard {
  return {
    ...item,
    whyNow: getResumeWhyNow(item),
    nextAction: getResumeNextAction(item),
    actionLabel: getResumeActionLabel(item),
  }
}

function getResumeWhyNow(item: ResumeItem): string {
  if (item.type === 'inquiry') return 'An inquiry is still waiting for a clear next step.'
  if (item.type === 'quote' && item.status.toLowerCase() === 'draft') {
    return 'The quote is still in draft, so the sales loop is not closed.'
  }
  if (item.type === 'quote') return 'The quote is active and should stay visible until resolved.'
  if (item.type === 'event') return 'This event is still in the active operating window.'
  if (item.type === 'menu') return 'This menu can affect client approval, prep, and costing.'
  if (item.type === 'note') return 'A recent or pinned note may need relationship follow-through.'
  return 'This item is still open in ChefFlow.'
}

function getResumeNextAction(item: ResumeItem): string {
  if (item.type === 'inquiry') return 'Open the inquiry and handle the next response.'
  if (item.type === 'quote' && item.status.toLowerCase() === 'draft')
    return 'Finish and send the quote.'
  if (item.type === 'quote') return 'Review the quote status and follow up if needed.'
  if (item.type === 'event') return 'Open the event and check readiness.'
  if (item.type === 'menu') return 'Open the menu and continue review.'
  if (item.type === 'note') return 'Open the client note.'
  return 'Resume this work.'
}

function getResumeActionLabel(item: ResumeItem): string {
  if (item.type === 'inquiry') return 'Open next step'
  if (item.type === 'quote')
    return item.status.toLowerCase() === 'draft' ? 'Resume quote' : 'Open quote'
  if (item.type === 'event') return 'Open event'
  if (item.type === 'menu') return 'Open menu'
  if (item.type === 'note') return 'Open note'
  return 'Resume'
}

function buildComebackSignals(events: ActivityEvent[]): ReplayComebackSignal[] {
  return events
    .filter((event) => HIGH_INTENT_CLIENT_EVENTS.has(event.event_type))
    .map((event) => {
      const item = normalizeClientActivity(event)
      const intent = resolveComebackIntent(event.event_type)
      return {
        id: `comeback-${event.id}`,
        title: item.label,
        detail: item.detail,
        href: item.href,
        communicationHref: event.client_id
          ? `/clients/${event.client_id}#communication`
          : item.href,
        intent,
        createdAt: event.created_at,
        sourceItemId: item.id,
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
}

function resolveComebackIntent(eventType: string): ReplayComebackSignal['intent'] {
  if (eventType === 'payment_page_visited' || eventType === 'invoice_viewed') return 'payment'
  if (eventType === 'proposal_viewed') return 'proposal'
  if (eventType === 'quote_viewed') return 'quote'
  if (eventType === 'chat_opened' || eventType === 'chat_message_sent') return 'message'
  if (eventType === 'rsvp_submitted') return 'rsvp'
  if (eventType === 'document_downloaded') return 'document'
  return 'portal'
}

function buildChangeGroups(entries: ChefActivityEntry[]): ReplayChangeGroup[] {
  const groups = new Map<string, ChefActivityEntry[]>()

  for (const entry of entries) {
    if (!entry.entity_id) continue
    const key = `${entry.entity_type}:${entry.entity_id}`
    const group = groups.get(key) ?? []
    group.push(entry)
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const latest = group[0]
      const domainLabels = Array.from(
        new Set(group.map((entry) => DOMAIN_CONFIG[entry.domain]?.label ?? entry.domain))
      )
      return {
        id: `change-${key}`,
        title: `${humanizeEntityType(latest.entity_type)} changed ${group.length} times`,
        detail: `${latest.summary}${domainLabels.length > 0 ? ` | ${domainLabels.join(', ')}` : ''}`,
        count: group.length,
        href: getChefActivityEntityHref(latest.entity_type, latest.entity_id),
        lastChangedAt: latest.created_at,
        domainLabels,
        sourceItemIds: group.map((entry) => `chef-${entry.id}`),
      }
    })
    .filter((group) => group.count > 1)
    .sort((a, b) => new Date(b.lastChangedAt).getTime() - new Date(a.lastChangedAt).getTime())
    .slice(0, 6)
}

function buildActionDigest(input: {
  resumeCards: ReplayResumeCard[]
  comebackSignals: ReplayComebackSignal[]
  changeGroups: ReplayChangeGroup[]
}): ReplayActionItem[] {
  const resumeActions = input.resumeCards.slice(0, 5).map((item) => ({
    id: `resume-${item.type}-${item.id}`,
    title: item.title,
    reason: item.whyNow,
    priority: resolveResumePriority(item),
    category: resolveResumeCategory(item),
    href: item.href,
    primaryActionLabel: item.actionLabel,
    secondaryHref: null,
    secondaryActionLabel: null,
    sourceItemIds: [`resume-${item.type}-${item.id}`],
  }))

  const comebackActions = input.comebackSignals.slice(0, 5).map((signal) => ({
    id: `signal-${signal.id}`,
    title: signal.title,
    reason: getComebackReason(signal),
    priority: signal.intent === 'payment' || signal.intent === 'message' ? 'high' : 'medium',
    category: resolveComebackCategory(signal),
    href: signal.href,
    primaryActionLabel: 'Open client',
    secondaryHref: signal.communicationHref,
    secondaryActionLabel: 'Open communication',
    sourceItemIds: [signal.sourceItemId],
  }))

  const changeActions = input.changeGroups.slice(0, 4).map((group) => ({
    id: `changes-${group.id}`,
    title: group.title,
    reason: 'Multiple updates happened on the same record. Review the latest state before acting.',
    priority: group.count >= 4 ? 'high' : 'medium',
    category: resolveChangeCategory(group),
    href: group.href,
    primaryActionLabel: 'Review changes',
    secondaryHref: null,
    secondaryActionLabel: null,
    sourceItemIds: group.sourceItemIds,
  }))

  return [...comebackActions, ...resumeActions, ...changeActions]
    .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority))
    .slice(0, 10)
}

function buildDailyStart(input: {
  actionDigest: ReplayActionItem[]
  comebackSignals: ReplayComebackSignal[]
  changeGroups: ReplayChangeGroup[]
}): ReplayDailyStart {
  const moneySignalCount = input.actionDigest.filter((item) => item.category === 'money').length
  const prepSignalCount = input.actionDigest.filter((item) => item.category === 'prep').length
  const clientSignalCount = input.comebackSignals.length
  const openLoopCount = input.actionDigest.length

  if (moneySignalCount > 0) {
    return {
      title: 'Money needs attention',
      summary: `${moneySignalCount} payment or quote signal${moneySignalCount === 1 ? '' : 's'} should be reviewed.`,
      tone: 'money',
      openLoopCount,
      clientSignalCount,
      moneySignalCount,
      prepSignalCount,
    }
  }

  if (clientSignalCount > 0) {
    return {
      title: 'Clients came back',
      summary: `${clientSignalCount} client signal${clientSignalCount === 1 ? '' : 's'} appeared in loaded activity.`,
      tone: 'client',
      openLoopCount,
      clientSignalCount,
      moneySignalCount,
      prepSignalCount,
    }
  }

  if (prepSignalCount > 0) {
    return {
      title: 'Prep needs review',
      summary: `${prepSignalCount} event or menu item${prepSignalCount === 1 ? '' : 's'} may affect readiness.`,
      tone: 'prep',
      openLoopCount,
      clientSignalCount,
      moneySignalCount,
      prepSignalCount,
    }
  }

  if (openLoopCount > 0) {
    return {
      title: 'Open loops are ready',
      summary: `${openLoopCount} source-backed item${openLoopCount === 1 ? '' : 's'} can be handled now.`,
      tone: 'busy',
      openLoopCount,
      clientSignalCount,
      moneySignalCount,
      prepSignalCount,
    }
  }

  return {
    title: 'Quiet catch-up',
    summary: 'No source-backed action items were loaded for this period.',
    tone: 'quiet',
    openLoopCount,
    clientSignalCount,
    moneySignalCount,
    prepSignalCount,
  }
}

function buildSinceYouLeft(input: {
  items: ReplayItem[]
  breadcrumbSessions: BreadcrumbSession[]
}): ReplaySinceYouLeft {
  const previousSession = input.breadcrumbSessions[1] ?? null

  if (!previousSession) {
    return {
      anchorAt: null,
      anchorLabel: 'No previous session loaded',
      items: [],
    }
  }

  const anchorTime = new Date(previousSession.ended_at).getTime()
  const items = input.items
    .filter((item) => new Date(item.createdAt).getTime() > anchorTime)
    .sort(sortReplayItems)
    .slice(0, 8)

  return {
    anchorAt: previousSession.ended_at,
    anchorLabel: `Since ${formatShortDateTime(previousSession.ended_at)}`,
    items,
  }
}

function resolveResumePriority(item: ReplayResumeCard): ReplayActionPriority {
  if (item.type === 'inquiry') return 'high'
  if (item.type === 'quote' && item.status.toLowerCase() === 'draft') return 'high'
  if (item.type === 'event') return 'medium'
  return 'low'
}

function resolveResumeCategory(item: ReplayResumeCard): ReplayActionCategory {
  if (item.type === 'quote') return 'quote'
  if (item.type === 'event' || item.type === 'menu') return 'prep'
  if (item.type === 'inquiry') return 'needs-action'
  return 'history'
}

function resolveComebackCategory(signal: ReplayComebackSignal): ReplayActionCategory {
  if (signal.intent === 'payment') return 'money'
  if (signal.intent === 'quote' || signal.intent === 'proposal') return 'quote'
  if (signal.intent === 'message') return 'message'
  return 'client-signal'
}

function resolveChangeCategory(group: ReplayChangeGroup): ReplayActionCategory {
  if (group.domainLabels.some((label) => label.toLowerCase().includes('financial'))) return 'money'
  if (
    group.domainLabels.some((label) => ['event', 'menu', 'schedule'].includes(label.toLowerCase()))
  ) {
    return 'prep'
  }
  return 'history'
}

function getComebackReason(signal: ReplayComebackSignal): string {
  if (signal.intent === 'payment') return 'A client touched a money-related surface.'
  if (signal.intent === 'message') return 'A client returned to communication.'
  if (signal.intent === 'proposal') return 'A proposal view can be a follow-up opportunity.'
  if (signal.intent === 'quote') return 'A quote view can indicate buying intent.'
  if (signal.intent === 'rsvp') return 'Guest activity may change event readiness.'
  if (signal.intent === 'document') return 'A document was downloaded and may need follow-through.'
  return 'A client returned to the portal.'
}

function priorityScore(priority: ReplayActionPriority): number {
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  return 1
}

function humanizeEntityType(value: string | null): string {
  if (!value) return 'Record'
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function sortReplayItems(a: ReplayItem, b: ReplayItem): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function formatShortDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'the previous session'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
