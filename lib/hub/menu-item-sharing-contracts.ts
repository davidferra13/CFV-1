import type { CircleMemberRef } from '@/lib/hub/circle-transparency-events'
import { canReadCircleSignals } from '@/lib/hub/circle-transparency-events'

export type SharedCircleItemKind = 'restaurant' | 'menu_item' | 'note' | 'link' | 'screenshot'
export type SharedCircleReaction = 'want' | 'maybe' | 'not_tonight' | 'save'
export type SharedCircleDecisionState = 'both_like_this' | 'needs_answer' | 'maybe' | 'not_tonight'

export type CircleShareCandidate = {
  kind: SharedCircleItemKind
  restaurantId?: string | null
  menuItemId?: string | null
  externalUrl?: string | null
  screenshotAssetId?: string | null
  note?: string | null
  menuDataAvailable?: boolean
}

export type CircleShareEligibility = {
  allowed: boolean
  reason:
    | 'ok'
    | 'actor_not_member'
    | 'missing_restaurant'
    | 'missing_menu_item'
    | 'missing_fallback'
    | 'note_too_long'
  shareKind: SharedCircleItemKind
  fallbackRequired: boolean
  visibleToCircle: boolean
  label: string
}

export type SharedCircleItem = {
  id: string
  circleId: string
  sharedByMemberId: string
  kind: SharedCircleItemKind
  restaurantId?: string | null
  menuItemId?: string | null
  note?: string | null
  reactions: Record<string, SharedCircleReaction>
}

export type SharedCircleShortlistGroup = {
  state: SharedCircleDecisionState
  itemIds: string[]
}

export function evaluateMenuItemShareEligibility(input: {
  actorId: string
  members: readonly CircleMemberRef[]
  candidate: CircleShareCandidate
}): CircleShareEligibility {
  if (!canReadCircleSignals({ viewerId: input.actorId, members: input.members })) {
    return denied('actor_not_member', input.candidate.kind)
  }

  const noteLength = input.candidate.note?.trim().length ?? 0
  if (noteLength > 240) return denied('note_too_long', input.candidate.kind)

  if (input.candidate.kind === 'restaurant') {
    if (!input.candidate.restaurantId) return denied('missing_restaurant', 'restaurant')
    return allowed('restaurant', false, 'Share restaurant')
  }

  if (input.candidate.kind === 'menu_item') {
    if (!input.candidate.restaurantId) return denied('missing_restaurant', 'menu_item')
    if (input.candidate.menuDataAvailable && input.candidate.menuItemId) {
      return allowed('menu_item', false, 'Share menu item')
    }
    const hasFallback = Boolean(
      input.candidate.note?.trim() ||
      input.candidate.externalUrl?.trim() ||
      input.candidate.screenshotAssetId?.trim()
    )
    if (!hasFallback) return denied('missing_fallback', 'menu_item', true)
    return allowed('note', true, 'Share menu item as a note')
  }

  if (input.candidate.kind === 'link' && !input.candidate.externalUrl?.trim()) {
    return denied('missing_fallback', 'link')
  }

  if (input.candidate.kind === 'screenshot' && !input.candidate.screenshotAssetId?.trim()) {
    return denied('missing_fallback', 'screenshot')
  }

  if (input.candidate.kind === 'note' && noteLength === 0) {
    return denied('missing_fallback', 'note')
  }

  return allowed(input.candidate.kind, false, `Share ${input.candidate.kind.replace('_', ' ')}`)
}

export function groupSharedShortlistItems(input: {
  items: readonly SharedCircleItem[]
  memberIds: readonly string[]
}): SharedCircleShortlistGroup[] {
  const groups: Record<SharedCircleDecisionState, string[]> = {
    both_like_this: [],
    needs_answer: [],
    maybe: [],
    not_tonight: [],
  }

  for (const item of input.items) {
    groups[classifySharedItem(item, input.memberIds)].push(item.id)
  }

  return (Object.keys(groups) as SharedCircleDecisionState[]).map((state) => ({
    state,
    itemIds: groups[state],
  }))
}

export function classifySharedItem(
  item: SharedCircleItem,
  memberIds: readonly string[]
): SharedCircleDecisionState {
  const reactions = memberIds.map((memberId) => item.reactions[memberId]).filter(Boolean)
  if (reactions.includes('not_tonight')) return 'not_tonight'
  if (memberIds.length > 1 && reactions.filter((reaction) => reaction === 'want').length >= 2) {
    return 'both_like_this'
  }
  if (reactions.includes('maybe') || reactions.includes('save')) return 'maybe'
  return 'needs_answer'
}

function allowed(
  shareKind: SharedCircleItemKind,
  fallbackRequired: boolean,
  label: string
): CircleShareEligibility {
  return {
    allowed: true,
    reason: 'ok',
    shareKind,
    fallbackRequired,
    visibleToCircle: true,
    label,
  }
}

function denied(
  reason: Exclude<CircleShareEligibility['reason'], 'ok'>,
  shareKind: SharedCircleItemKind,
  fallbackRequired = false
): CircleShareEligibility {
  return {
    allowed: false,
    reason,
    shareKind,
    fallbackRequired,
    visibleToCircle: false,
    label: 'Cannot share yet',
  }
}
