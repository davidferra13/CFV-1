import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type {
  CollabInbox,
  IncomingCollabHandoff,
  OutgoingCollabHandoff,
} from '@/lib/network/collab-actions'

const MS_DAY = 86_400_000
const MS_HOUR = 3_600_000

type HandoffDirection = 'incoming' | 'outgoing'
type HandoffLikeRow = IncomingCollabHandoff | OutgoingCollabHandoff

export type { CollabInbox, IncomingCollabHandoff, OutgoingCollabHandoff }
export type { HandoffLikeRow }

const ACTIONABLE_HANDOFF_STATUSES = new Set(['open', 'partially_accepted'])
const PENDING_RECIPIENT_STATUSES = new Set(['sent', 'viewed'])

function isIncomingHandoff(row: HandoffLikeRow): row is IncomingCollabHandoff {
  return 'recipient_status' in row
}

function daysUntil(dateValue: string | null, now: Date): number | null {
  if (!dateValue) return null
  const dateMs = new Date(`${dateValue}T00:00:00`).getTime()
  if (!Number.isFinite(dateMs)) return null
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((dateMs - todayMs) / MS_DAY)
}

function hoursUntil(dateValue: string | null, now: Date): number | null {
  if (!dateValue) return null
  const dateMs = Date.parse(dateValue)
  if (!Number.isFinite(dateMs)) return null
  return (dateMs - now.getTime()) / MS_HOUR
}

function hasExpired(row: HandoffLikeRow, now: Date): boolean {
  if (row.status === 'expired' || row.status === 'cancelled') return true
  const expiresInHours = hoursUntil(row.expires_at, now)
  return expiresInHours !== null && expiresInHours <= 0
}

function hasPendingOutgoingRecipient(row: OutgoingCollabHandoff): boolean {
  return row.recipients.some((recipient) =>
    PENDING_RECIPIENT_STATUSES.has(recipient.recipient_status)
  )
}

export function assignHandoffTier(row: HandoffLikeRow, now: Date): RailTier | null {
  if (!ACTIONABLE_HANDOFF_STATUSES.has(row.status)) return null
  if (hasExpired(row, now)) return null

  if (isIncomingHandoff(row)) {
    if (!PENDING_RECIPIENT_STATUSES.has(row.recipient_status)) return null
  } else if (!hasPendingOutgoingRecipient(row)) {
    return null
  }

  const eventDays = daysUntil(row.event_date, now)
  const expiresInHours = hoursUntil(row.expires_at, now)

  if (
    (eventDays !== null && eventDays >= 0 && eventDays <= 3) ||
    (expiresInHours !== null && expiresInHours <= 24)
  ) {
    return isIncomingHandoff(row) ? 'p0' : 'p1'
  }

  if (
    (eventDays !== null && eventDays >= 0 && eventDays <= 7) ||
    (expiresInHours !== null && expiresInHours <= 72)
  ) {
    return 'p1'
  }

  return isIncomingHandoff(row) ? 'p2' : 'p3'
}

export function buildHandoffLabel(row: HandoffLikeRow): string {
  const parts = [row.title || 'Network handoff']

  if (row.guest_count) parts.push(`${row.guest_count}g`)
  if (row.event_date) {
    const date = new Date(`${row.event_date}T00:00:00`)
    parts.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }

  if (isIncomingHandoff(row)) {
    parts.push(`from ${row.from_chef.business_name}`)
  } else {
    const pending = row.recipients.filter((recipient) =>
      PENDING_RECIPIENT_STATUSES.has(recipient.recipient_status)
    ).length
    parts.push(`${pending} awaiting`)
  }

  return parts.join(' ')
}

export function buildHandoffContext(row: HandoffLikeRow): string {
  const details: string[] = []

  if (row.occasion) details.push(row.occasion)
  if (row.location_text) details.push(row.location_text)
  if (row.budget_cents) {
    details.push(
      `$${(row.budget_cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    )
  }

  if (isIncomingHandoff(row)) {
    details.push(`Received from ${row.from_chef.display_name ?? row.from_chef.business_name}`)
  } else {
    const accepted = row.recipients.filter((recipient) =>
      ['accepted', 'converted'].includes(recipient.recipient_status)
    ).length
    if (accepted > 0) details.push(`${accepted} accepted`)
  }

  return details.join(', ') || 'Network handoff'
}

export function buildHandoffDestination(row: HandoffLikeRow): string {
  return `/network?tab=collab&handoff=${encodeURIComponent(row.handoff_id)}`
}

export function resolveHandoffRow(row: HandoffLikeRow, now: Date): GodModeResolvedItem | null {
  const tier = assignHandoffTier(row, now)
  if (!tier) return null

  const direction: HandoffDirection = isIncomingHandoff(row) ? 'incoming' : 'outgoing'
  const destination = buildHandoffDestination(row)

  return {
    definitionId:
      direction === 'incoming' ? 'chef.network_referral_received' : 'chef.network_handoff_waiting',
    tier,
    label: buildHandoffLabel(row),
    context: buildHandoffContext(row),
    destination,
    icon: 'network',
    loopState: direction === 'incoming' ? 'active' : 'waiting',
    sourceKind: 'handoff',
    evidenceLabel: 'confirmed',
    confidence: 1,
    proofHref: destination,
    nextAction: direction === 'incoming' ? 'Review handoff request' : 'Track handoff response',
    waitingOn:
      direction === 'outgoing'
        ? { kind: 'reply', label: 'Network chef response', followUpAt: row.expires_at }
        : null,
    inlineActions:
      direction === 'incoming'
        ? [
            {
              label: 'Accept',
              action: 'respond_collab_handoff',
              params: { handoffId: row.handoff_id, action: 'accepted' },
              variant: 'success',
            },
          ]
        : [
            {
              label: 'View',
              action: 'navigate',
              params: { href: destination },
              variant: 'default',
            },
          ],
    data: {
      handoffId: row.handoff_id,
      direction,
      handoffType: row.handoff_type,
      sourceEntityType: row.source_entity_type,
      sourceEntityId: row.source_entity_id,
      eventDate: row.event_date,
      guestCount: row.guest_count,
      expiresAt: row.expires_at,
    },
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
  }
}

export function resolveCollabInboxHandoffs(inbox: CollabInbox, now: Date): GodModeResolvedItem[] {
  return [...inbox.incoming, ...inbox.outgoing]
    .map((row) => resolveHandoffRow(row, now))
    .filter((item): item is GodModeResolvedItem => Boolean(item))
}

export async function resolveHandoffs(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { getCollabInbox } = await import('@/lib/network/collab-actions')

  try {
    const inbox = await getCollabInbox(50)
    return resolveCollabInboxHandoffs(inbox, ctx.now)
  } catch (err) {
    console.error('[handoff-resolver] Query failed:', err)
    return []
  }
}
