import type { RemyDiscoveryContextMode } from '@/lib/remy/group-decision-contracts'

export type RemyDecisionAuditEventType =
  | 'chat_filter_inferred'
  | 'manual_filter_changed'
  | 'proposal_created'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'shortlist_changed'
  | 'vote_cast'
  | 'veto_added'
  | 'comparison_viewed'
  | 'reset'
  | 'branch_restored'
  | 'final_pick'

export type RemyDecisionAuditVisibility = 'public_to_circle' | 'host_only' | 'private'

export type RemyDecisionAuditEvent = {
  id: string
  type: RemyDecisionAuditEventType
  at: string
  actorId?: string | null
  label: string
  details?: string | null
  visibility: RemyDecisionAuditVisibility
  mode: RemyDiscoveryContextMode
  sourceIds?: readonly string[]
}

export type RemyDecisionAuditViewer = {
  actorId?: string | null
  mode: RemyDiscoveryContextMode
  isHost?: boolean
}

export type RemyDecisionTimelineItem = {
  id: string
  at: string
  label: string
  details: string | null
}

export function createDecisionAuditEvent(
  input: Omit<RemyDecisionAuditEvent, 'id' | 'at'> & { id?: string; at?: string }
): RemyDecisionAuditEvent {
  const label = input.label.trim()
  if (!label) throw new Error('Decision audit event label is required.')

  return {
    id: input.id ?? `remy-audit:${input.type}:${slugify(label)}`,
    type: input.type,
    at: input.at ?? new Date(0).toISOString(),
    actorId: input.actorId ?? null,
    label,
    details: input.details ?? null,
    visibility: input.visibility,
    mode: input.mode,
    sourceIds: input.sourceIds ?? [],
  }
}

export function filterDecisionAuditEventsForViewer(
  events: readonly RemyDecisionAuditEvent[],
  viewer: RemyDecisionAuditViewer
): RemyDecisionAuditEvent[] {
  return events.filter((event) => {
    if (event.mode !== viewer.mode) return false
    if (event.visibility === 'public_to_circle') return true
    if (event.visibility === 'host_only') return viewer.isHost === true
    return event.actorId !== null && event.actorId === viewer.actorId
  })
}

export function buildDecisionTimeline(input: {
  events: readonly RemyDecisionAuditEvent[]
  viewer: RemyDecisionAuditViewer
  limit?: number
}): RemyDecisionTimelineItem[] {
  return filterDecisionAuditEventsForViewer(input.events, input.viewer)
    .slice()
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
    .slice(-(input.limit ?? 8))
    .map((event) => ({
      id: event.id,
      at: event.at,
      label: labelForEvent(event),
      details: event.details ?? null,
    }))
}

export function summarizeDecisionPath(input: {
  events: readonly RemyDecisionAuditEvent[]
  viewer: RemyDecisionAuditViewer
}): string {
  const timeline = buildDecisionTimeline(input)
  if (timeline.length === 0) return 'No visible decision history is available for this context.'

  const finalPick = timeline.find((item) => item.label.startsWith('Final pick:'))
  const first = timeline[0]
  const last = finalPick ?? timeline[timeline.length - 1]
  return `Started with ${first.label}; ended with ${last.label}. ${timeline.length} visible step${timeline.length === 1 ? '' : 's'} are available.`
}

function labelForEvent(event: RemyDecisionAuditEvent): string {
  switch (event.type) {
    case 'chat_filter_inferred':
      return `Remy inferred: ${event.label}`
    case 'manual_filter_changed':
      return `Filter changed: ${event.label}`
    case 'proposal_created':
      return `Proposal created: ${event.label}`
    case 'proposal_accepted':
      return `Proposal accepted: ${event.label}`
    case 'proposal_rejected':
      return `Proposal rejected: ${event.label}`
    case 'shortlist_changed':
      return `Shortlist changed: ${event.label}`
    case 'vote_cast':
      return `Vote recorded: ${event.label}`
    case 'veto_added':
      return `Veto added: ${event.label}`
    case 'comparison_viewed':
      return `Compared: ${event.label}`
    case 'reset':
      return `Reset: ${event.label}`
    case 'branch_restored':
      return `Restored: ${event.label}`
    case 'final_pick':
      return `Final pick: ${event.label}`
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
