import {
  proposeGroupDecisionMechanic,
  type RemyCircleRole,
} from '@/lib/remy/group-decision-contracts'

export type CircleMemberRole = RemyCircleRole
export type CircleMemberStatus = 'active' | 'invited' | 'left'

export type CircleMemberRef = {
  memberId: string
  role: CircleMemberRole
  status?: CircleMemberStatus
}

export type CircleSharingMode = 'sharing_live' | 'private_browsing' | 'share_saves_only' | 'offline'

export type CircleActivityKind =
  | 'view_cuisine'
  | 'open_restaurant'
  | 'view_menu_item'
  | 'save'
  | 'react'
  | 'send_item'
  | 'idle'
  | 'offline'

export type CircleActivityEvent = {
  id: string
  circleId: string
  memberId: string
  kind: CircleActivityKind
  sharingMode: CircleSharingMode
  occurredAt: string
  restaurantId?: string | null
  menuItemId?: string | null
  cuisine?: string | null
  note?: string | null
}

export type VisibleCircleSignal =
  | {
      visible: true
      memberId: string
      kind: CircleActivityKind
      label: string
      occurredAt: string
      detailVisibility: 'exact' | 'activity_only'
      restaurantId?: string | null
      menuItemId?: string | null
      cuisine?: string | null
      note?: string | null
    }
  | {
      visible: false
      reason: 'viewer_not_member' | 'actor_not_active_member' | 'private_browsing' | 'not_shared'
    }

export type CircleTransparencyStream = {
  circleId: string
  viewerCanRead: boolean
  liveMemberIds: string[]
  visibleEvents: Extract<VisibleCircleSignal, { visible: true }>[]
  redactedEventCount: number
  disconnected: boolean
  fallbackLabel: string | null
}

export type CircleReadinessSummary = {
  ready: boolean
  score: number
  missingMemberIds: string[]
  blockerCount: number
  dietaryConcernCount: number
  suggestedMechanic: ReturnType<typeof proposeGroupDecisionMechanic>
  notification: {
    audience: 'host' | 'members' | 'none'
    level: 'idle' | 'nudge' | 'ready' | 'blocked'
    message: string
  }
}

function memberById(members: readonly CircleMemberRef[], memberId: string): CircleMemberRef | null {
  return members.find((member) => member.memberId === memberId && member.status !== 'left') ?? null
}

export function canReadCircleSignals(input: {
  viewerId: string
  members: readonly CircleMemberRef[]
}): boolean {
  const viewer = memberById(input.members, input.viewerId)
  return Boolean(viewer && viewer.role !== 'non_member')
}

export function resolveVisibleMemberSignal(input: {
  event: CircleActivityEvent
  viewerId: string
  members: readonly CircleMemberRef[]
}): VisibleCircleSignal {
  if (!canReadCircleSignals({ viewerId: input.viewerId, members: input.members })) {
    return { visible: false, reason: 'viewer_not_member' }
  }

  const actor = memberById(input.members, input.event.memberId)
  if (!actor || actor.role === 'non_member') {
    return { visible: false, reason: 'actor_not_active_member' }
  }

  if (input.event.sharingMode === 'private_browsing') {
    return { visible: false, reason: 'private_browsing' }
  }

  const isExplicitShare =
    input.event.kind === 'save' || input.event.kind === 'react' || input.event.kind === 'send_item'
  if (input.event.sharingMode === 'share_saves_only' && !isExplicitShare) {
    return { visible: false, reason: 'not_shared' }
  }

  if (input.event.sharingMode === 'offline') {
    return {
      visible: true,
      memberId: input.event.memberId,
      kind: 'offline',
      label: 'Offline',
      occurredAt: input.event.occurredAt,
      detailVisibility: 'activity_only',
    }
  }

  const exact =
    input.event.kind === 'open_restaurant' ||
    input.event.kind === 'view_menu_item' ||
    input.event.kind === 'save' ||
    input.event.kind === 'react' ||
    input.event.kind === 'send_item'

  return {
    visible: true,
    memberId: input.event.memberId,
    kind: input.event.kind,
    label: labelActivity(input.event),
    occurredAt: input.event.occurredAt,
    detailVisibility: exact ? 'exact' : 'activity_only',
    restaurantId: exact ? input.event.restaurantId : null,
    menuItemId: exact ? input.event.menuItemId : null,
    cuisine: input.event.kind === 'view_cuisine' ? input.event.cuisine : null,
    note: isExplicitShare ? input.event.note : null,
  }
}

export function buildCircleTransparencyStream(input: {
  circleId: string
  viewerId: string
  members: readonly CircleMemberRef[]
  events: readonly CircleActivityEvent[]
  now?: string
  realtimeConnected?: boolean
}): CircleTransparencyStream {
  const viewerCanRead = canReadCircleSignals({ viewerId: input.viewerId, members: input.members })
  if (!viewerCanRead) {
    return {
      circleId: input.circleId,
      viewerCanRead: false,
      liveMemberIds: [],
      visibleEvents: [],
      redactedEventCount: input.events.length,
      disconnected: input.realtimeConnected === false,
      fallbackLabel: 'Join this circle to see shared activity.',
    }
  }

  const visible = input.events
    .filter((event) => event.circleId === input.circleId)
    .map((event) =>
      resolveVisibleMemberSignal({ event, viewerId: input.viewerId, members: input.members })
    )

  const visibleEvents = visible.filter(
    (signal): signal is Extract<VisibleCircleSignal, { visible: true }> => signal.visible
  )
  const liveMemberIds = [
    ...new Set(
      visibleEvents
        .filter((event) => event.kind !== 'idle' && event.kind !== 'offline')
        .map((event) => event.memberId)
    ),
  ]

  return {
    circleId: input.circleId,
    viewerCanRead,
    liveMemberIds,
    visibleEvents: visibleEvents.sort(
      (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
    ),
    redactedEventCount: visible.length - visibleEvents.length,
    disconnected: input.realtimeConnected === false,
    fallbackLabel:
      input.realtimeConnected === false
        ? 'Live updates paused. Showing the latest shared activity.'
        : null,
  }
}

export function buildCircleReadinessSummary(input: {
  memberIds: readonly string[]
  respondedMemberIds: readonly string[]
  candidateCount: number
  blockerCount?: number
  dietaryConcernCount?: number
  actorRole: CircleMemberRole
}): CircleReadinessSummary {
  const missingMemberIds = input.memberIds.filter(
    (memberId) => !input.respondedMemberIds.includes(memberId)
  )
  const blockerCount = input.blockerCount ?? 0
  const dietaryConcernCount = input.dietaryConcernCount ?? 0
  const total = Math.max(1, input.memberIds.length)
  const responseRatio = (total - missingMemberIds.length) / total
  const blockerPenalty = blockerCount > 0 || dietaryConcernCount > 0 ? 0.25 : 0
  const candidateBonus = input.candidateCount > 0 && input.candidateCount <= 3 ? 0.2 : 0
  const score = Math.max(0, Math.min(1, responseRatio + candidateBonus - blockerPenalty))
  const ready = score >= 0.8 && blockerCount === 0 && dietaryConcernCount === 0
  const suggestedMechanic = proposeGroupDecisionMechanic({
    candidateCount: input.candidateCount,
    memberCount: input.memberIds.length,
    votedMemberIds: input.respondedMemberIds,
    blockerCount,
    dietaryConcernCount,
    actorRole: input.actorRole,
    decisionPressure: ready ? 'high' : 'normal',
  })

  return {
    ready,
    score: Math.round(score * 100) / 100,
    missingMemberIds,
    blockerCount,
    dietaryConcernCount,
    suggestedMechanic,
    notification: buildNotification({
      ready,
      missingCount: missingMemberIds.length,
      blockerCount,
      dietaryConcernCount,
      hostOnly: suggestedMechanic.hostOnly,
    }),
  }
}

function labelActivity(event: CircleActivityEvent): string {
  if (event.kind === 'view_cuisine') return event.cuisine ? `Viewing ${event.cuisine}` : 'Browsing'
  if (event.kind === 'open_restaurant') return 'Opened a restaurant'
  if (event.kind === 'view_menu_item') return 'Viewing a menu item'
  if (event.kind === 'save') return 'Saved an option'
  if (event.kind === 'react') return 'Reacted'
  if (event.kind === 'send_item') return 'Shared an item'
  if (event.kind === 'idle') return 'Idle'
  return 'Offline'
}

function buildNotification(input: {
  ready: boolean
  missingCount: number
  blockerCount: number
  dietaryConcernCount: number
  hostOnly: boolean
}): CircleReadinessSummary['notification'] {
  if (input.blockerCount > 0 || input.dietaryConcernCount > 0) {
    return {
      audience: 'members',
      level: 'blocked',
      message: 'Clear blockers before making the final call.',
    }
  }
  if (input.ready) {
    return {
      audience: input.hostOnly ? 'host' : 'members',
      level: 'ready',
      message: 'The circle is ready for a short final decision.',
    }
  }
  if (input.missingCount > 0) {
    return {
      audience: 'members',
      level: 'nudge',
      message: `${input.missingCount} member${input.missingCount === 1 ? '' : 's'} still need to weigh in.`,
    }
  }
  return { audience: 'none', level: 'idle', message: 'No decision nudge needed.' }
}
