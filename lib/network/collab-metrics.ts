import type { CollabHandoffRecipientStatus, CollabHandoffStatus } from '@/lib/network/collab-logic'

export type CollabMetrics = {
  window_days: number
  outgoing_total: number
  outgoing_open: number
  outgoing_closed: number
  outgoing_cancelled: number
  recipient_responses: number
  accepted: number
  rejected: number
  converted: number
  acceptance_rate_pct: number | null
  conversion_rate_pct: number | null
  avg_first_response_hours: number | null
  incoming_total: number
  incoming_unread: number
  incoming_actionable: number
}

export type CollabMetricsInput = {
  windowDays: number
  outgoingHandoffs: Array<{
    id: string
    status: CollabHandoffStatus
    created_at: string
  }>
  outgoingRecipients: Array<{
    handoff_id: string
    status: CollabHandoffRecipientStatus
    responded_at: string | null
  }>
  incomingRecipients: Array<{
    status: CollabHandoffRecipientStatus
  }>
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

export function computeCollabMetrics(input: CollabMetricsInput): CollabMetrics {
  const outgoing_open = input.outgoingHandoffs.filter((row) => row.status === 'open').length
  const outgoing_closed = input.outgoingHandoffs.filter((row) => row.status === 'closed').length
  const outgoing_cancelled = input.outgoingHandoffs.filter((row) => row.status === 'cancelled').length

  const accepted = input.outgoingRecipients.filter((row) => row.status === 'accepted').length
  const rejected = input.outgoingRecipients.filter((row) => row.status === 'rejected').length
  const converted = input.outgoingRecipients.filter((row) => row.status === 'converted').length
  const recipient_responses = accepted + rejected + converted
  const positive = accepted + converted

  const firstResponseHours: number[] = []
  const handoffCreatedAt = new Map(input.outgoingHandoffs.map((handoff) => [handoff.id, handoff.created_at]))
  const earliestResponseByHandoff = new Map<string, string>()
  for (const row of input.outgoingRecipients) {
    if (!row.responded_at) continue
    if (!['accepted', 'rejected', 'converted'].includes(row.status)) continue
    const current = earliestResponseByHandoff.get(row.handoff_id)
    if (!current || row.responded_at < current) {
      earliestResponseByHandoff.set(row.handoff_id, row.responded_at)
    }
  }
  for (const [handoffId, respondedAt] of earliestResponseByHandoff.entries()) {
    const createdAt = handoffCreatedAt.get(handoffId)
    if (!createdAt) continue
    const diffMs = new Date(respondedAt).getTime() - new Date(createdAt).getTime()
    if (Number.isFinite(diffMs) && diffMs >= 0) {
      firstResponseHours.push(diffMs / (1000 * 60 * 60))
    }
  }

  const avg_first_response_hours =
    firstResponseHours.length > 0
      ? Math.round((firstResponseHours.reduce((sum, value) => sum + value, 0) / firstResponseHours.length) * 10) / 10
      : null

  const incoming_unread = input.incomingRecipients.filter((row) => row.status === 'sent').length
  const incoming_actionable = input.incomingRecipients.filter((row) =>
    row.status === 'sent' || row.status === 'viewed'
  ).length

  return {
    window_days: input.windowDays,
    outgoing_total: input.outgoingHandoffs.length,
    outgoing_open,
    outgoing_closed,
    outgoing_cancelled,
    recipient_responses,
    accepted,
    rejected,
    converted,
    acceptance_rate_pct: pct(positive, recipient_responses),
    conversion_rate_pct: pct(converted, positive),
    avg_first_response_hours,
    incoming_total: input.incomingRecipients.length,
    incoming_unread,
    incoming_actionable,
  }
}
