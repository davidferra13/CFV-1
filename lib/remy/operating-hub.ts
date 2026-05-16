import type { MemoryCategory } from '@/lib/ai/remy-memory-types'

export type RemyHubUrgency = 'critical' | 'high' | 'medium' | 'low'
export type RemyHubConfidence = 'deterministic' | 'inference' | 'needs_review'
export type RemyHubSourceStatus = 'available' | 'unavailable' | 'inference'

export interface RemyHubSource {
  id: string
  label: string
  href: string | null
  recordType: string
  recordId: string | null
  status: RemyHubSourceStatus
  excerpt: string
}

export interface RemyHubCard {
  id: string
  title: string
  detail: string
  domain: string
  urgency: RemyHubUrgency
  confidence: RemyHubConfidence
  confidenceLabel: string
  sources: RemyHubSource[]
  nextOptions: string[]
  clientSafe: boolean
}

export interface RemyHubMemoryRecord {
  id: string
  type: MemoryCategory
  content: string
  source: string
  confidence: RemyHubConfidence
  sensitivity: 'safety' | 'client_private' | 'chef_private' | 'normal'
  status: 'active' | 'proposed' | 'archived'
  lastUsedAt: string | null
  lastConfirmedAt: string | null
  sourceRecord: RemyHubSource
}

export interface RemyHubWorkload {
  level: 'open' | 'steady' | 'heavy' | 'overloaded' | 'unknown'
  score: number | null
  summary: string
  assumptions: string[]
  evidence: RemyHubSource[]
}

export interface RemyHubSafetyState {
  restrictions: string[]
  escalationRules: RemyHubCard[]
  policyRows: Array<{
    taskType: string
    decision: string
    reason: string | null
    enabled: boolean
  }>
  auditSummary: {
    total: number
    blocked: number
    error: number
    started: number
    success: number
  }
}

export interface RemyHubSearchResult {
  id: string
  title: string
  domain: string
  href: string | null
  excerpt: string
  source: RemyHubSource
}

export interface RemyOperatingHubData {
  generatedAt: string
  briefing: RemyHubCard[]
  inboxTriage: RemyHubCard[]
  followUpRadar: RemyHubCard[]
  approvalCenter: RemyHubCard[]
  explainWhyCards: RemyHubCard[]
  sourceLedger: RemyHubSource[]
  patterns: RemyHubCard[]
  memories: RemyHubMemoryRecord[]
  searchResults: RemyHubSearchResult[]
  workload: RemyHubWorkload
  safety: RemyHubSafetyState
  clientSafeMode: {
    allowlist: string[]
    blockedFields: string[]
    reviewRequired: string[]
  }
  dataAvailability: Array<{ source: string; available: boolean; note: string }>
}

export interface RemyRawHubInput {
  nowIso: string
  upcomingEvents: Array<Record<string, unknown>>
  completedEvents: Array<Record<string, unknown>>
  overdueTasks: Array<Record<string, unknown>>
  unreadInbox: Array<Record<string, unknown>>
  pendingQuotes: Array<Record<string, unknown>>
  openInquiries: Array<Record<string, unknown>>
  memories: Array<Record<string, unknown>>
  auditEntries: Array<Record<string, unknown>>
  policyRows: Array<Record<string, unknown>>
  searchRows: Array<Record<string, unknown>>
  dataAvailability: Array<{ source: string; available: boolean; note: string }>
}

export interface VoiceMemoDraftCard {
  id: string
  type: 'memory' | 'task' | 'approval' | 'escalation'
  title: string
  detail: string
  sensitivity: 'safety' | 'payment' | 'status' | 'normal'
  confidence: RemyHubConfidence
  status: 'draft' | 'approved_locally' | 'rejected_locally'
  sourceExcerpt: string
}

const HIGH_RISK_TERMS = [
  'allergy',
  'allergic',
  'anaphylaxis',
  'celiac',
  'gluten',
  'nuts',
  'shellfish',
  'payment',
  'refund',
  'deposit',
  'chargeback',
  'cancel',
  'cancelled',
  'canceled',
]

export const REMY_CLIENT_SAFE_ALLOWLIST = [
  'event date, time, and location summaries',
  'approved menus and dietary questions',
  'client-visible invoices, quotes, and payment status',
  'portal navigation help',
  'messages drafted for explicit chef review',
]

export const REMY_CLIENT_SAFE_BLOCKED_FIELDS = [
  'chef-only notes',
  'internal margin and cost assumptions',
  'private relationship notes',
  'other clients, guests, or tenant records',
  'raw prompts, hidden reasoning, and provider logs',
]

export function buildRemyOperatingHub(input: RemyRawHubInput): RemyOperatingHubData {
  const now = Date.parse(input.nowIso)
  const briefing: RemyHubCard[] = []
  const inboxTriage = buildInboxTriage(input.unreadInbox)
  const followUpRadar = buildFollowUpRadar(input.openInquiries, input.pendingQuotes, now)
  const approvalCenter = buildApprovalCenter(input.auditEntries)
  const memories = buildMemoryRecords(input.memories)
  const workload = buildWorkload(input.upcomingEvents, input.overdueTasks, now)
  const patterns = buildPatterns(input.upcomingEvents, input.pendingQuotes, input.openInquiries)

  for (const event of input.upcomingEvents.slice(0, 5)) {
    const date = asString(event.event_date)
    const title = asString(event.title) || asString(event.occasion) || 'Upcoming event'
    briefing.push(
      makeCard({
        id: `briefing-event-${asString(event.id)}`,
        title,
        detail: `${formatRelativeDate(date, now)}${event.guest_count ? `, ${event.guest_count} guests` : ''}`,
        domain: 'calendar',
        urgency: eventUrgency(date, now),
        confidence: 'deterministic',
        sources: [
          recordSource('event', asString(event.id), title, `/events/${asString(event.id)}`, date),
        ],
        nextOptions: ['Open event', 'Check prep load', 'Simulate capacity'],
      })
    )
  }

  for (const task of input.overdueTasks.slice(0, 5)) {
    const title = asString(task.title) || 'Overdue task'
    briefing.push(
      makeCard({
        id: `briefing-task-${asString(task.id)}`,
        title,
        detail: `Due ${formatRelativeDate(asString(task.due_date), now)}`,
        domain: 'tasks',
        urgency: 'high',
        confidence: 'deterministic',
        sources: [
          recordSource('task', asString(task.id), title, `/tasks`, asString(task.due_date)),
        ],
        nextOptions: ['Open task list', 'Draft follow-up', 'Dismiss after completion'],
      })
    )
  }

  briefing.push(...followUpRadar.slice(0, 4))
  briefing.push(
    ...inboxTriage
      .filter((card) => card.urgency === 'critical' || card.urgency === 'high')
      .slice(0, 4)
  )

  const explainWhyCards = [...briefing, ...patterns, ...approvalCenter]
    .filter((card) => card.sources.length > 0 || card.confidence === 'inference')
    .slice(0, 12)

  const sourceLedger = collectSources([
    ...briefing,
    ...inboxTriage,
    ...followUpRadar,
    ...approvalCenter,
    ...patterns,
  ])

  return {
    generatedAt: input.nowIso,
    briefing: sortCards(briefing).slice(0, 16),
    inboxTriage,
    followUpRadar,
    approvalCenter,
    explainWhyCards,
    sourceLedger,
    patterns,
    memories,
    searchResults: buildSearchResults(input.searchRows),
    workload,
    safety: {
      restrictions: [
        'Remy cannot send messages, change event status, alter payments, or persist client facts without chef approval.',
        'High-risk categories route to approval or decision-needed cards.',
        'Client-safe mode is allowlist-based and excludes chef-only notes by default.',
      ],
      escalationRules: buildEscalationRules([...inboxTriage, ...followUpRadar, ...approvalCenter]),
      policyRows: input.policyRows.map((row) => ({
        taskType: asString(row.task_type),
        decision: asString(row.decision) || 'default',
        reason: asNullableString(row.reason),
        enabled: asBoolean(row.enabled, true),
      })),
      auditSummary: summarizeAudit(input.auditEntries),
    },
    clientSafeMode: {
      allowlist: REMY_CLIENT_SAFE_ALLOWLIST,
      blockedFields: REMY_CLIENT_SAFE_BLOCKED_FIELDS,
      reviewRequired: ['dietary claims', 'payment language', 'event changes', 'refund wording'],
    },
    dataAvailability: input.dataAvailability,
  }
}

export function deriveVoiceMemoDraftCards(transcript: string): VoiceMemoDraftCard[] {
  const normalized = transcript.trim()
  if (!normalized) return []

  const sentences = normalized
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)

  return sentences.map((sentence, index) => {
    const lower = sentence.toLowerCase()
    const sensitivity =
      lower.includes('allerg') || lower.includes('celiac') || lower.includes('shellfish')
        ? 'safety'
        : lower.includes('payment') || lower.includes('deposit') || lower.includes('refund')
          ? 'payment'
          : lower.includes('cancel') || lower.includes('confirmed') || lower.includes('reschedul')
            ? 'status'
            : 'normal'

    const type: VoiceMemoDraftCard['type'] =
      sensitivity === 'safety' || sensitivity === 'payment' || sensitivity === 'status'
        ? 'escalation'
        : /remember|prefers|likes|hates|always|never/i.test(sentence)
          ? 'memory'
          : 'task'

    return {
      id: `memo-${index + 1}`,
      type,
      title: titleForMemoDraft(type, sensitivity),
      detail: sentence,
      sensitivity,
      confidence: sensitivity === 'normal' ? 'inference' : 'needs_review',
      status: 'draft',
      sourceExcerpt: sentence.slice(0, 180),
    }
  })
}

export function classifyInboxMessage(
  subject: string,
  preview: string
): Pick<RemyHubCard, 'urgency' | 'confidence' | 'confidenceLabel'> & {
  label: string
} {
  const text = `${subject} ${preview}`.toLowerCase()
  if (HIGH_RISK_TERMS.some((term) => text.includes(term))) {
    return {
      label: 'Decision needed',
      urgency: 'critical',
      confidence: 'deterministic',
      confidenceLabel: 'Keyword match: safety/payment/status',
    }
  }
  if (/quote|proposal|available|booking|event|date|menu/.test(text)) {
    return {
      label: 'Business reply candidate',
      urgency: 'high',
      confidence: 'inference',
      confidenceLabel: 'Likely business request',
    }
  }
  return {
    label: 'Review when convenient',
    urgency: 'low',
    confidence: 'needs_review',
    confidenceLabel: 'Insufficient deterministic signals',
  }
}

function buildInboxTriage(rows: Array<Record<string, unknown>>): RemyHubCard[] {
  return rows.slice(0, 20).map((row) => {
    const subject = asString(row.subject) || asString(row.title) || 'Inbox item'
    const preview = asString(row.preview) || asString(row.body) || asString(row.message) || ''
    const triage = classifyInboxMessage(subject, preview)
    return makeCard({
      id: `inbox-${asString(row.id)}`,
      title: `${triage.label}: ${subject}`,
      detail: preview ? preview.slice(0, 180) : 'Unread item needs review.',
      domain: 'inbox',
      urgency: triage.urgency,
      confidence: triage.confidence,
      confidenceLabel: triage.confidenceLabel,
      sources: [
        recordSource('inbox', asString(row.id), subject, '/inbox', asString(row.created_at)),
      ],
      nextOptions: ['Open inbox', 'Draft reply for review', 'Create task draft'],
    })
  })
}

function buildFollowUpRadar(
  inquiries: Array<Record<string, unknown>>,
  quotes: Array<Record<string, unknown>>,
  now: number
): RemyHubCard[] {
  const cards: RemyHubCard[] = []
  for (const inquiry of inquiries.slice(0, 12)) {
    const id = asString(inquiry.id)
    const createdAt = asString(inquiry.first_contact_at) || asString(inquiry.created_at)
    const hours = hoursSince(createdAt, now)
    const title =
      asString(inquiry.confirmed_occasion) ||
      asString(inquiry.occasion) ||
      asString(inquiry.channel) ||
      'Open inquiry'
    cards.push(
      makeCard({
        id: `follow-inquiry-${id}`,
        title: `Inquiry follow-up: ${title}`,
        detail:
          hours === null
            ? 'Open inquiry has no response-age evidence available.'
            : `Waiting about ${Math.round(hours)} hours with status ${asString(inquiry.status) || 'open'}.`,
        domain: 'pipeline',
        urgency:
          hours !== null && hours >= 24
            ? 'critical'
            : hours !== null && hours >= 4
              ? 'high'
              : 'medium',
        confidence: hours === null ? 'needs_review' : 'deterministic',
        sources: [recordSource('inquiry', id, title, `/inquiries/${id}`, createdAt)],
        nextOptions: ['Open inquiry', 'Draft follow-up', 'Dismiss after response'],
      })
    )
  }

  for (const quote of quotes.slice(0, 12)) {
    const id = asString(quote.id)
    const sentAt =
      asString(quote.sent_at) || asString(quote.updated_at) || asString(quote.created_at)
    const hours = hoursSince(sentAt, now)
    const title = asString(quote.quote_name) || 'Pending quote'
    cards.push(
      makeCard({
        id: `follow-quote-${id}`,
        title: `Quote follow-up: ${title}`,
        detail:
          hours === null
            ? 'Sent quote needs review; sent timestamp is unavailable.'
            : `Sent about ${Math.round(hours / 24)} days ago and still marked ${asString(quote.status) || 'pending'}.`,
        domain: 'quotes',
        urgency: hours !== null && hours >= 120 ? 'high' : 'medium',
        confidence: hours === null ? 'needs_review' : 'deterministic',
        sources: [recordSource('quote', id, title, `/quotes/${id}`, sentAt)],
        nextOptions: ['Open quote', 'Draft follow-up', 'Archive after client response'],
      })
    )
  }

  return sortCards(cards).slice(0, 20)
}

function buildApprovalCenter(rows: Array<Record<string, unknown>>): RemyHubCard[] {
  return rows
    .filter((row) => ['started', 'blocked', 'error'].includes(asString(row.status)))
    .slice(0, 20)
    .map((row) => {
      const taskType = asString(row.task_type) || 'Remy prepared action'
      const status = asString(row.status)
      return makeCard({
        id: `approval-${asString(row.id)}`,
        title: `${status === 'started' ? 'Review pending' : 'Review required'}: ${taskType}`,
        detail:
          asString(row.error_message) ||
          `Action is ${status}; canonical records have not been changed by this hub.`,
        domain: 'approvals',
        urgency: status === 'error' || status === 'blocked' ? 'high' : 'medium',
        confidence: 'deterministic',
        sources: [
          recordSource(
            'remy_action_audit_log',
            asString(row.id),
            taskType,
            '/remy/settings',
            asString(row.created_at)
          ),
        ],
        nextOptions: ['Review source', 'Approve through gated action', 'Reject or archive'],
        clientSafe: false,
      })
    })
}

function buildPatterns(
  events: Array<Record<string, unknown>>,
  quotes: Array<Record<string, unknown>>,
  inquiries: Array<Record<string, unknown>>
): RemyHubCard[] {
  const cards: RemyHubCard[] = []
  if (events.length >= 3) {
    cards.push(
      makeCard({
        id: 'pattern-upcoming-event-load',
        title: 'Upcoming event cluster',
        detail: `${events.length} upcoming events are visible in the current window. Workload suggestions should account for prep and travel.`,
        domain: 'operations',
        urgency: events.length >= 6 ? 'high' : 'medium',
        confidence: 'deterministic',
        sources: events
          .slice(0, 5)
          .map((event) =>
            recordSource(
              'event',
              asString(event.id),
              asString(event.title) || asString(event.occasion) || 'Event',
              `/events/${asString(event.id)}`,
              asString(event.event_date)
            )
          ),
        nextOptions: ['Simulate capacity', 'Draft prep checklist', 'Create routine draft'],
      })
    )
  }
  if (quotes.length >= 3) {
    cards.push(
      makeCard({
        id: 'pattern-pending-quotes',
        title: 'Quote follow-up cluster',
        detail: `${quotes.length} pending quotes are eligible for review. Remy should propose drafts, not auto-send.`,
        domain: 'revenue',
        urgency: 'medium',
        confidence: 'deterministic',
        sources: quotes
          .slice(0, 5)
          .map((quote) =>
            recordSource(
              'quote',
              asString(quote.id),
              asString(quote.quote_name) || 'Quote',
              `/quotes/${asString(quote.id)}`,
              asString(quote.sent_at)
            )
          ),
        nextOptions: ['Open approval center', 'Draft follow-ups', 'Save decision memory'],
      })
    )
  }
  if (inquiries.length >= 3) {
    cards.push(
      makeCard({
        id: 'pattern-open-inquiries',
        title: 'Open inquiry pressure',
        detail: `${inquiries.length} open inquiries are waiting in the sampled window.`,
        domain: 'pipeline',
        urgency: 'high',
        confidence: 'deterministic',
        sources: inquiries
          .slice(0, 5)
          .map((inquiry) =>
            recordSource(
              'inquiry',
              asString(inquiry.id),
              asString(inquiry.confirmed_occasion) || 'Inquiry',
              `/inquiries/${asString(inquiry.id)}`,
              asString(inquiry.created_at)
            )
          ),
        nextOptions: ['Triage inbox', 'Draft responses', 'Escalate stale leads'],
      })
    )
  }
  return cards
}

function buildMemoryRecords(rows: Array<Record<string, unknown>>): RemyHubMemoryRecord[] {
  return rows.slice(0, 30).map((row) => {
    const category = normalizeMemoryCategory(asString(row.category))
    const content = asString(row.content)
    const importance = asNumber(row.importance, 5)
    const isSafety = category === 'client_insight' && importance >= 8
    return {
      id: asString(row.id),
      type: category,
      content,
      source: asString(row.source_message) ? 'chef-approved memory' : 'memory ledger',
      confidence: importance >= 8 ? 'deterministic' : 'inference',
      sensitivity: isSafety
        ? 'safety'
        : category === 'client_insight'
          ? 'client_private'
          : category === 'business_rule'
            ? 'chef_private'
            : 'normal',
      status: asBoolean(row.is_active, true) ? 'active' : 'archived',
      lastUsedAt: asNullableString(row.last_accessed_at),
      lastConfirmedAt: asNullableString(row.updated_at) || asNullableString(row.created_at),
      sourceRecord: recordSource(
        'remy_memories',
        asString(row.id),
        category,
        null,
        asString(row.created_at)
      ),
    }
  })
}

function buildWorkload(
  events: Array<Record<string, unknown>>,
  tasks: Array<Record<string, unknown>>,
  now: number
): RemyHubWorkload {
  if (events.length === 0 && tasks.length === 0) {
    return {
      level: 'open',
      score: 0,
      summary: 'No upcoming events or overdue tasks were found in the sampled window.',
      assumptions: [
        'Uses visible upcoming events and overdue tasks only.',
        'Does not infer hidden prep work.',
      ],
      evidence: [],
    }
  }

  const eventWeight = events.reduce((sum, event) => {
    const guests = asNumber(event.guest_count, 0)
    const soon = eventUrgency(asString(event.event_date), now)
    return sum + 20 + Math.min(30, guests) + (soon === 'critical' ? 20 : soon === 'high' ? 10 : 0)
  }, 0)
  const taskWeight = tasks.length * 12
  const score = Math.min(100, Math.round(eventWeight + taskWeight))
  const level = score >= 85 ? 'overloaded' : score >= 60 ? 'heavy' : score >= 25 ? 'steady' : 'open'

  return {
    level,
    score,
    summary: `${events.length} upcoming events and ${tasks.length} overdue tasks are visible in the sampled window.`,
    assumptions: [
      'Each event carries a base prep load.',
      'Guest count increases the workload score when available.',
      'Overdue tasks add pressure but do not change records automatically.',
    ],
    evidence: [
      ...events
        .slice(0, 5)
        .map((event) =>
          recordSource(
            'event',
            asString(event.id),
            asString(event.title) || 'Event',
            `/events/${asString(event.id)}`,
            asString(event.event_date)
          )
        ),
      ...tasks
        .slice(0, 5)
        .map((task) =>
          recordSource(
            'task',
            asString(task.id),
            asString(task.title) || 'Task',
            '/tasks',
            asString(task.due_date)
          )
        ),
    ],
  }
}

function buildEscalationRules(cards: RemyHubCard[]): RemyHubCard[] {
  const generated = cards
    .filter((card) => card.urgency === 'critical' || card.confidence === 'needs_review')
    .slice(0, 8)
    .map((card) => ({
      ...card,
      id: `escalation-${card.id}`,
      title: `Escalate: ${card.title}`,
      nextOptions: ['Resolve manually', 'Draft response', 'Dismiss with audit note'],
    }))

  if (generated.length > 0) return generated

  return [
    makeCard({
      id: 'escalation-default-safety',
      title: 'Safety, payment, and status changes require explicit review',
      detail:
        'Remy routes these categories to decision-needed cards instead of treating them as normal suggestions.',
      domain: 'safety',
      urgency: 'medium',
      confidence: 'deterministic',
      sources: [
        inferenceSource('Remy escalation policy', 'Static restriction from the operating hub'),
      ],
      nextOptions: ['Review approval settings', 'Inspect safety dashboard'],
      clientSafe: false,
    }),
  ]
}

function buildSearchResults(rows: Array<Record<string, unknown>>): RemyHubSearchResult[] {
  return rows.slice(0, 24).map((row, index) => {
    const domain = asString(row.domain) || asString(row.record_type) || 'record'
    const id = asString(row.id) || `${domain}-${index}`
    const title =
      asString(row.title) ||
      asString(row.full_name) ||
      asString(row.quote_name) ||
      asString(row.confirmed_occasion) ||
      domain
    const href = hrefForDomain(domain, id)
    return {
      id: `${domain}-${id}`,
      title,
      domain,
      href,
      excerpt:
        asString(row.excerpt) ||
        asString(row.email) ||
        asString(row.status) ||
        'Authorized tenant record match.',
      source: recordSource(
        domain,
        id,
        title,
        href,
        asString(row.updated_at) || asString(row.created_at)
      ),
    }
  })
}

function summarizeAudit(rows: Array<Record<string, unknown>>): RemyHubSafetyState['auditSummary'] {
  const summary = { total: rows.length, blocked: 0, error: 0, started: 0, success: 0 }
  for (const row of rows) {
    const status = asString(row.status)
    if (status === 'blocked') summary.blocked += 1
    else if (status === 'error') summary.error += 1
    else if (status === 'started') summary.started += 1
    else if (status === 'success') summary.success += 1
  }
  return summary
}

function makeCard(input: {
  id: string
  title: string
  detail: string
  domain: string
  urgency: RemyHubUrgency
  confidence: RemyHubConfidence
  confidenceLabel?: string
  sources: RemyHubSource[]
  nextOptions: string[]
  clientSafe?: boolean
}): RemyHubCard {
  return {
    ...input,
    confidenceLabel: input.confidenceLabel ?? confidenceLabel(input.confidence),
    clientSafe:
      input.clientSafe ?? input.sources.every((source) => source.status !== 'unavailable'),
  }
}

function recordSource(
  recordType: string,
  recordId: string,
  label: string,
  href: string | null,
  excerpt: string
): RemyHubSource {
  return {
    id: `${recordType}-${recordId || label}`,
    label,
    href: recordId ? href : null,
    recordType,
    recordId: recordId || null,
    status: recordId ? 'available' : 'unavailable',
    excerpt: excerpt || 'Source record has no preview field in this query.',
  }
}

function inferenceSource(label: string, excerpt: string): RemyHubSource {
  return {
    id: `inference-${label}`,
    label,
    href: null,
    recordType: 'inference',
    recordId: null,
    status: 'inference',
    excerpt,
  }
}

function collectSources(cards: RemyHubCard[]): RemyHubSource[] {
  const seen = new Set<string>()
  const sources: RemyHubSource[] = []
  for (const card of cards) {
    for (const source of card.sources) {
      if (seen.has(source.id)) continue
      seen.add(source.id)
      sources.push(source)
    }
  }
  return sources.slice(0, 40)
}

function sortCards(cards: RemyHubCard[]): RemyHubCard[] {
  const order: Record<RemyHubUrgency, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return [...cards].sort((left, right) => {
    const byUrgency = order[left.urgency] - order[right.urgency]
    if (byUrgency !== 0) return byUrgency
    return left.title.localeCompare(right.title)
  })
}

function eventUrgency(dateIso: string, now: number): RemyHubUrgency {
  const hours = hoursUntil(dateIso, now)
  if (hours === null) return 'low'
  if (hours <= 24) return 'critical'
  if (hours <= 72) return 'high'
  if (hours <= 168) return 'medium'
  return 'low'
}

function confidenceLabel(confidence: RemyHubConfidence): string {
  if (confidence === 'deterministic') return 'Deterministic from tenant record'
  if (confidence === 'inference') return 'Inference from authorized records'
  return 'Needs chef review'
}

function titleForMemoDraft(
  type: VoiceMemoDraftCard['type'],
  sensitivity: VoiceMemoDraftCard['sensitivity']
): string {
  if (sensitivity === 'safety') return 'Safety fact requires review'
  if (sensitivity === 'payment') return 'Payment language requires review'
  if (sensitivity === 'status') return 'Status change requires review'
  if (type === 'memory') return 'Proposed memory'
  return 'Draft task'
}

function formatRelativeDate(dateIso: string, now: number): string {
  const date = Date.parse(dateIso)
  if (!Number.isFinite(date)) return 'date unavailable'
  const hours = Math.round((date - now) / 36e5)
  if (hours < 0) return `${Math.abs(hours)} hours ago`
  if (hours < 24) return `in ${hours} hours`
  return `in ${Math.round(hours / 24)} days`
}

function hoursUntil(dateIso: string, now: number): number | null {
  const date = Date.parse(dateIso)
  if (!Number.isFinite(date)) return null
  return (date - now) / 36e5
}

function hoursSince(dateIso: string, now: number): number | null {
  const date = Date.parse(dateIso)
  if (!Number.isFinite(date)) return null
  return (now - date) / 36e5
}

function hrefForDomain(domain: string, id: string): string | null {
  if (!id) return null
  if (domain === 'clients') return `/clients/${id}`
  if (domain === 'events') return `/events/${id}`
  if (domain === 'inquiries') return `/inquiries/${id}`
  if (domain === 'quotes') return `/quotes/${id}`
  if (domain === 'remy') return '/remy/history'
  return null
}

function normalizeMemoryCategory(value: string): MemoryCategory {
  const allowed: MemoryCategory[] = [
    'chef_preference',
    'client_insight',
    'business_rule',
    'communication_style',
    'culinary_note',
    'scheduling_pattern',
    'pricing_pattern',
    'workflow_preference',
  ]
  return allowed.includes(value as MemoryCategory) ? (value as MemoryCategory) : 'chef_preference'
}

function asString(value: unknown): string {
  return typeof value === 'string'
    ? value
    : value === null || value === undefined
      ? ''
      : String(value)
}

function asNullableString(value: unknown): string | null {
  const str = asString(value)
  return str ? str : null
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}
