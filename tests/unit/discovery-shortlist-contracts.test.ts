import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createShortlistItem,
  getCompareCandidateIdsFromShortlist,
  removeShortlistItem,
  summarizeShortlist,
  upsertShortlistItem,
  type DiscoveryShortlistState,
} from '@/lib/discovery/shortlist-contracts'

test('shortlist contract accumulates mixed discovery picks without duplicates', () => {
  let state: DiscoveryShortlistState = { items: [], circleId: 'circle-1', maxItems: 4 }
  const chef = createShortlistItem({
    kind: 'chef',
    label: 'Chef Nina',
    href: '/chef/nina',
    source: 'rail',
  })
  const restaurant = createShortlistItem({
    kind: 'restaurant',
    label: 'Momo House',
    href: '/nearby/momo-house',
    source: 'search',
  })

  state = upsertShortlistItem(state, chef)
  state = upsertShortlistItem(state, restaurant)
  state = upsertShortlistItem(state, { ...chef, note: 'Great for Saturday' })

  assert.equal(state.items.length, 2)
  assert.equal(state.items.find((item) => item.id === chef.id)?.note, 'Great for Saturday')

  const summary = summarizeShortlist(state)
  assert.equal(summary.compareReady, true)
  assert.equal(summary.sendToCircleReady, true)
  assert.deepEqual(summary.byKind, { restaurant: 1, chef: 1 })
})

test('shortlist compare candidates exclude Remy notes and removal is pure', () => {
  const chef = createShortlistItem({ kind: 'chef', label: 'Chef Nina', source: 'rail' })
  const note = createShortlistItem({ kind: 'remy_note', label: 'Ask about spice', source: 'remy' })
  const state: DiscoveryShortlistState = { items: [note, chef] }

  assert.deepEqual(getCompareCandidateIdsFromShortlist(state), [chef.id])

  const next = removeShortlistItem(state, chef.id)
  assert.equal(next.items.length, 1)
  assert.equal(state.items.length, 2)
})
