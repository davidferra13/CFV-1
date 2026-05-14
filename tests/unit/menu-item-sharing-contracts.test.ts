import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifySharedItem,
  evaluateMenuItemShareEligibility,
  groupSharedShortlistItems,
  type SharedCircleItem,
} from '@/lib/hub/menu-item-sharing-contracts'
import type { CircleMemberRef } from '@/lib/hub/circle-transparency-events'

const members: CircleMemberRef[] = [
  { memberId: 'a', role: 'host' },
  { memberId: 'b', role: 'member' },
]

test('menu item sharing allows exact menu items when menu data exists', () => {
  const eligibility = evaluateMenuItemShareEligibility({
    actorId: 'a',
    members,
    candidate: {
      kind: 'menu_item',
      restaurantId: 'rest-1',
      menuItemId: 'item-1',
      menuDataAvailable: true,
    },
  })

  assert.equal(eligibility.allowed, true)
  assert.equal(eligibility.shareKind, 'menu_item')
  assert.equal(eligibility.fallbackRequired, false)
  assert.equal(eligibility.visibleToCircle, true)
})

test('menu item sharing degrades to a note when menu data is incomplete', () => {
  const eligibility = evaluateMenuItemShareEligibility({
    actorId: 'a',
    members,
    candidate: {
      kind: 'menu_item',
      restaurantId: 'rest-1',
      menuDataAvailable: false,
      note: 'The spicy noodles from the PDF menu',
    },
  })

  assert.equal(eligibility.allowed, true)
  assert.equal(eligibility.shareKind, 'note')
  assert.equal(eligibility.fallbackRequired, true)
})

test('sharing requires circle membership and a usable fallback', () => {
  const blocked = evaluateMenuItemShareEligibility({
    actorId: 'x',
    members,
    candidate: { kind: 'restaurant', restaurantId: 'rest-1' },
  })
  const missingFallback = evaluateMenuItemShareEligibility({
    actorId: 'a',
    members,
    candidate: { kind: 'menu_item', restaurantId: 'rest-1', menuDataAvailable: false },
  })

  assert.equal(blocked.allowed, false)
  assert.equal(blocked.reason, 'actor_not_member')
  assert.equal(missingFallback.allowed, false)
  assert.equal(missingFallback.reason, 'missing_fallback')
})

test('shortlist groups shared items by practical decision state', () => {
  const items: SharedCircleItem[] = [
    {
      id: 'both',
      circleId: 'circle-1',
      sharedByMemberId: 'a',
      kind: 'restaurant',
      restaurantId: 'rest-1',
      reactions: { a: 'want', b: 'want' },
    },
    {
      id: 'maybe',
      circleId: 'circle-1',
      sharedByMemberId: 'a',
      kind: 'menu_item',
      restaurantId: 'rest-2',
      menuItemId: 'item-2',
      reactions: { a: 'save' },
    },
    {
      id: 'no',
      circleId: 'circle-1',
      sharedByMemberId: 'b',
      kind: 'restaurant',
      restaurantId: 'rest-3',
      reactions: { b: 'not_tonight' },
    },
  ]

  assert.equal(classifySharedItem(items[0], ['a', 'b']), 'both_like_this')

  const groups = groupSharedShortlistItems({ items, memberIds: ['a', 'b'] })
  assert.deepEqual(groups.find((group) => group.state === 'both_like_this')?.itemIds, ['both'])
  assert.deepEqual(groups.find((group) => group.state === 'maybe')?.itemIds, ['maybe'])
  assert.deepEqual(groups.find((group) => group.state === 'not_tonight')?.itemIds, ['no'])
})
