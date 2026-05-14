import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getDiscoveryProfileMutation,
  normalizeDiscoveryProfileRows,
  sanitizeDiscoveryAction,
  sanitizeDiscoveryItemPayload,
} from '@/lib/discovery/persistent-profile'

test('sanitizeDiscoveryItemPayload accepts current rail item payloads and camelCase fields', () => {
  const item = sanitizeDiscoveryItemPayload({
    itemType: 'culinary_signal',
    itemValue: 'ramps',
    itemLabel: 'Ramps',
    href: '/ingredients/alliums',
    metadata: {
      source: 'homepage_discovery_marquee',
      anonymous_id: 'blocked',
      nested: { visible: true },
    },
  })

  assert.equal(item?.itemType, 'culinary_signal')
  assert.equal(item?.itemValue, 'ramps')
  assert.equal(item?.itemLabel, 'Ramps')
  assert.equal(item?.href, '/ingredients/alliums')
  assert.equal(item?.metadata?.source, 'homepage_discovery_marquee')
  assert.deepEqual(item?.metadata?.nested, { visible: true })
  assert.equal('anonymous_id' in (item?.metadata ?? {}), false)

  const circle = sanitizeDiscoveryItemPayload({
    item_type: 'circle',
    item_value: 'dinner_circles',
    item_label: 'Dinner Circles',
    href: '/hub',
  })

  assert.equal(circle?.itemType, 'circle')
  assert.equal(circle?.href, '/hub')
})

test('sanitizeDiscoveryAction supports profile persistence actions', () => {
  assert.equal(sanitizeDiscoveryAction('pin', 'click'), 'pin')
  assert.equal(sanitizeDiscoveryAction('dismiss', 'click'), 'dismiss')
  assert.equal(sanitizeDiscoveryAction('bogus', 'click'), 'click')
})

test('getDiscoveryProfileMutation maps explicit feedback to durable state changes', () => {
  assert.deepEqual(getDiscoveryProfileMutation('pin'), { pinned: true, dismissed: false })
  assert.deepEqual(getDiscoveryProfileMutation('unpin'), { pinned: false })
  assert.deepEqual(getDiscoveryProfileMutation('dismiss'), { dismissed: true, pinned: false })
  assert.deepEqual(getDiscoveryProfileMutation('love'), {
    liked: true,
    disliked: false,
    dismissed: false,
  })
  assert.deepEqual(getDiscoveryProfileMutation('hate'), {
    disliked: true,
    liked: false,
    dismissed: true,
    pinned: false,
  })
})

test('normalizeDiscoveryProfileRows groups profile state and preserves timestamps', () => {
  const profile = normalizeDiscoveryProfileRows([
    {
      item_type: 'cuisine',
      item_value: 'italian',
      item_label: 'Italian',
      href: '/cuisines/italian',
      pinned: true,
      dismissed: false,
      liked: true,
      disliked: false,
      metadata: { source: 'test' },
      created_at: new Date('2026-05-12T12:00:00.000Z'),
      updated_at: '2026-05-12T12:01:00.000Z',
      last_interacted_at: new Date('2026-05-12T12:02:00.000Z'),
    },
  ])

  assert.equal(profile.pinned.length, 1)
  assert.equal(profile.liked.length, 1)
  assert.equal(profile.dismissed.length, 0)
  assert.equal(profile.pinned[0].createdAt, '2026-05-12T12:00:00.000Z')
  assert.equal(profile.pinned[0].lastInteractedAt, '2026-05-12T12:02:00.000Z')
})
