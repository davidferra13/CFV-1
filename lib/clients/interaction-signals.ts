import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getClientHealthScores,
  type ClientHealthScore,
  type ClientHealthTier,
} from './health-score'
import { getClientInteractionLedger } from './interaction-ledger'
import type { ClientInteractionCode, ClientInteractionLedgerEntry } from './interaction-ledger-core'
import type { ClientActionType } from './action-vocabulary'

const INTERACTION_SIGNAL_META = {
  awaiting_chef_reply: {
    label: 'Awaiting chef reply',
    shortLabel: 'Awaiting chef reply',
    actionType: 'reply_inquiry',
  },
  quote_expiring_soon: {
    label: 'Quote expiring soon',
    shortLabel: 'Quote expiring soon',
    actionType: 'follow_up_quote',
  },
  quote_viewed_without_response: {
    label: 'Quote viewed without response',
    shortLabel: 'Viewed quote, no reply',
    actionType: 'follow_up_quote',
  },
  milestone_upcoming: {
    label: 'Milestone upcoming',
    shortLabel: 'Milestone upcoming',
    actionType: 'send_birthday',
  },
  relationship_at_risk: {
    label: 'Relationship at risk',
    shortLabel: 'At risk',
    actionType: 'reach_out',
  },
  relationship_champion: {
    label: 'Relationship champion',
    shortLabel: 'Champion',
    actionType: 'ask_referral',
  },
  relationship_dormant: {
    label: 'Relationship dormant',
    shortLabel: 'Dormant',
    actionType: 're_engage',
  },
  first_event_conversion_needed: {
    label: 'First event conversion needed',
    shortLabel: 'First booking needed',
    actionType: 'schedule_event',
  },
} as const satisfies Record<
  string,
  {
    label: string
    shortLabel: string
    actionType: ClientActionType
  }
>

export type ClientInteractionSignalType = keyof typeof INTERACTION_SIGNAL_META

export type ClientInteractionSignalReason = {
  code: string
  message: string
  sourceType: 'ledger_entry' | 'health_score' | 'client_record'
  sourceId: string
  ledgerEntryId?: string
  table?: string
  recordId?: string
  happenedAt?: string | null
}

export type ClientInteractionSignal = {
  type: ClientInteractionSignalType
  label: string
  shortLabel: string
  actionType: ClientActionType
  occurredAt: string
  reasons: ClientInteractionSignalReason[]
  ledgerEntryIds: string[]
  context: {
    href?: string
    inquiryId?: string
    quoteId?: string
    validUntil?: string | null
    daysUntil?: number | null
    milestoneType?: 'birthday' | 'anniversary' | null
    milestoneDate?: string | null
    tier?: ClientHealthTier | null
    healthScore?: number | null
    daysSinceLastEvent?: number | null
    totalEvents?: number | null
  }
}

export type ClientInteractionSignalSnapshot = {
  clientId: string
  ordered: ClientInteractionSignal[]
  byType: Partial<Record<ClientInteractionSignalType, ClientInteractionSignal>>
}

type ClientMilestoneRecord = {
  birthday: string | null
  anniversary: string | null
}

const SIGNAL_PRECEDENCE: ClientInteractionSignalType[] = [
  'awaiting_chef_reply',
  'quote_viewed_without_response',
  'quote_expiring_soon',
  'milestone_upcoming',
  'relationship_at_risk',
  'relationship_champion',
  'relationship_dormant',
  'first_event_conversion_needed',
]

const CLIENT_RESPONSE_CODES = new Set<ClientInteractionCode>([
  'client_message_received',
  'client_message_sent_from_portal',
  'inquiry_waiting_on_chef',
  'inquiry_confirmed',
  'inquiry_declined',
  'quote_accepted',
  'quote_rejected',
])

function startOfToday(reference = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
}

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NaN
  return Date.parse(value)
}

function compareSignals(left: ClientInteractionSignal, right: ClientInteractionSignal): number {
  const leftIndex = SIGNAL_PRECEDENCE.indexOf(left.type)
  const rightIndex = SIGNAL_PRECEDENCE.indexOf(right.type)
  if (leftIndex !== rightIndex) return leftIndex - rightIndex
  return parseTimestamp(right.occurredAt) - parseTimestamp(left.occurredAt)
}

function getDaysUntil(targetDate: Date, today: Date): number {
  return Math.ceil((targetDate.getTime() - today.getTime()) / 86400000)
}

function formatAnnualDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}

function getNextAnnualOccurrence(
  value: string | null | undefined,
  reference = new Date()
): Date | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  const candidate = new Date(reference.getFullYear(), parsed.getMonth(), parsed.getDate())
  const today = startOfToday(reference)

  if (candidate < today) {
    candidate.setFullYear(reference.getFullYear() + 1)
  }

  return candidate
}

function buildLedgerReason(
  entry: ClientInteractionLedgerEntry,
  code: string,
  message: string
): ClientInteractionSignalReason {
  return {
    code,
    message,
    sourceType: 'ledger_entry',
    sourceId: entry.id,
    ledgerEntryId: entry.id,
    table: entry.provenance.table,
    recordId: entry.provenance.recordId,
    happenedAt: entry.provenance.happenedAt,
  }
}

function buildHealthReason(
  clientId: string,
  code: string,
  message: string
): ClientInteractionSignalReason {
  return {
    code,
    message,
    sourceType: 'health_score',
    sourceId: clientId,
  }
}

function buildClientRecordReason(
  clientId: string,
  field: 'birthday' | 'anniversary',
  message: string,
  value: string
): ClientInteractionSignalReason {
  return {
    code: `client_record_${field}`,
    message,
    sourceType: 'client_record',
    sourceId: clientId,
    table: 'clients',
    recordId: clientId,
    happenedAt: value,
  }
}

export function getClientInteractionSignalMeta(signalType: ClientInteractionSignalType) {
  return INTERACTION_SIGNAL_META[signalType]
}

export function getClientInteractionSignalShortLabel(
  signalType: ClientInteractionSignalType
): string {
  return getClientInteractionSignalMeta(signalType).shortLabel
}

function buildAwaitingChefReplySignal(
  entries: ClientInteractionLedgerEntry[]
): ClientInteractionSignal | null {
  const inquiry = entries.find(
    (entry) => entry.code === 'inquiry_waiting_on_chef' && entry.artifact?.kind === 'inquiry'
  )
  if (!inquiry) return null

  const meta = getClientInteractionSignalMeta('awaiting_chef_reply')

  return {
    type: 'awaiting_chef_reply',
    label: meta.label,
    shortLabel: meta.shortLabel,
    actionType: meta.actionType,
    occurredAt: inquiry.sortAt,
    reasons: [
      buildLedgerReason(
        inquiry,
        'inquiry_waiting_on_chef',
        'The latest inquiry state still shows that the chef owes the next reply.'
      ),
    ],
    ledgerEntryIds: [inquiry.id],
    context: {
      href: inquiry.artifact?.href ?? '/inquiries',
      inquiryId: inquiry.artifact?.id,
    },
  }
}

function buildQuoteSignals(
  entries: ClientInteractionLedgerEntry[],
  reference = new Date()
): {
  quoteViewedWithoutResponse: ClientInteractionSignal | null
  quoteExpiringSoon: ClientInteractionSignal | null
} {
  const today = startOfToday(reference)
  const sentQuotes = entries.filter(
    (entry) => entry.code === 'quote_sent' && entry.artifact?.kind === 'quote'
  )

  const quoteExpiringCandidates: ClientInteractionSignal[] = []
  const quoteViewedCandidates: ClientInteractionSignal[] = []

  for (const quote of sentQuotes) {
    const quoteId = quote.artifact?.id
    if (!quoteId) continue

    const validUntil = quote.state?.validUntil ?? null
    const validUntilDate = validUntil ? new Date(validUntil) : null
    const daysUntil =
      validUntilDate && !Number.isNaN(validUntilDate.getTime())
        ? getDaysUntil(validUntilDate, today)
        : null

    if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 7) {
      const meta = getClientInteractionSignalMeta('quote_expiring_soon')
      quoteExpiringCandidates.push({
        type: 'quote_expiring_soon',
        label: meta.label,
        shortLabel: meta.shortLabel,
        actionType: meta.actionType,
        occurredAt: validUntil!,
        reasons: [
          buildLedgerReason(
            quote,
            'quote_expiring_soon',
            `The latest sent quote expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`
          ),
        ],
        ledgerEntryIds: [quote.id],
        context: {
          quoteId,
          validUntil,
          daysUntil,
        },
      })
    }

    const latestView = entries.find(
      (entry) =>
        entry.code === 'quote_viewed' &&
        entry.artifact?.kind === 'quote' &&
        entry.artifact.id === quoteId &&
        parseTimestamp(entry.sortAt) >= parseTimestamp(quote.sortAt)
    )

    if (!latestView) continue

    const hasClientResponseAfterView = entries.some((entry) => {
      if (!CLIENT_RESPONSE_CODES.has(entry.code)) return false
      return parseTimestamp(entry.sortAt) > parseTimestamp(latestView.sortAt)
    })

    if (hasClientResponseAfterView) continue

    const meta = getClientInteractionSignalMeta('quote_viewed_without_response')
    const reasons = [
      buildLedgerReason(
        latestView,
        'quote_viewed_without_response',
        'The client opened the quote, but no later client response is recorded in the canonical ledger.'
      ),
    ]

    if (daysUntil !== null && validUntil) {
      reasons.push(
        buildLedgerReason(
          quote,
          'quote_still_open',
          `That same quote is still open and expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`
        )
      )
    }

    quoteViewedCandidates.push({
      type: 'quote_viewed_without_response',
      label: meta.label,
      shortLabel: meta.shortLabel,
      actionType: meta.actionType,
      occurredAt: latestView.sortAt,
      reasons,
      ledgerEntryIds: [latestView.id, quote.id],
      context: {
        quoteId,
        validUntil,
        daysUntil,
      },
    })
  }

  const quoteViewedWithoutResponse =
    quoteViewedCandidates.sort(
      (left, right) => parseTimestamp(right.occurredAt) - parseTimestamp(left.occurredAt)
    )[0] ?? null
  const quoteExpiringSoon =
    quoteExpiringCandidates.sort((left, right) => {
      const leftDays = left.context.daysUntil ?? Number.MAX_SAFE_INTEGER
      const rightDays = right.context.daysUntil ?? Number.MAX_SAFE_INTEGER
      if (leftDays !== rightDays) return leftDays - rightDays
      return parseTimestamp(left.occurredAt) - parseTimestamp(right.occurredAt)
    })[0] ?? null

  return {
    quoteViewedWithoutResponse,
    quoteExpiringSoon,
  }
}

function buildMilestoneSignal(
  clientId: string,
  milestones: ClientMilestoneRecord,
  reference = new Date()
): ClientInteractionSignal | null {
  const today = startOfToday(reference)
  const candidates = [
    {
      field: 'birthday' as const,
      value: milestones.birthday,
      typeLabel: 'birthday' as const,
    },
    {
      field: 'anniversary' as const,
      value: milestones.anniversary,
      typeLabel: 'anniversary' as const,
    },
  ]
    .map((candidate) => {
      const occurrence = getNextAnnualOccurrence(candidate.value, reference)
      if (!occurrence) return null
      const daysUntil = getDaysUntil(occurrence, today)
      if (daysUntil < 0 || daysUntil > 14) return null
      return {
        ...candidate,
        daysUntil,
        occurrence,
      }
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => left.daysUntil - right.daysUntil)

  const milestone = candidates[0]
  if (!milestone) return null

  const meta = getClientInteractionSignalMeta('milestone_upcoming')
  const formattedDate = formatAnnualDate(milestone.occurrence)

  return {
    type: 'milestone_upcoming',
    label: meta.label,
    shortLabel: meta.shortLabel,
    actionType: meta.actionType,
    occurredAt: milestone.occurrence.toISOString(),
    reasons: [
      buildClientRecordReason(
        clientId,
        milestone.field,
        `The client's ${milestone.typeLabel} is in ${milestone.daysUntil} day${milestone.daysUntil === 1 ? '' : 's'}, on ${formattedDate}.`,
        milestone.value!
      ),
    ],
    ledgerEntryIds: [],
    context: {
      daysUntil: milestone.daysUntil,
      milestoneType: milestone.typeLabel,
      milestoneDate: milestone.value,
    },
  }
}

function buildHealthSignals(
  healthScore: ClientHealthScore | null,
  reference = new Date()
): Array<ClientInteractionSignal | null> {
  if (!healthScore) return []

  if (healthScore.tier === 'at_risk') {
    const meta = getClientInteractionSignalMeta('relationship_at_risk')
    return [
      {
        type: 'relationship_at_risk',
        label: meta.label,
        shortLabel: meta.shortLabel,
        actionType: meta.actionType,
        occurredAt: reference.toISOString(),
        reasons: [
          buildHealthReason(
            healthScore.clientId,
            'relationship_at_risk',
            `Health scoring marks this relationship as at risk after ${healthScore.daysSinceLastEvent ?? '?'} days since the last event.`
          ),
        ],
        ledgerEntryIds: [],
        context: {
          tier: healthScore.tier,
          healthScore: healthScore.score,
          daysSinceLastEvent: healthScore.daysSinceLastEvent,
          totalEvents: healthScore.totalEvents,
        },
      },
    ]
  }

  if (healthScore.tier === 'champion') {
    const meta = getClientInteractionSignalMeta('relationship_champion')
    return [
      {
        type: 'relationship_champion',
        label: meta.label,
        shortLabel: meta.shortLabel,
        actionType: meta.actionType,
        occurredAt: reference.toISOString(),
        reasons: [
          buildHealthReason(
            healthScore.clientId,
            'relationship_champion',
            `Health scoring classifies this client as a champion relationship with a score of ${healthScore.score}.`
          ),
        ],
        ledgerEntryIds: [],
        context: {
          tier: healthScore.tier,
          healthScore: healthScore.score,
          daysSinceLastEvent: healthScore.daysSinceLastEvent,
          totalEvents: healthScore.totalEvents,
        },
      },
    ]
  }

  if (healthScore.tier === 'dormant') {
    const meta = getClientInteractionSignalMeta('relationship_dormant')
    return [
      {
        type: 'relationship_dormant',
        label: meta.label,
        shortLabel: meta.shortLabel,
        actionType: meta.actionType,
        occurredAt: reference.toISOString(),
        reasons: [
          buildHealthReason(
            healthScore.clientId,
            'relationship_dormant',
            `Health scoring marks this relationship as dormant after ${healthScore.daysSinceLastEvent ?? '?'} days since the last event.`
          ),
        ],
        ledgerEntryIds: [],
        context: {
          tier: healthScore.tier,
          healthScore: healthScore.score,
          daysSinceLastEvent: healthScore.daysSinceLastEvent,
          totalEvents: healthScore.totalEvents,
        },
      },
    ]
  }

  if (healthScore.tier === 'new' && healthScore.totalEvents === 0) {
    const meta = getClientInteractionSignalMeta('first_event_conversion_needed')
    return [
      {
        type: 'first_event_conversion_needed',
        label: meta.label,
        shortLabel: meta.shortLabel,
        actionType: meta.actionType,
        occurredAt: reference.toISOString(),
        reasons: [
          buildHealthReason(
            healthScore.clientId,
            'first_event_conversion_needed',
            'Health scoring still sees this client as new with no completed or booked event history.'
          ),
        ],
        ledgerEntryIds: [],
        context: {
          tier: healthScore.tier,
          healthScore: healthScore.score,
          daysSinceLastEvent: healthScore.daysSinceLastEvent,
          totalEvents: healthScore.totalEvents,
        },
      },
    ]
  }

  return []
}

export function buildClientInteractionSignalSnapshot(input: {
  clientId: string
  ledger: ClientInteractionLedgerEntry[]
  healthScore: ClientHealthScore | null
  milestones: ClientMilestoneRecord
  now?: Date
}): ClientInteractionSignalSnapshot {
  const now = input.now ?? new Date()
  const { quoteViewedWithoutResponse, quoteExpiringSoon } = buildQuoteSignals(input.ledger, now)

  const activeSignals = [
    buildAwaitingChefReplySignal(input.ledger),
    quoteViewedWithoutResponse,
    quoteExpiringSoon,
    buildMilestoneSignal(input.clientId, input.milestones, now),
    ...buildHealthSignals(input.healthScore, now),
  ]
    .filter((signal): signal is ClientInteractionSignal => Boolean(signal))
    .sort(compareSignals)

  const byType: Partial<Record<ClientInteractionSignalType, ClientInteractionSignal>> = {}
  for (const signal of activeSignals) {
    byType[signal.type] = signal
  }

  return {
    clientId: input.clientId,
    ordered: activeSignals,
    byType,
  }
}

export async function getClientInteractionSignals(clientId: string) {
  const signalMap = await getClientInteractionSignalMap([clientId])
  return (
    signalMap.get(clientId) ?? {
      clientId,
      ordered: [],
      byType: {},
    }
  )
}

export async function getClientInteractionSignalMap(
  clientIds: string[],
  options?: {
    healthScoreByClientId?: Map<string, ClientHealthScore>
    milestoneByClientId?: Map<string, ClientMilestoneRecord>
  }
) {
  const uniqueClientIds = [...new Set(clientIds.filter(Boolean))]
  const empty = new Map<string, ClientInteractionSignalSnapshot>()

  if (uniqueClientIds.length === 0) {
    return empty
  }

  let healthScoreByClientId = options?.healthScoreByClientId
  let milestoneByClientId = options?.milestoneByClientId

  if (!healthScoreByClientId || !milestoneByClientId) {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId!

    const [{ scores }, { data: clientRows }] = await Promise.all([
      healthScoreByClientId
        ? Promise.resolve({ scores: Array.from(healthScoreByClientId.values()) })
        : getClientHealthScores(),
      milestoneByClientId
        ? Promise.resolve({ data: [] })
        : db
            .from('clients')
            .select('id, birthday, anniversary')
            .eq('tenant_id', tenantId)
            .in('id', uniqueClientIds),
    ])

    if (!healthScoreByClientId) {
      healthScoreByClientId = new Map(scores.map((score) => [score.clientId, score]))
    }

    if (!milestoneByClientId) {
      milestoneByClientId = new Map(
        (
          (clientRows ?? []) as Array<{
            id: string
            birthday: string | null
            anniversary: string | null
          }>
        ).map((row) => [
          row.id,
          {
            birthday: row.birthday ?? null,
            anniversary: row.anniversary ?? null,
          },
        ])
      )
    }
  }

  const ledgers = await Promise.all(
    uniqueClientIds.map(
      async (clientId) => [clientId, await getClientInteractionLedger(clientId)] as const
    )
  )

  for (const [clientId, ledger] of ledgers) {
    empty.set(
      clientId,
      buildClientInteractionSignalSnapshot({
        clientId,
        ledger,
        healthScore: healthScoreByClientId?.get(clientId) ?? null,
        milestones: milestoneByClientId?.get(clientId) ?? {
          birthday: null,
          anniversary: null,
        },
      })
    )
  }

  return empty
}
