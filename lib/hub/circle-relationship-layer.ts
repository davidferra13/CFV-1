import {
  type CircleAccessActor,
  type CircleAccessContext,
  canSeeLinkedObject,
} from './circle-access-policy'
import type { HubGroup } from './types'

export type CircleKind =
  | 'solo'
  | 'dinner'
  | 'event'
  | 'dinner_club'
  | 'household'
  | 'chef_collab'
  | 'crew'
  | 'vendor'
  | 'community'
  | 'partner'
  | 'platform'

export type CircleThreadKind =
  | 'event'
  | 'order'
  | 'handoff'
  | 'menu_poll'
  | 'sourcing_request'
  | 'prep_plan'
  | 'topic'
  | 'archive'

export interface CircleLookupInput {
  tenantId?: string | null
  actorProfileId?: string | null
  relationshipKey?: string | null
  source:
    | 'inquiry'
    | 'repeat_client_event'
    | 'chef_collab'
    | 'vendor_sourcing'
    | 'crew_assignment'
    | 'community_join'
    | 'solo_planning'
  linkedObjectId?: string | null
}

export interface CircleAdoptionDecision {
  kind: CircleKind
  threadKind: CircleThreadKind
  action: 'reuse_circle' | 'create_circle' | 'create_thread' | 'upgrade_circle'
  relationshipKey: string
  reason: string
}

export const CIRCLE_KIND_LABELS: Record<CircleKind, string> = {
  solo: 'Private Circle',
  dinner: 'Dinner Circle',
  event: 'Event Circle',
  dinner_club: 'Dinner Club Circle',
  household: 'Household Circle',
  chef_collab: 'Chef Collab Circle',
  crew: 'Crew Circle',
  vendor: 'Vendor Circle',
  community: 'Community Circle',
  partner: 'Partner Circle',
  platform: 'Platform Circle',
}

export function normalizeHubGroupToCircleKind(
  group: Pick<HubGroup, 'group_type' | 'event_id' | 'visibility'>
): CircleKind {
  if (group.group_type === 'dinner_club') return 'dinner_club'
  if (group.group_type === 'community') return 'community'
  if (group.group_type === 'bridge') return 'chef_collab'
  if (group.group_type === 'planning') return group.event_id ? 'event' : 'dinner'
  if (group.event_id) return 'event'
  if (group.visibility === 'secret') return 'solo'
  return 'dinner'
}

export function decideCircleAdoption(input: CircleLookupInput): CircleAdoptionDecision {
  const relationshipKey =
    input.relationshipKey ??
    [
      input.source,
      input.tenantId ?? 'global',
      input.linkedObjectId ?? input.actorProfileId ?? 'unknown',
    ].join(':')

  switch (input.source) {
    case 'inquiry':
      return {
        kind: 'dinner',
        threadKind: 'handoff',
        action: 'create_circle',
        relationshipKey,
        reason: 'New inquiry starts or attaches to a chef-client Dinner Circle.',
      }
    case 'repeat_client_event':
      return {
        kind: 'dinner',
        threadKind: 'event',
        action: 'create_thread',
        relationshipKey,
        reason: 'Repeat relationship keeps the Circle and adds a new event thread.',
      }
    case 'chef_collab':
      return {
        kind: 'chef_collab',
        threadKind: 'handoff',
        action: 'reuse_circle',
        relationshipKey,
        reason: 'Chef collaboration should reuse the durable professional relationship.',
      }
    case 'vendor_sourcing':
      return {
        kind: 'vendor',
        threadKind: 'sourcing_request',
        action: 'reuse_circle',
        relationshipKey,
        reason: 'Vendor work belongs in a vendor relationship Circle with sourcing/order threads.',
      }
    case 'crew_assignment':
      return {
        kind: 'crew',
        threadKind: 'prep_plan',
        action: 'create_thread',
        relationshipKey,
        reason: 'Crew access is event-scoped and should expose only assigned execution context.',
      }
    case 'community_join':
      return {
        kind: 'community',
        threadKind: 'topic',
        action: 'reuse_circle',
        relationshipKey,
        reason: 'Community joins reuse the gated/public community Circle.',
      }
    case 'solo_planning':
      return {
        kind: 'solo',
        threadKind: 'topic',
        action: 'create_circle',
        relationshipKey,
        reason: 'Solo planning is private by default and may later spawn shared threads.',
      }
  }
}

export function shapeCircleThreadForActor(
  actor: CircleAccessActor,
  context: CircleAccessContext,
  thread: {
    id: string
    kind: CircleThreadKind
    title: string
    chefOnly?: boolean
    clientSafe?: boolean
    archived?: boolean
  }
) {
  const visible = canSeeLinkedObject(actor, {
    ...context,
    linkedObject: {
      type:
        thread.kind === 'order' ? 'order' : thread.kind === 'event' ? 'event' : 'client_referral',
      sharedWithCircle: true,
      chefOnly: thread.chefOnly,
      clientSafe: thread.clientSafe,
    },
  })

  return {
    id: thread.id,
    kind: thread.kind,
    title: visible ? thread.title : 'Restricted thread',
    archived: Boolean(thread.archived),
    visible,
  }
}
