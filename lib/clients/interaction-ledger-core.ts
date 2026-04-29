import type { ActivityEventType } from '@/lib/activity/types'

export type ClientInteractionSource =
  | 'event'
  | 'inquiry'
  | 'message'
  | 'note'
  | 'quote'
  | 'ledger'
  | 'review'
  | 'client_activity'
  | 'menu_revision'
  | 'document_version'

export type ClientInteractionActor = 'chef' | 'client' | 'system'

export type ClientInteractionCode =
  | 'event_drafted'
  | 'event_proposed'
  | 'event_accepted'
  | 'event_paid'
  | 'event_confirmed'
  | 'event_in_progress'
  | 'event_completed'
  | 'event_cancelled'
  | 'inquiry_received'
  | 'inquiry_waiting_on_client'
  | 'inquiry_waiting_on_chef'
  | 'inquiry_quoted'
  | 'inquiry_confirmed'
  | 'inquiry_declined'
  | 'inquiry_expired'
  | 'client_message_received'
  | 'chef_message_sent'
  | 'note_recorded'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_expired'
  | 'payment_recorded'
  | 'refund_recorded'
  | 'client_review_submitted'
  | 'portal_session_started'
  | 'event_viewed'
  | 'quote_viewed'
  | 'invoice_viewed'
  | 'proposal_viewed'
  | 'client_message_sent_from_portal'
  | 'rsvp_submitted'
  | 'client_form_submitted'
  | 'payment_page_viewed'
  | 'document_downloaded'
  | 'public_profile_viewed'
  | 'menu_proposed'
  | 'menu_revision_created'
  | 'menu_feedback_recorded'
  | 'menu_allergen_revision_created'
  | 'document_revision_saved'

export type ClientInteractionArtifactKind =
  | 'event'
  | 'inquiry'
  | 'message'
  | 'client_note'
  | 'quote'
  | 'ledger_entry'
  | 'client_review'
  | 'menu'
  | 'menu_revision'
  | 'document_version'
  | 'invoice'
  | 'proposal'

export type ClientInteractionRevisionContract =
  | 'quote_inline_lineage'
  | 'menu_revision_history'
  | 'document_versions'

export type ClientInteractionArtifactReference = {
  kind: ClientInteractionArtifactKind
  id: string
  label: string
  href?: string | null
  parent?: {
    kind: ClientInteractionArtifactKind
    id: string
    label: string
    href?: string | null
  }
  revision?: {
    lineageKey: string
    sequenceNumber: number
    previousArtifactId: string | null
    isLatest: boolean | null
    contract: ClientInteractionRevisionContract
  }
}

export type ClientInteractionProvenance = {
  table: string
  recordId: string
  recordedAt: string
  happenedAt: string
  sourceFields: string[]
}

export type ClientInteractionLedgerState = {
  status?: string | null
  validUntil?: string | null
}

export type ClientInteractionLedgerEntry = {
  id: string
  source: ClientInteractionSource
  code: ClientInteractionCode
  actor: ClientInteractionActor
  sortAt: string
  occurredAt: string
  recordedAt: string
  summary: string
  detail?: string
  explanation?: string
  artifact?: ClientInteractionArtifactReference
  state?: ClientInteractionLedgerState
  provenance: ClientInteractionProvenance
}

export type UnifiedTimelineProjectionItem = {
  id: string
  source: ClientInteractionSource
  timestamp: string
  summary: string
  detail?: string
  href?: string
  actor?: ClientInteractionActor
  badges?: string[]
  explanation?: string
}

export type EventLedgerRow = {
  id: string
  created_at: string
  event_date?: string | null
  status?: string | null
  occasion?: string | null
  guest_count?: number | null
  quoted_price_cents?: number | null
  cancelled_at?: string | null
}

export type InquiryLedgerRow = {
  id: string
  created_at: string
  first_contact_at?: string | null
  last_response_at?: string | null
  status?: string | null
  channel?: string | null
}

export type MessageLedgerRow = {
  id: string
  created_at: string
  sent_at?: string | null
  channel?: string | null
  direction?: 'inbound' | 'outbound' | string | null
  body?: string | null
  status?: string | null
  subject?: string | null
}

export type NoteLedgerRow = {
  id: string
  created_at: string
  note_text?: string | null
  category?: string | null
  pinned?: boolean | null
  source?: string | null
}

export type QuoteLedgerRow = {
  id: string
  created_at: string
  sent_at?: string | null
  accepted_at?: string | null
  rejected_at?: string | null
  valid_until?: string | null
  status?: string | null
  quote_name?: string | null
  total_quoted_cents?: number | null
  event_id?: string | null
  inquiry_id?: string | null
  version?: number | null
  previous_version_id?: string | null
  is_superseded?: boolean | null
}

export type LedgerEntryRow = {
  id: string
  created_at: string
  received_at?: string | null
  entry_type?: string | null
  amount_cents?: number | null
  payment_method?: string | null
  description?: string | null
}

export type ReviewLedgerRow = {
  id: string
  created_at: string
  rating?: number | null
  what_they_loved?: string | null
  what_could_improve?: string | null
}

export type ClientActivityLedgerRow = {
  id: string
  created_at: string
  event_type: ActivityEventType | string
  entity_type?: string | null
  entity_id?: string | null
  metadata?: Record<string, unknown> | null
}

export type MenuLedgerRow = {
  id: string
  event_id?: string | null
  name?: string | null
}

export type MenuRevisionLedgerRow = {
  id: string
  menu_id: string
  event_id: string
  version: number
  revision_type?: string | null
  changes_summary?: string | null
  created_at: string
}

export type DocumentVersionLedgerRow = {
  id: string
  entity_type: string
  entity_id: string
  version_number: number
  change_summary?: string | null
  created_at?: string | null
}

export type ClientInteractionLedgerInput = {
  clientId: string
  events?: EventLedgerRow[]
  inquiries?: InquiryLedgerRow[]
  messages?: MessageLedgerRow[]
  notes?: NoteLedgerRow[]
  quotes?: QuoteLedgerRow[]
  ledgerEntries?: LedgerEntryRow[]
  reviews?: ReviewLedgerRow[]
  activityEvents?: ClientActivityLedgerRow[]
  menus?: MenuLedgerRow[]
  menuRevisions?: MenuRevisionLedgerRow[]
  documentVersions?: DocumentVersionLedgerRow[]
}

type RevisionIndexEntry = {
  lineageKey: string
  previousArtifactId: string | null
  isLatest: boolean | null
}

type OrderedRevisionItem = {
  id: string
  lineageKey: string
  sequenceNumber: number
  createdAt: string
}

const EVENT_STATUS_MAP: Record<
  string,
  { code: ClientInteractionCode; summary: string; actor: ClientInteractionActor }
> = {
  draft: { code: 'event_drafted', summary: 'Event created', actor: 'chef' },
  proposed: { code: 'event_proposed', summary: 'Event proposed to client', actor: 'chef' },
  accepted: { code: 'event_accepted', summary: 'Client accepted event', actor: 'client' },
  paid: { code: 'event_paid', summary: 'Event deposit paid', actor: 'system' },
  confirmed: { code: 'event_confirmed', summary: 'Event confirmed', actor: 'chef' },
  in_progress: { code: 'event_in_progress', summary: 'Event in progress', actor: 'system' },
  completed: { code: 'event_completed', summary: 'Event completed', actor: 'system' },
  cancelled: { code: 'event_cancelled', summary: 'Event cancelled', actor: 'system' },
}

const INQUIRY_STATUS_MAP: Record<
  string,
  { code: ClientInteractionCode; summary: string; actor: ClientInteractionActor }
> = {
  new: { code: 'inquiry_received', summary: 'New inquiry received', actor: 'client' },
  awaiting_client: {
    code: 'inquiry_waiting_on_client',
    summary: 'Awaiting client reply',
    actor: 'chef',
  },
  awaiting_chef: {
    code: 'inquiry_waiting_on_chef',
    summary: 'Awaiting chef reply',
    actor: 'client',
  },
  quoted: { code: 'inquiry_quoted', summary: 'Inquiry quoted', actor: 'chef' },
  confirmed: { code: 'inquiry_confirmed', summary: 'Inquiry confirmed', actor: 'client' },
  declined: { code: 'inquiry_declined', summary: 'Inquiry declined', actor: 'system' },
  expired: { code: 'inquiry_expired', summary: 'Inquiry expired', actor: 'system' },
}

const QUOTE_STATUS_MAP: Record<
  string,
  { code: ClientInteractionCode; summary: string; actor: ClientInteractionActor }
> = {
  draft: { code: 'quote_created', summary: 'Quote drafted', actor: 'chef' },
  sent: { code: 'quote_sent', summary: 'Quote sent to client', actor: 'chef' },
  accepted: { code: 'quote_accepted', summary: 'Quote accepted', actor: 'client' },
  rejected: { code: 'quote_rejected', summary: 'Quote rejected', actor: 'client' },
  expired: { code: 'quote_expired', summary: 'Quote expired', actor: 'system' },
}

const LEDGER_ENTRY_MAP: Record<
  string,
  { code: ClientInteractionCode; summary: string; actor: ClientInteractionActor }
> = {
  payment: { code: 'payment_recorded', summary: 'Payment received', actor: 'system' },
  deposit: { code: 'payment_recorded', summary: 'Deposit received', actor: 'system' },
  installment: { code: 'payment_recorded', summary: 'Installment received', actor: 'system' },
  final_payment: { code: 'payment_recorded', summary: 'Final payment received', actor: 'system' },
  tip: { code: 'payment_recorded', summary: 'Tip received', actor: 'system' },
  refund: { code: 'refund_recorded', summary: 'Refund issued', actor: 'system' },
  adjustment: { code: 'payment_recorded', summary: 'Balance adjustment', actor: 'system' },
  add_on: { code: 'payment_recorded', summary: 'Add-on charge recorded', actor: 'system' },
  credit: { code: 'payment_recorded', summary: 'Credit applied', actor: 'system' },
}

const MENU_REVISION_MAP: Record<
  string,
  { code: ClientInteractionCode; summary: string; actor: ClientInteractionActor }
> = {
  initial: { code: 'menu_proposed', summary: 'Menu proposal shared', actor: 'chef' },
  chef_update: { code: 'menu_revision_created', summary: 'Menu revision saved', actor: 'chef' },
  client_feedback: {
    code: 'menu_feedback_recorded',
    summary: 'Client menu feedback recorded',
    actor: 'client',
  },
  allergen_resolution: {
    code: 'menu_allergen_revision_created',
    summary: 'Allergen revision saved',
    actor: 'chef',
  },
}

const ACTIVITY_EVENT_MAP: Record<string, { code: ClientInteractionCode; summary: string }> = {
  portal_login: { code: 'portal_session_started', summary: 'Client opened their portal' },
  event_viewed: { code: 'event_viewed', summary: 'Client viewed an event' },
  quote_viewed: { code: 'quote_viewed', summary: 'Client viewed a quote' },
  invoice_viewed: { code: 'invoice_viewed', summary: 'Client viewed an invoice' },
  proposal_viewed: { code: 'proposal_viewed', summary: 'Client viewed a proposal' },
  chat_message_sent: {
    code: 'client_message_sent_from_portal',
    summary: 'Client sent a message from the portal',
  },
  rsvp_submitted: { code: 'rsvp_submitted', summary: 'Client submitted an RSVP' },
  form_submitted: { code: 'client_form_submitted', summary: 'Client submitted a form' },
  payment_page_visited: {
    code: 'payment_page_viewed',
    summary: 'Client opened the payment page',
  },
  document_downloaded: {
    code: 'document_downloaded',
    summary: 'Client downloaded a document',
  },
  public_profile_viewed: {
    code: 'public_profile_viewed',
    summary: 'Known client viewed the public profile',
  },
}

export const HIGH_SIGNAL_CLIENT_ACTIVITY_TYPES = Object.keys(
  ACTIVITY_EVENT_MAP
) as ActivityEventType[]

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function snippet(text: string | null | undefined, maxLen = 90): string {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}...` : trimmed
}

function coalesceTimestamp(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (value) return value
  }
  return new Date(0).toISOString()
}

function joinParts(parts: Array<string | null | undefined>): string | undefined {
  const normalized = parts.map((part) => (part ?? '').trim()).filter(Boolean)
  return normalized.length > 0 ? normalized.join(' · ') : undefined
}

function humanizeToken(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function firstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function buildSequentialRevisionIndex(
  items: OrderedRevisionItem[]
): Map<string, RevisionIndexEntry> {
  const grouped = new Map<string, OrderedRevisionItem[]>()

  for (const item of items) {
    const existing = grouped.get(item.lineageKey) ?? []
    existing.push(item)
    grouped.set(item.lineageKey, existing)
  }

  const index = new Map<string, RevisionIndexEntry>()

  for (const [lineageKey, group] of grouped) {
    group.sort((a, b) => {
      if (a.sequenceNumber !== b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber
      if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt)
      return a.id.localeCompare(b.id)
    })

    for (let i = 0; i < group.length; i += 1) {
      const current = group[i]
      const previous = i > 0 ? group[i - 1] : null
      index.set(current.id, {
        lineageKey,
        previousArtifactId: previous?.id ?? null,
        isLatest: i === group.length - 1,
      })
    }
  }

  return index
}

function buildQuoteRevisionIndex(quotes: QuoteLedgerRow[]): Map<string, RevisionIndexEntry> {
  const byId = new Map(quotes.map((quote) => [quote.id, quote]))
  const rootCache = new Map<string, string>()
  const latestByLineage = new Map<string, QuoteLedgerRow>()

  function findRoot(id: string): string {
    const cached = rootCache.get(id)
    if (cached) return cached

    const seen = new Set<string>()
    let currentId = id
    let current = byId.get(currentId)

    while (current?.previous_version_id && byId.has(current.previous_version_id)) {
      if (seen.has(currentId)) break
      seen.add(currentId)
      currentId = current.previous_version_id
      current = byId.get(currentId)
    }

    rootCache.set(id, currentId)
    return currentId
  }

  function isLater(candidate: QuoteLedgerRow, current: QuoteLedgerRow): boolean {
    const candidateVersion = candidate.version ?? 1
    const currentVersion = current.version ?? 1
    if (candidateVersion !== currentVersion) return candidateVersion > currentVersion
    return candidate.created_at > current.created_at
  }

  for (const quote of quotes) {
    const rootId = findRoot(quote.id)
    const currentLatest = latestByLineage.get(rootId)
    if (!currentLatest || isLater(quote, currentLatest)) {
      latestByLineage.set(rootId, quote)
    }
  }

  const index = new Map<string, RevisionIndexEntry>()

  for (const quote of quotes) {
    const rootId = findRoot(quote.id)
    const latest = latestByLineage.get(rootId)
    index.set(quote.id, {
      lineageKey: `quote:${rootId}`,
      previousArtifactId: quote.previous_version_id ?? null,
      isLatest: latest ? latest.id === quote.id : quote.is_superseded ? false : null,
    })
  }

  return index
}

function resolveActivityArtifact(
  row: ClientActivityLedgerRow,
  context: {
    eventById: Map<string, EventLedgerRow>
    quoteById: Map<string, QuoteLedgerRow>
  }
): ClientInteractionArtifactReference | undefined {
  if (!row.entity_type || !row.entity_id) return undefined

  if (row.entity_type === 'event') {
    const event = context.eventById.get(row.entity_id)
    return {
      kind: 'event',
      id: row.entity_id,
      label: event?.occasion?.trim() || 'Event',
      href: `/events/${row.entity_id}`,
    }
  }

  if (row.entity_type === 'quote') {
    const quote = context.quoteById.get(row.entity_id)
    return {
      kind: 'quote',
      id: row.entity_id,
      label: quote?.quote_name?.trim() || 'Quote',
      href: `/quotes/${row.entity_id}`,
    }
  }

  if (row.entity_type === 'invoice') {
    return {
      kind: 'invoice',
      id: row.entity_id,
      label: 'Invoice',
    }
  }

  if (row.entity_type === 'proposal') {
    return {
      kind: 'proposal',
      id: row.entity_id,
      label: 'Proposal',
    }
  }

  return undefined
}

function buildActivityDetail(
  row: ClientActivityLedgerRow,
  artifact: ClientInteractionArtifactReference | undefined
): string | undefined {
  const metadata = row.metadata ?? {}
  const metadataLabel = firstString(
    metadata['label'],
    metadata['documentName'],
    metadata['formName'],
    metadata['pageTitle'],
    metadata['path']
  )

  return joinParts([artifact?.label, metadataLabel ? snippet(metadataLabel, 60) : null])
}

function compareLedgerEntries(
  a: ClientInteractionLedgerEntry,
  b: ClientInteractionLedgerEntry
): number {
  if (a.sortAt !== b.sortAt) return b.sortAt.localeCompare(a.sortAt)
  if (a.recordedAt !== b.recordedAt) return b.recordedAt.localeCompare(a.recordedAt)
  return a.id.localeCompare(b.id)
}

function buildTimelineBadges(entry: ClientInteractionLedgerEntry): string[] {
  const badges: string[] = []
  const revision = entry.artifact?.revision
  if (!revision) return badges

  if (entry.artifact?.kind === 'quote') {
    badges.push(`Quote v${revision.sequenceNumber}`)
    if (revision.isLatest === false) badges.push('Superseded')
    return badges
  }

  if (entry.source === 'menu_revision') {
    badges.push(`Menu v${revision.sequenceNumber}`)
    return badges
  }

  if (entry.source === 'document_version') {
    const parentKind = entry.artifact?.parent?.kind
    if (parentKind === 'quote') badges.push(`Quote doc v${revision.sequenceNumber}`)
    else if (parentKind === 'menu') badges.push(`Menu doc v${revision.sequenceNumber}`)
    else badges.push(`Doc v${revision.sequenceNumber}`)
  }

  return badges
}

export function projectInteractionLedgerToUnifiedTimeline(
  entries: ClientInteractionLedgerEntry[],
  limit = 60
): UnifiedTimelineProjectionItem[] {
  return entries.slice(0, Math.max(limit, 1)).map((entry) => ({
    id: entry.id,
    source: entry.source,
    timestamp: entry.sortAt,
    summary: entry.summary,
    detail: entry.detail,
    href: entry.artifact?.href ?? undefined,
    actor: entry.actor,
    badges: buildTimelineBadges(entry),
    explanation: entry.explanation,
  }))
}

export function buildClientInteractionLedgerEntries(
  input: ClientInteractionLedgerInput
): ClientInteractionLedgerEntry[] {
  const events = input.events ?? []
  const inquiries = input.inquiries ?? []
  const messages = input.messages ?? []
  const notes = input.notes ?? []
  const quotes = input.quotes ?? []
  const ledgerEntries = input.ledgerEntries ?? []
  const reviews = input.reviews ?? []
  const activityEvents = input.activityEvents ?? []
  const menus = input.menus ?? []
  const menuRevisions = input.menuRevisions ?? []
  const documentVersions = input.documentVersions ?? []

  const eventById = new Map(events.map((event) => [event.id, event]))
  const menuById = new Map(menus.map((menu) => [menu.id, menu]))
  const quoteById = new Map(quotes.map((quote) => [quote.id, quote]))
  const quoteRevisionIndex = buildQuoteRevisionIndex(quotes)
  const menuRevisionIndex = buildSequentialRevisionIndex(
    menuRevisions.map((revision) => ({
      id: revision.id,
      lineageKey: `menu:${revision.menu_id}`,
      sequenceNumber: revision.version,
      createdAt: revision.created_at,
    }))
  )
  const documentRevisionIndex = buildSequentialRevisionIndex(
    documentVersions.map((version) => ({
      id: version.id,
      lineageKey: `${version.entity_type}:${version.entity_id}`,
      sequenceNumber: version.version_number,
      createdAt: version.created_at ?? new Date(0).toISOString(),
    }))
  )

  const entries: ClientInteractionLedgerEntry[] = []

  for (const row of events) {
    const mapped = EVENT_STATUS_MAP[row.status ?? ''] ?? {
      code: 'event_confirmed' as ClientInteractionCode,
      summary: row.status ? `Event ${humanizeToken(row.status)?.toLowerCase()}` : 'Event updated',
      actor: 'system' as ClientInteractionActor,
    }
    const sortAt = coalesceTimestamp(row.cancelled_at, row.created_at)

    entries.push({
      id: `event:${row.id}`,
      source: 'event',
      code: mapped.code,
      actor: mapped.actor,
      sortAt,
      occurredAt: sortAt,
      recordedAt: row.created_at,
      summary: mapped.summary,
      detail: joinParts([
        row.occasion,
        row.guest_count ? `${row.guest_count} guests` : null,
        typeof row.quoted_price_cents === 'number' ? formatCents(row.quoted_price_cents) : null,
      ]),
      artifact: {
        kind: 'event',
        id: row.id,
        label: row.occasion?.trim() || 'Event',
        href: `/events/${row.id}`,
      },
      state: {
        status: row.status ?? null,
      },
      provenance: {
        table: 'events',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: sortAt,
        sourceFields: ['status', 'event_date', 'cancelled_at', 'created_at'],
      },
    })
  }

  for (const row of inquiries) {
    const mapped = INQUIRY_STATUS_MAP[row.status ?? ''] ?? {
      code: 'inquiry_received' as ClientInteractionCode,
      summary: row.status
        ? `Inquiry ${humanizeToken(row.status)?.toLowerCase()}`
        : 'Inquiry updated',
      actor: 'system' as ClientInteractionActor,
    }
    const sortAt = coalesceTimestamp(row.first_contact_at, row.last_response_at, row.created_at)

    entries.push({
      id: `inquiry:${row.id}`,
      source: 'inquiry',
      code: mapped.code,
      actor: mapped.actor,
      sortAt,
      occurredAt: sortAt,
      recordedAt: row.created_at,
      summary: mapped.summary,
      detail: row.channel ? `via ${row.channel}` : undefined,
      artifact: {
        kind: 'inquiry',
        id: row.id,
        label: 'Inquiry',
        href: `/inquiries/${row.id}`,
      },
      state: {
        status: row.status ?? null,
      },
      provenance: {
        table: 'inquiries',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: sortAt,
        sourceFields: ['status', 'first_contact_at', 'last_response_at', 'channel'],
      },
    })
  }

  for (const row of messages) {
    const sortAt = coalesceTimestamp(row.sent_at, row.created_at)
    const inbound = row.direction === 'inbound'

    entries.push({
      id: `message:${row.id}`,
      source: 'message',
      code: inbound ? 'client_message_received' : 'chef_message_sent',
      actor: inbound ? 'client' : 'chef',
      sortAt,
      occurredAt: sortAt,
      recordedAt: row.created_at,
      summary: inbound ? 'Client messaged' : 'You messaged client',
      detail: joinParts([
        row.channel ? humanizeToken(row.channel)?.toLowerCase() : null,
        snippet(row.subject || row.body),
      ]),
      artifact: {
        kind: 'message',
        id: row.id,
        label: row.subject?.trim() || 'Message',
      },
      provenance: {
        table: 'messages',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: sortAt,
        sourceFields: ['sent_at', 'direction', 'channel', 'subject', 'body'],
      },
    })
  }

  for (const row of notes) {
    entries.push({
      id: `note:${row.id}`,
      source: 'note',
      code: 'note_recorded',
      actor: row.source === 'manual' ? 'chef' : 'system',
      sortAt: row.created_at,
      occurredAt: row.created_at,
      recordedAt: row.created_at,
      summary: row.pinned ? 'Pinned note recorded' : 'Note recorded',
      detail: joinParts([
        row.category ? humanizeToken(row.category)?.toLowerCase() : null,
        snippet(row.note_text),
      ]),
      artifact: {
        kind: 'client_note',
        id: row.id,
        label: 'Client note',
      },
      provenance: {
        table: 'client_notes',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: row.created_at,
        sourceFields: ['created_at', 'category', 'pinned', 'source'],
      },
    })
  }

  for (const row of quotes) {
    const mapped = QUOTE_STATUS_MAP[row.status ?? ''] ?? {
      code: 'quote_created' as ClientInteractionCode,
      summary: row.status ? `Quote ${humanizeToken(row.status)?.toLowerCase()}` : 'Quote updated',
      actor: 'system' as ClientInteractionActor,
    }
    const revision = quoteRevisionIndex.get(row.id)
    const sortAt = coalesceTimestamp(row.accepted_at, row.rejected_at, row.sent_at, row.created_at)

    entries.push({
      id: `quote:${row.id}`,
      source: 'quote',
      code: mapped.code,
      actor: mapped.actor,
      sortAt,
      occurredAt: sortAt,
      recordedAt: row.created_at,
      summary: mapped.summary,
      detail: joinParts([
        row.quote_name,
        typeof row.total_quoted_cents === 'number' ? formatCents(row.total_quoted_cents) : null,
      ]),
      explanation:
        (row.version ?? 1) > 1
          ? `Quote revision ${row.version} in the client pricing lineage.`
          : undefined,
      artifact: {
        kind: 'quote',
        id: row.id,
        label: row.quote_name?.trim() || 'Quote',
        href: `/quotes/${row.id}`,
        parent: row.event_id
          ? {
              kind: 'event',
              id: row.event_id,
              label: eventById.get(row.event_id)?.occasion?.trim() || 'Event',
              href: `/events/${row.event_id}`,
            }
          : row.inquiry_id
            ? {
                kind: 'inquiry',
                id: row.inquiry_id,
                label: 'Inquiry',
                href: `/inquiries/${row.inquiry_id}`,
              }
            : undefined,
        revision: revision
          ? {
              lineageKey: revision.lineageKey,
              sequenceNumber: row.version ?? 1,
              previousArtifactId: revision.previousArtifactId,
              isLatest: revision.isLatest ?? !(row.is_superseded ?? false),
              contract: 'quote_inline_lineage',
            }
          : undefined,
      },
      state: {
        status: row.status ?? null,
        validUntil: row.valid_until ?? null,
      },
      provenance: {
        table: 'quotes',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: sortAt,
        sourceFields: [
          'status',
          'sent_at',
          'accepted_at',
          'rejected_at',
          'version',
          'previous_version_id',
        ],
      },
    })
  }

  for (const row of ledgerEntries) {
    const mapped = LEDGER_ENTRY_MAP[row.entry_type ?? ''] ?? {
      code: 'payment_recorded' as ClientInteractionCode,
      summary: row.entry_type
        ? `${humanizeToken(row.entry_type)} recorded`
        : 'Ledger entry recorded',
      actor: 'system' as ClientInteractionActor,
    }
    const sortAt = coalesceTimestamp(row.received_at, row.created_at)

    entries.push({
      id: `ledger:${row.id}`,
      source: 'ledger',
      code: mapped.code,
      actor: mapped.actor,
      sortAt,
      occurredAt: sortAt,
      recordedAt: row.created_at,
      summary: mapped.summary,
      detail: joinParts([
        typeof row.amount_cents === 'number' ? formatCents(Math.abs(row.amount_cents)) : null,
        row.payment_method,
        snippet(row.description, 40),
      ]),
      artifact: {
        kind: 'ledger_entry',
        id: row.id,
        label: 'Payment',
      },
      provenance: {
        table: 'ledger_entries',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: sortAt,
        sourceFields: ['entry_type', 'received_at', 'amount_cents', 'payment_method'],
      },
    })
  }

  for (const row of reviews) {
    entries.push({
      id: `review:${row.id}`,
      source: 'review',
      code: 'client_review_submitted',
      actor: 'client',
      sortAt: row.created_at,
      occurredAt: row.created_at,
      recordedAt: row.created_at,
      summary: `Client left a review${row.rating ? ` (${row.rating}/5)` : ''}`,
      detail: snippet(row.what_they_loved || row.what_could_improve),
      artifact: {
        kind: 'client_review',
        id: row.id,
        label: 'Review',
      },
      provenance: {
        table: 'client_reviews',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: row.created_at,
        sourceFields: ['rating', 'what_they_loved', 'what_could_improve'],
      },
    })
  }

  for (const row of activityEvents) {
    const mapped = ACTIVITY_EVENT_MAP[row.event_type]
    if (!mapped) continue

    const artifact = resolveActivityArtifact(row, { eventById, quoteById })

    entries.push({
      id: `activity:${row.id}`,
      source: 'client_activity',
      code: mapped.code,
      actor: 'client',
      sortAt: row.created_at,
      occurredAt: row.created_at,
      recordedAt: row.created_at,
      summary: mapped.summary,
      detail: buildActivityDetail(row, artifact),
      explanation: 'Direct client portal activity.',
      artifact,
      provenance: {
        table: 'activity_events',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: row.created_at,
        sourceFields: ['event_type', 'entity_type', 'entity_id', 'metadata'],
      },
    })
  }

  for (const row of menuRevisions) {
    const mapped = MENU_REVISION_MAP[row.revision_type ?? ''] ?? {
      code: 'menu_revision_created' as ClientInteractionCode,
      summary: row.revision_type
        ? `${humanizeToken(row.revision_type)} menu revision`
        : 'Menu revision saved',
      actor: 'chef' as ClientInteractionActor,
    }
    const menu = menuById.get(row.menu_id)
    const revision = menuRevisionIndex.get(row.id)

    entries.push({
      id: `menu_revision:${row.id}`,
      source: 'menu_revision',
      code: mapped.code,
      actor: mapped.actor,
      sortAt: row.created_at,
      occurredAt: row.created_at,
      recordedAt: row.created_at,
      summary: mapped.summary,
      detail: row.changes_summary?.trim() || menu?.name?.trim() || `Menu revision ${row.version}`,
      explanation: `Menu revision ${row.version} for the linked event menu.`,
      artifact: {
        kind: 'menu_revision',
        id: row.id,
        label: menu?.name?.trim() || 'Menu revision',
        href: `/events/${row.event_id}`,
        parent: {
          kind: 'menu',
          id: row.menu_id,
          label: menu?.name?.trim() || 'Menu',
          href: `/menus/${row.menu_id}`,
        },
        revision: revision
          ? {
              lineageKey: revision.lineageKey,
              sequenceNumber: row.version,
              previousArtifactId: revision.previousArtifactId,
              isLatest: revision.isLatest,
              contract: 'menu_revision_history',
            }
          : undefined,
      },
      provenance: {
        table: 'menu_revisions',
        recordId: row.id,
        recordedAt: row.created_at,
        happenedAt: row.created_at,
        sourceFields: ['menu_id', 'event_id', 'version', 'revision_type', 'changes_summary'],
      },
    })
  }

  for (const row of documentVersions) {
    const revision = documentRevisionIndex.get(row.id)
    const parentKind = row.entity_type === 'quote' ? 'quote' : 'menu'
    const parentHref =
      row.entity_type === 'quote' ? `/quotes/${row.entity_id}` : `/menus/${row.entity_id}`
    const parentLabel =
      row.entity_type === 'quote'
        ? quoteById.get(row.entity_id)?.quote_name?.trim() || 'Quote'
        : menuById.get(row.entity_id)?.name?.trim() || 'Menu'

    entries.push({
      id: `document_version:${row.id}`,
      source: 'document_version',
      code: 'document_revision_saved',
      actor: 'chef',
      sortAt: coalesceTimestamp(row.created_at),
      occurredAt: coalesceTimestamp(row.created_at),
      recordedAt: coalesceTimestamp(row.created_at),
      summary: `${humanizeToken(row.entity_type) || 'Document'} version saved`,
      detail:
        row.change_summary?.trim() ||
        `Version ${row.version_number} for the linked ${row.entity_type}`,
      explanation: `Snapshot version ${row.version_number} normalized from document_versions.`,
      artifact: {
        kind: 'document_version',
        id: row.id,
        label: `${humanizeToken(row.entity_type) || 'Document'} document`,
        href: parentHref,
        parent: {
          kind: parentKind,
          id: row.entity_id,
          label: parentLabel,
          href: parentHref,
        },
        revision: revision
          ? {
              lineageKey: revision.lineageKey,
              sequenceNumber: row.version_number,
              previousArtifactId: revision.previousArtifactId,
              isLatest: revision.isLatest,
              contract: 'document_versions',
            }
          : undefined,
      },
      provenance: {
        table: 'document_versions',
        recordId: row.id,
        recordedAt: coalesceTimestamp(row.created_at),
        happenedAt: coalesceTimestamp(row.created_at),
        sourceFields: ['entity_type', 'entity_id', 'version_number', 'change_summary'],
      },
    })
  }

  const deduped = new Map<string, ClientInteractionLedgerEntry>()
  for (const entry of entries.sort(compareLedgerEntries)) {
    if (!deduped.has(entry.id)) deduped.set(entry.id, entry)
  }

  return Array.from(deduped.values())
}
