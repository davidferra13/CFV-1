/**
 * Client relationship action-layer types and resolvers.
 */

import type { SurfaceActionTask, SurfaceActionTone } from '@/lib/interface/shared-types'
import {
  getRelationshipActionLayerCopy,
  type RelationshipActionLayerSource,
} from '@/lib/clients/action-vocabulary'
import { getClientInteractionSignalShortLabel } from '@/lib/clients/interaction-signal-utils'
import type { NextBestAction } from '@/lib/clients/next-best-action'

export type RelationshipNextTask = SurfaceActionTask & {
  source: RelationshipActionLayerSource
}

export type RelationshipNextCandidate = Pick<
  NextBestAction,
  | 'clientId'
  | 'clientName'
  | 'href'
  | 'actionType'
  | 'label'
  | 'description'
  | 'urgency'
  | 'tier'
  | 'primarySignal'
  | 'interventionLabel'
>

function getRelationshipTone(urgency: RelationshipNextCandidate['urgency']): SurfaceActionTone {
  if (urgency === 'critical') return 'rose'
  if (urgency === 'high') return 'amber'
  if (urgency === 'normal') return 'brand'
  return 'sky'
}

function getRelationshipBadge(urgency: RelationshipNextCandidate['urgency']): string {
  if (urgency === 'critical') return 'Relationship urgent'
  if (urgency === 'high') return 'Relationship ready'
  if (urgency === 'normal') return 'Portfolio move'
  return 'Relationship follow-through'
}

function getRelationshipPrimarySignalLabel(
  signal: RelationshipNextCandidate['primarySignal']
): string {
  switch (signal) {
    case 'booking_blocker_active':
      return 'Booking blocker active'
    case 'quote_revision_ready':
      return 'Quote revision ready'
    default:
      return getClientInteractionSignalShortLabel(signal)
  }
}

export function resolveRelationshipNextTask(
  candidates: RelationshipNextCandidate[]
): RelationshipNextTask | null {
  const actionable = candidates
    .map((candidate) => ({
      candidate,
      copy: getRelationshipActionLayerCopy(candidate),
    }))
    .filter(
      (
        item
      ): item is {
        candidate: RelationshipNextCandidate
        copy: NonNullable<ReturnType<typeof getRelationshipActionLayerCopy>>
      } => Boolean(item.copy)
    )
  if (actionable.length === 0) return null

  const { candidate, copy } = actionable[0]

  return {
    id: `relationship-next-${candidate.clientId}-${candidate.actionType}`,
    source: copy.source,
    badge: getRelationshipBadge(candidate.urgency),
    title: copy.title,
    description: candidate.description,
    href: candidate.href ?? `/clients/${candidate.clientId}/relationship`,
    ctaLabel: copy.ctaLabel,
    tone: getRelationshipTone(candidate.urgency),
    context: [
      candidate.clientName,
      candidate.tier.replace(/_/g, ' '),
      getRelationshipPrimarySignalLabel(candidate.primarySignal),
      ('interventionLabel' in candidate ? candidate.interventionLabel : null) ?? null,
    ].filter((value): value is string => Boolean(value)),
    remainingCount: Math.max(actionable.length - 1, 0),
    remainingLabel: 'more relationship moves after this',
  }
}
