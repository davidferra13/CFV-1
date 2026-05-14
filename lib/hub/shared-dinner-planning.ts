import type { DiscoveryCompareCandidate } from '@/lib/discovery/compare-contracts'
import {
  evaluateCircleDecisionReadiness,
  scoreCircleConsensus,
  type CircleConsensusResult,
  type CircleDecisionReadiness,
} from '@/lib/hub/circle-consensus-contracts'
import {
  resolveCircleDiscoveryAccess,
  type CircleDiscoveryAccess,
  type CircleDiscoveryRole,
} from '@/lib/hub/circle-discovery-contracts'
import type { CircleDiscoveryMemberAction } from '@/lib/hub/circle-discovery-contracts'
import type { HubGroup, HubGroupMember, MealBoardEntry } from '@/lib/hub/types'

export type SharedDinnerConsensusSnapshot = {
  access: CircleDiscoveryAccess
  consensus: CircleConsensusResult
  readiness: CircleDecisionReadiness
  memberCount: number
  votedMemberCount: number
  candidateCount: number
  topCandidates: Array<{
    id: string
    label: string
    score: number
    fit: 'strong' | 'allowed' | 'weak'
    blockers: string[]
    reasons: string[]
  }>
  permissionCopy: string
}

export function buildSharedDinnerConsensusSnapshot(input: {
  group: Pick<HubGroup, 'id' | 'group_token' | 'member_count'>
  members: readonly Pick<HubGroupMember, 'profile_id' | 'role' | 'rsvp_status' | 'profile'>[]
  mealBoardEntries?: readonly MealBoardEntry[]
  currentMember?: Pick<HubGroupMember, 'role' | 'profile'> | null
}): SharedDinnerConsensusSnapshot {
  const currentRole = mapHubRoleToCircleRole(input.currentMember?.role)
  const access = resolveCircleDiscoveryAccess({
    actorRole: currentRole,
    hasValidProfileToken: Boolean(input.currentMember?.profile?.profile_token),
  })
  const candidates = buildMealBoardCandidates(input.group, input.mealBoardEntries ?? [])
  const actions = buildConsensusActions(input.mealBoardEntries ?? [])
  const consensus = scoreCircleConsensus({
    candidates,
    actions,
    mode: 'either',
    compareContext: {
      groupSize: input.group.member_count ?? input.members.length,
    },
  })
  const votedMemberIds = getVotedMemberIds(input.members, input.mealBoardEntries ?? [])
  const memberCount = Math.max(1, input.group.member_count ?? input.members.length)
  const readiness = evaluateCircleDecisionReadiness({
    consensus,
    memberCount,
    votedMemberIds,
    minVoteRatio: 0.6,
  })

  return {
    access,
    consensus,
    readiness,
    memberCount,
    votedMemberCount: votedMemberIds.length,
    candidateCount: candidates.length,
    topCandidates: consensus.candidates.slice(0, 3).map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      score: Math.round(candidate.consensusScore),
      fit: candidate.fulfillmentFit,
      blockers: candidate.hardBlockerLabels,
      reasons:
        candidate.whyRecommended?.slice(0, 2) ?? candidate.matchedAggregateLabels.slice(0, 2),
    })),
    permissionCopy: permissionCopy(access),
  }
}

export function buildCirclePlanningListSummary(input: {
  memberCount: number
  messageCount: number
  hasUnread?: boolean
}): { label: string; tone: 'ready' | 'needs_signal' | 'quiet' } {
  if (input.hasUnread) return { label: 'New circle planning activity', tone: 'ready' }
  if (input.memberCount >= 2 && input.messageCount > 0) {
    return { label: 'Dinner readiness visible in circle', tone: 'ready' }
  }
  if (input.memberCount >= 2) {
    return { label: 'Needs votes to build consensus', tone: 'needs_signal' }
  }
  return { label: 'Add one person to plan together', tone: 'quiet' }
}

function buildMealBoardCandidates(
  group: Pick<HubGroup, 'group_token'>,
  entries: readonly MealBoardEntry[]
): DiscoveryCompareCandidate[] {
  const candidates = entries
    .filter((entry) => entry.status !== 'cancelled')
    .slice(0, 4)
    .map((entry) => ({
      id: `meal-${entry.id}`,
      type: entry.menu_id || entry.dish_id ? ('menu' as const) : ('recipe' as const),
      label: entry.title,
      href: `/hub/g/${group.group_token}`,
      cuisineTags: [entry.meal_type, ...(entry.dietary_tags ?? [])],
      supportsGroupSize: entry.head_count ?? undefined,
      available: entry.status === 'planned' || entry.status === 'confirmed',
      confidence: entry.status === 'confirmed' ? 0.85 : 0.65,
      whyRecommended: [
        entry.status === 'confirmed' ? 'Confirmed meal board option' : 'Shared meal board option',
        entry.serving_time ? `Target time ${entry.serving_time}` : 'Time still flexible',
      ],
    }))

  if (candidates.length > 0) return candidates

  return [
    {
      id: 'circle-dinner-direction',
      type: 'manual_pick',
      label: 'Choose a dinner direction together',
      href: `/hub/g/${group.group_token}`,
      cuisineTags: ['dinner'],
      available: true,
      confidence: 0.5,
      whyRecommended: ['No shared meal candidates yet'],
    },
  ]
}

function buildConsensusActions(entries: readonly MealBoardEntry[]): CircleDiscoveryMemberAction[] {
  return entries.map((entry) => ({
    actorId: entry.author_profile_id,
    actorRole: 'member',
    sessionId: `meal-board-${entry.group_id}`,
    actionType:
      entry.status === 'confirmed' || entry.status === 'served'
        ? 'like_candidate'
        : 'shortlist_candidate',
    candidateId: `meal-${entry.id}`,
    createdAt: entry.updated_at ?? entry.created_at,
    visibleToCircle: true,
  }))
}

function getVotedMemberIds(
  members: readonly Pick<HubGroupMember, 'profile_id' | 'rsvp_status'>[],
  entries: readonly MealBoardEntry[]
): string[] {
  const voted = new Set(entries.map((entry) => entry.author_profile_id).filter(Boolean))
  for (const member of members) {
    if (member.rsvp_status && member.rsvp_status !== 'no_response') voted.add(member.profile_id)
  }
  return [...voted]
}

function mapHubRoleToCircleRole(role: HubGroupMember['role'] | undefined): CircleDiscoveryRole {
  if (role === 'owner' || role === 'admin') return role
  if (role === 'chef' || role === 'host') return 'host'
  if (role === 'member') return 'member'
  if (role === 'viewer' || role === 'delegate') return 'viewer'
  return 'non_member'
}

function permissionCopy(access: CircleDiscoveryAccess): string {
  if (!access.allowed) return 'Join the circle to see dinner readiness.'
  if (access.canFinalizeDecision) return 'Host controls: can make the final dinner call.'
  if (access.canContribute) return 'Member mode: can contribute signals without host controls.'
  return 'Read-only mode: consensus summary only.'
}
