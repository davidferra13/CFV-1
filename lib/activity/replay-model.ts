import type { BreadcrumbSession } from '@/lib/activity/breadcrumb-types'
import type { ChefActivityDomain, ChefActivityEntry, ResumeItem } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'
import { getChefActivityEntityHref } from '@/lib/activity/entity-routes'
import type { ActivityEvent } from '@/lib/activity/types'

export type ReplayPeriodId = 'today' | 'yesterday' | 'earlier-week'
export type ReplaySource = 'chef' | 'client'
export type ReplayActionPriority = 'urgent' | 'high' | 'normal'
export type ReplayActionCategory =
  | 'resume'
  | 'client'
  | 'money'
  | 'prep'
  | 'communication'
  | 'readiness'
  | 'handoff'
  | 'rule'

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

export type ReplayActionItem = {
  id: string
  title: string
  detail: string
  href: string | null
  source: ReplaySource | 'system'
  priority: ReplayActionPriority
  category: ReplayActionCategory
  createdAt: string
  sourceIds: string[]
}

export type ReplayResumeCard = {
  id: string
  title: string
  subtitle: string
  status: string
  type: ResumeItem['type']
  href: string
  recommendedAction: string
  priority: ReplayActionPriority
}

export type ReplayComebackSignal = {
  id: string
  title: string
  detail: string
  href: string | null
  createdAt: string
  priority: ReplayActionPriority
}

export type ReplayChangeGroup = {
  id: string
  title: string
  detail: string
  href: string | null
  count: number
  latestAt: string
}

export type ReplayDailyStart = {
  headline: string
  focus: string
  nextHref: string | null
  counts: {
    urgent: number
    high: number
    normal: number
  }
}

export type ReplaySinceYouLeft = {
  headline: string
  details: string[]
  latestSessionSummary: string | null
}

export type ReplayClientSignalScore = {
  id: string
  clientId: string
  label: string
  score: number
  level: 'hot' | 'warm' | 'watch'
  detail: string
  href: string
  latestSignalAt: string
  sourceIds: string[]
}

export type ReplayReadinessImpact = {
  id: string
  title: string
  detail: string
  severity: ReplayActionPriority
  href: string | null
  sourceCount: number
  sourceIds: string[]
}

export type ReplayChangeDiffCard = {
  id: string
  title: string
  beforeLabel: string
  afterLabel: string
  detail: string
  href: string | null
  createdAt: string
  sourceIds: string[]
}

export type ReplayFollowUpDraft = {
  id: string
  title: string
  channel: 'email' | 'message'
  recipientLabel: string
  body: string
  href: string | null
  sourceActionId: string
}

export type ReplayDigest = {
  subject: string
  previewLines: string[]
  body: string
}

export type ReplayHandoff = {
  title: string
  lines: string[]
  body: string
}

export type ReplayRule = {
  id: string
  label: string
  description: string
  matchCount: number
  priority: ReplayActionPriority
  category: ReplayActionCategory
}

export type ReplayAuditEntry = {
  id: string
  actionLabel: string
  detail: string
  createdAt: string
  sourceItemId: string | null
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
  actionDigest: ReplayActionItem[]
  resumeCards: ReplayResumeCard[]
  comebackSignals: ReplayComebackSignal[]
  changeGroups: ReplayChangeGroup[]
  dailyStart: ReplayDailyStart
  sinceYouLeft: ReplaySinceYouLeft
  clientSignalScores: ReplayClientSignalScore[]
  readinessImpacts: ReplayReadinessImpact[]
  changeDiffCards: ReplayChangeDiffCard[]
  followUpDrafts: ReplayFollowUpDraft[]
  catchUpDigest: ReplayDigest
  handoff: ReplayHandoff
  rules: ReplayRule[]
  auditTrail: ReplayAuditEntry[]
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

const MONEY_EVENT_TYPES = new Set(['payment_page_visited', 'invoice_viewed'])
const QUOTE_EVENT_TYPES = new Set(['proposal_viewed', 'quote_viewed'])
const COMMUNICATION_EVENT_TYPES = new Set(['chat_message_sent', 'chat_opened', 'form_submitted'])
const HIGH_INTENT_EVENT_TYPES = new Set([
  ...MONEY_EVENT_TYPES,
  ...QUOTE_EVENT_TYPES,
  ...COMMUNICATION_EVENT_TYPES,
  'rsvp_submitted',
  'document_downloaded',
])

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
    period.items.sort(sortByCreatedAtDesc)
    period.items = period.items.slice(0, 12)
  }

  const resumeItems = input.resumeItems.slice(0, 8)
  const resumeCards = buildResumeCards(resumeItems)
  const comebackSignals = buildComebackSignals(input.clientActivity)
  const changeGroups = buildChangeGroups(input.chefActivity)
  const clientSignalScores = buildClientSignalScores(input.clientActivity)
  const readinessImpacts = buildReadinessImpacts(input.chefActivity, resumeItems)
  const changeDiffCards = buildChangeDiffCards(input.chefActivity)
  const actionDigest = buildActionDigest({
    resumeCards,
    comebackSignals,
    changeGroups,
    readinessImpacts,
    now,
  })
  const dailyStart = buildDailyStart(actionDigest)
  const sinceYouLeft = buildSinceYouLeft(input, now)
  const followUpDrafts = buildFollowUpDrafts(actionDigest)
  const catchUpDigest = buildCatchUpDigest(actionDigest, sinceYouLeft, now)
  const handoff = buildHandoff(actionDigest, readinessImpacts, input.breadcrumbSessions)
  const rules = buildRules(input.clientActivity, resumeItems, readinessImpacts, actionDigest)
  const auditTrail = buildAuditTrail(actionDigest, now)

  return {
    generatedAt: now.toISOString(),
    chefActionCount: input.chefActivity.length,
    clientSignalCount: input.clientActivity.length,
    resumeCount: input.resumeItems.length,
    retraceSessionCount: input.breadcrumbSessions.length,
    topDomains: getTopDomains(input.chefActivity),
    periods,
    resumeItems,
    retraceSessions: input.breadcrumbSessions.slice(0, 4),
    actionDigest,
    resumeCards,
    comebackSignals,
    changeGroups,
    dailyStart,
    sinceYouLeft,
    clientSignalScores,
    readinessImpacts,
    changeDiffCards,
    followUpDrafts,
    catchUpDigest,
    handoff,
    rules,
    auditTrail,
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
    href: clientEventHref(event),
    domainLabel: 'Client',
  }
}

function buildResumeCards(items: ResumeItem[]): ReplayResumeCard[] {
  return items.slice(0, 8).map((item) => ({
    id: `resume-${item.type}-${item.id}`,
    title: item.title,
    subtitle: item.subtitle,
    status: item.status,
    type: item.type,
    href: item.href,
    recommendedAction: getResumeActionLabel(item),
    priority: getResumePriority(item),
  }))
}

function buildComebackSignals(events: ActivityEvent[]): ReplayComebackSignal[] {
  return events
    .filter((event) => HIGH_INTENT_EVENT_TYPES.has(event.event_type))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((event) => ({
      id: `comeback-${event.id}`,
      title: CLIENT_EVENT_LABELS[event.event_type] ?? event.event_type.replace(/_/g, ' '),
      detail: buildClientDetail(event) ?? 'Client portal signal',
      href: clientEventHref(event),
      createdAt: event.created_at,
      priority: getClientSignalPriority(event),
    }))
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
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const latest = sorted[0]
      const config = DOMAIN_CONFIG[latest.domain] ?? DOMAIN_CONFIG.operational
      return {
        id: `change-group-${key}`,
        title: `${config.label} changed ${group.length} times`,
        detail: latest.summary,
        href: getChefActivityEntityHref(latest.entity_type, latest.entity_id),
        count: group.length,
        latestAt: latest.created_at,
      }
    })
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
    .slice(0, 6)
}

function buildClientSignalScores(events: ActivityEvent[]): ReplayClientSignalScore[] {
  const groups = new Map<string, ActivityEvent[]>()

  for (const event of events) {
    if (!event.client_id) continue
    const group = groups.get(event.client_id) ?? []
    group.push(event)
    groups.set(event.client_id, group)
  }

  return Array.from(groups.entries())
    .map(([clientId, group]) => {
      const sorted = [...group].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const score = Math.min(100, group.reduce((total, event) => total + signalWeight(event), 0))
      const latest = sorted[0]
      const label = stringValue(latest.metadata?.client_name) ?? 'Known client'
      const importantSignals = sorted
        .filter((event) => HIGH_INTENT_EVENT_TYPES.has(event.event_type))
        .slice(0, 3)
        .map((event) => CLIENT_EVENT_LABELS[event.event_type] ?? event.event_type.replace(/_/g, ' '))
      return {
        id: `client-score-${clientId}`,
        clientId,
        label,
        score,
        level: score >= 75 ? 'hot' : score >= 35 ? 'warm' : 'watch',
        detail:
          importantSignals.length > 0
            ? importantSignals.join(' | ')
            : `${group.length} portal signal${group.length === 1 ? '' : 's'}`,
        href: `/clients/${clientId}`,
        latestSignalAt: latest.created_at,
        sourceIds: group.map((event) => event.id),
      } satisfies ReplayClientSignalScore
    })
    .sort((a, b) => b.score - a.score || new Date(b.latestSignalAt).getTime() - new Date(a.latestSignalAt).getTime())
    .slice(0, 6)
}

function buildReadinessImpacts(
  entries: ChefActivityEntry[],
  resumeItems: ResumeItem[]
): ReplayReadinessImpact[] {
  const impacts: ReplayReadinessImpact[] = []
  const activeEvents = resumeItems.filter((item) => item.type === 'event')
  const activePrep = resumeItems.filter((item) => item.type === 'menu' || item.type === 'event')
  const safetyEntries = entries.filter((entry) =>
    ['event_safety_checklist_completed', 'safety_checklist_completed', 'temp_logged'].includes(entry.action)
  )
  const prepEntries = entries.filter(
    (entry) =>
      entry.domain === 'scheduling' ||
      entry.action.startsWith('prep_block_') ||
      entry.action === 'packing_status_updated' ||
      entry.action === 'checklist_item_toggled'
  )

  if (activeEvents.length > 0) {
    impacts.push({
      id: 'readiness-active-events',
      title: 'Active events need final checks',
      detail: `${activeEvents.length} active event${activeEvents.length === 1 ? '' : 's'} in the resume queue.`,
      severity: activeEvents.length >= 3 ? 'urgent' : 'high',
      href: activeEvents[0]?.href ?? null,
      sourceCount: activeEvents.length,
      sourceIds: activeEvents.map((item) => item.id),
    })
  }

  if (activePrep.length > 0) {
    impacts.push({
      id: 'readiness-prep',
      title: 'Prep surface changed',
      detail: `${activePrep.length} event or menu item${activePrep.length === 1 ? '' : 's'} may affect prep readiness.`,
      severity: activePrep.length >= 4 ? 'high' : 'normal',
      href: activePrep[0]?.href ?? null,
      sourceCount: activePrep.length,
      sourceIds: activePrep.map((item) => item.id),
    })
  }

  if (prepEntries.length > 0) {
    const latest = [...prepEntries].sort(sortChefActivityDesc)[0]
    impacts.push({
      id: 'readiness-ops-changes',
      title: 'Operations readiness changed',
      detail: latest.summary,
      severity: prepEntries.length >= 3 ? 'high' : 'normal',
      href: getChefActivityEntityHref(latest.entity_type, latest.entity_id),
      sourceCount: prepEntries.length,
      sourceIds: prepEntries.map((entry) => entry.id),
    })
  }

  if (safetyEntries.length > 0) {
    const latest = [...safetyEntries].sort(sortChefActivityDesc)[0]
    impacts.push({
      id: 'readiness-safety',
      title: 'Safety readiness updated',
      detail: latest.summary,
      severity: 'normal',
      href: getChefActivityEntityHref(latest.entity_type, latest.entity_id),
      sourceCount: safetyEntries.length,
      sourceIds: safetyEntries.map((entry) => entry.id),
    })
  }

  return impacts.slice(0, 6)
}

function buildChangeDiffCards(entries: ChefActivityEntry[]): ReplayChangeDiffCard[] {
  const groups = new Map<string, ChefActivityEntry[]>()

  for (const entry of entries) {
    if (!entry.entity_id) continue
    if (!entry.action.includes('updated') && !entry.action.includes('transitioned')) continue
    const key = `${entry.entity_type}:${entry.entity_id}`
    const group = groups.get(key) ?? []
    group.push(entry)
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length >= 2)
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const first = sorted[0]
      const latest = sorted[sorted.length - 1]
      const config = DOMAIN_CONFIG[latest.domain] ?? DOMAIN_CONFIG.operational
      return {
        id: `diff-${key}`,
        title: `${config.label} changed since last review`,
        beforeLabel: first.summary,
        afterLabel: latest.summary,
        detail: `${group.length} tracked changes on the same ${latest.entity_type}.`,
        href: getChefActivityEntityHref(latest.entity_type, latest.entity_id),
        createdAt: latest.created_at,
        sourceIds: group.map((entry) => entry.id),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
}

function buildActionDigest(input: {
  resumeCards: ReplayResumeCard[]
  comebackSignals: ReplayComebackSignal[]
  changeGroups: ReplayChangeGroup[]
  readinessImpacts: ReplayReadinessImpact[]
  now: Date
}): ReplayActionItem[] {
  const actions: ReplayActionItem[] = [
    ...input.resumeCards.slice(0, 5).map((card) => ({
      id: `action-${card.id}`,
      title: card.recommendedAction,
      detail: `${card.title} | ${card.subtitle}`,
      href: card.href,
      source: 'chef' as const,
      priority: card.priority,
      category: card.type === 'quote' ? 'money' as const : card.type === 'menu' ? 'prep' as const : 'resume' as const,
      createdAt: input.now.toISOString(),
      sourceIds: [card.id],
    })),
    ...input.comebackSignals.slice(0, 5).map((signal) => ({
      id: `action-${signal.id}`,
      title: signal.title,
      detail: signal.detail,
      href: signal.href,
      source: 'client' as const,
      priority: signal.priority,
      category: signal.title.toLowerCase().includes('payment') || signal.title.toLowerCase().includes('invoice')
        ? 'money' as const
        : signal.title.toLowerCase().includes('chat')
          ? 'communication' as const
          : 'client' as const,
      createdAt: signal.createdAt,
      sourceIds: [signal.id],
    })),
    ...input.readinessImpacts.slice(0, 4).map((impact) => ({
      id: `action-${impact.id}`,
      title: impact.title,
      detail: impact.detail,
      href: impact.href,
      source: 'system' as const,
      priority: impact.severity,
      category: 'readiness' as const,
      createdAt: input.now.toISOString(),
      sourceIds: impact.sourceIds,
    })),
    ...input.changeGroups.slice(0, 3).map((group) => ({
      id: `action-${group.id}`,
      title: group.title,
      detail: group.detail,
      href: group.href,
      source: 'chef' as const,
      priority: group.count >= 4 ? 'high' as const : 'normal' as const,
      category: 'handoff' as const,
      createdAt: group.latestAt,
      sourceIds: [group.id],
    })),
  ]

  return dedupeActions(actions)
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12)
}

function buildDailyStart(actions: ReplayActionItem[]): ReplayDailyStart {
  const counts = {
    urgent: actions.filter((action) => action.priority === 'urgent').length,
    high: actions.filter((action) => action.priority === 'high').length,
    normal: actions.filter((action) => action.priority === 'normal').length,
  }
  const first = actions[0] ?? null

  return {
    headline:
      actions.length === 0
        ? 'No open Catch Up actions'
        : `${actions.length} Catch Up action${actions.length === 1 ? '' : 's'} ready`,
    focus: first ? first.title : 'Review activity when new client or chef signals arrive.',
    nextHref: first?.href ?? null,
    counts,
  }
}

function buildSinceYouLeft(input: ReplayInput, now: Date): ReplaySinceYouLeft {
  const latestSession = [...input.breadcrumbSessions].sort(
    (a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime()
  )[0]
  const details = [
    `${input.resumeItems.length} active resume item${input.resumeItems.length === 1 ? '' : 's'}`,
    `${input.chefActivity.length} chef action${input.chefActivity.length === 1 ? '' : 's'}`,
    `${input.clientActivity.length} client signal${input.clientActivity.length === 1 ? '' : 's'}`,
    `${input.breadcrumbSessions.length} retrace session${input.breadcrumbSessions.length === 1 ? '' : 's'}`,
  ]

  return {
    headline: `Catch Up generated ${formatModelDate(now)}`,
    details,
    latestSessionSummary: latestSession?.summary ?? null,
  }
}

function buildFollowUpDrafts(actions: ReplayActionItem[]): ReplayFollowUpDraft[] {
  return actions
    .filter((action) => action.category === 'client' || action.category === 'money' || action.category === 'communication')
    .slice(0, 5)
    .map((action) => ({
      id: `draft-${action.id}`,
      title: `Follow up: ${action.title}`,
      channel: action.category === 'communication' ? 'message' : 'email',
      recipientLabel: 'Client',
      body: [
        'Hi,',
        '',
        `I saw the latest update on ${action.detail}.`,
        'I wanted to make sure you have what you need from me and answer any questions before the next step.',
        '',
        'Thank you,',
      ].join('\n'),
      href: action.href,
      sourceActionId: action.id,
    }))
}

function buildCatchUpDigest(
  actions: ReplayActionItem[],
  sinceYouLeft: ReplaySinceYouLeft,
  now: Date
): ReplayDigest {
  const previewLines = actions.slice(0, 5).map((action) => `${priorityLabel(action.priority)}: ${action.title}`)
  const lines = [
    `Catch Up Digest - ${formatModelDate(now)}`,
    '',
    sinceYouLeft.headline,
    ...sinceYouLeft.details.map((detail) => `- ${detail}`),
    '',
    'Priority actions:',
    ...(previewLines.length > 0 ? previewLines.map((line) => `- ${line}`) : ['- No open Catch Up actions']),
  ]

  return {
    subject: `ChefFlow Catch Up - ${actions.length} action${actions.length === 1 ? '' : 's'}`,
    previewLines,
    body: lines.join('\n'),
  }
}

function buildHandoff(
  actions: ReplayActionItem[],
  impacts: ReplayReadinessImpact[],
  sessions: BreadcrumbSession[]
): ReplayHandoff {
  const latestSession = sessions[0]?.summary ?? 'No recent retrace session loaded'
  const lines = [
    `Top action: ${actions[0]?.title ?? 'No open Catch Up action'}`,
    `Readiness: ${impacts[0]?.title ?? 'No readiness impact detected'}`,
    `Last path: ${latestSession}`,
  ]

  return {
    title: 'Team handoff',
    lines,
    body: ['Team handoff', '', ...lines.map((line) => `- ${line}`)].join('\n'),
  }
}

function buildRules(
  clientActivity: ActivityEvent[],
  resumeItems: ResumeItem[],
  readinessImpacts: ReplayReadinessImpact[],
  actionDigest: ReplayActionItem[]
): ReplayRule[] {
  const moneySignals = clientActivity.filter((event) => MONEY_EVENT_TYPES.has(event.event_type))
  const messageSignals = clientActivity.filter((event) => COMMUNICATION_EVENT_TYPES.has(event.event_type))
  const quoteSignals = clientActivity.filter((event) => QUOTE_EVENT_TYPES.has(event.event_type))
  const prepItems = resumeItems.filter((item) => item.type === 'event' || item.type === 'menu')

  return [
    {
      id: 'rule-money',
      label: 'Money signals rise first',
      description: 'Payment page and invoice views stay at the top of Catch Up.',
      matchCount: moneySignals.length,
      priority: moneySignals.length > 0 ? 'urgent' : 'normal',
      category: 'money',
    },
    {
      id: 'rule-client-follow-up',
      label: 'Client replies become follow-ups',
      description: 'Chat, forms, proposal views, and quote views create follow-up drafts.',
      matchCount: messageSignals.length + quoteSignals.length,
      priority: messageSignals.length + quoteSignals.length > 0 ? 'high' : 'normal',
      category: 'communication',
    },
    {
      id: 'rule-readiness',
      label: 'Prep changes affect readiness',
      description: 'Active events, menus, prep blocks, and safety rows become readiness impacts.',
      matchCount: prepItems.length + readinessImpacts.length,
      priority: prepItems.length + readinessImpacts.length > 2 ? 'high' : 'normal',
      category: 'readiness',
    },
    {
      id: 'rule-handoff',
      label: 'Busy queues create handoff notes',
      description: 'High-priority Catch Up actions are summarized into a team handoff.',
      matchCount: actionDigest.filter((action) => action.priority !== 'normal').length,
      priority: actionDigest.some((action) => action.priority === 'urgent') ? 'urgent' : 'normal',
      category: 'handoff',
    },
  ]
}

function buildAuditTrail(actions: ReplayActionItem[], now: Date): ReplayAuditEntry[] {
  const generated: ReplayAuditEntry = {
    id: 'audit-generated',
    actionLabel: 'Catch Up generated',
    detail: `${actions.length} action${actions.length === 1 ? '' : 's'} ranked from loaded sources.`,
    createdAt: now.toISOString(),
    sourceItemId: null,
  }

  return [
    generated,
    ...actions.slice(0, 6).map((action) => ({
      id: `audit-${action.id}`,
      actionLabel: `${priorityLabel(action.priority)} action queued`,
      detail: action.title,
      createdAt: action.createdAt,
      sourceItemId: action.id,
    })),
  ]
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

function getResumeActionLabel(item: ResumeItem): string {
  if (item.type === 'inquiry') return 'Open inquiry next step'
  if (item.type === 'quote') return item.status.toLowerCase() === 'draft' ? 'Resume quote' : 'Review quote'
  if (item.type === 'menu') return 'Resume menu'
  if (item.type === 'event') return 'Resume event'
  if (item.type === 'note') return 'Review pinned note'
  return 'Resume work'
}

function getResumePriority(item: ResumeItem): ReplayActionPriority {
  if (item.type === 'inquiry') return item.status.toLowerCase() === 'new' ? 'urgent' : 'high'
  if (item.type === 'quote') return item.status.toLowerCase() === 'draft' ? 'high' : 'normal'
  if (item.type === 'event') return 'high'
  return 'normal'
}

function getClientSignalPriority(event: ActivityEvent): ReplayActionPriority {
  if (MONEY_EVENT_TYPES.has(event.event_type)) return 'urgent'
  if (QUOTE_EVENT_TYPES.has(event.event_type) || COMMUNICATION_EVENT_TYPES.has(event.event_type)) return 'high'
  return 'normal'
}

function signalWeight(event: ActivityEvent): number {
  if (MONEY_EVENT_TYPES.has(event.event_type)) return 40
  if (QUOTE_EVENT_TYPES.has(event.event_type)) return 28
  if (COMMUNICATION_EVENT_TYPES.has(event.event_type)) return 22
  if (event.event_type === 'document_downloaded' || event.event_type === 'rsvp_submitted') return 18
  return 8
}

function priorityWeight(priority: ReplayActionPriority): number {
  if (priority === 'urgent') return 3
  if (priority === 'high') return 2
  return 1
}

function priorityLabel(priority: ReplayActionPriority): string {
  if (priority === 'urgent') return 'Urgent'
  if (priority === 'high') return 'High'
  return 'Normal'
}

function clientEventHref(event: ActivityEvent): string | null {
  if (event.client_id) return `/clients/${event.client_id}`
  return getChefActivityEntityHref(event.entity_type, event.entity_id)
}

function dedupeActions(actions: ReplayActionItem[]): ReplayActionItem[] {
  const seen = new Set<string>()
  return actions.filter((action) => {
    const key = `${action.title}:${action.href ?? 'none'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sortByCreatedAtDesc(a: ReplayItem, b: ReplayItem): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function sortChefActivityDesc(a: ChefActivityEntry, b: ChefActivityEntry): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function formatModelDate(value: Date): string {
  return value.toLocaleString('en-US', {
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
