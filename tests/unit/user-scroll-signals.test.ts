import test from 'node:test'
import assert from 'node:assert/strict'

import {
  rankDiscoveryInteractionPreferences,
  type DiscoveryInteractionSignalRow,
} from '@/lib/discovery/discovery-preference-ranking'

test('rankDiscoveryInteractionPreferences scores item_type/item_value with time decay', () => {
  const now = new Date('2026-05-12T12:00:00.000Z')
  const rows: DiscoveryInteractionSignalRow[] = [
    {
      item_type: 'Cuisine',
      item_value: 'Italian',
      action: 'click',
      created_at: '2026-05-12T12:00:00.000Z',
    },
    {
      item_type: 'cuisine',
      item_value: 'italian',
      action: 'click',
      created_at: '2026-03-28T12:00:00.000Z',
    },
    {
      item_type: 'service',
      item_value: 'private_dinner',
      action: 'save',
      created_at: '2026-05-12T12:00:00.000Z',
    },
  ]

  const ranked = rankDiscoveryInteractionPreferences(rows, now)
  const italian = ranked.find(
    (preference) => preference.itemType === 'cuisine' && preference.itemValue === 'italian'
  )

  assert.equal(italian?.score, 4.5)
  assert.equal(italian?.positiveScore, 4.5)
  assert.equal(italian?.negativeScore, 0)
  assert.equal(italian?.interactionCount, 2)
  assert.equal(ranked[0].itemValue, 'private_dinner')
})

test('rankDiscoveryInteractionPreferences separates negative action score', () => {
  const now = new Date('2026-05-12T12:00:00.000Z')
  const ranked = rankDiscoveryInteractionPreferences(
    [
      {
        item_type: 'cuisine',
        item_value: 'thai',
        action: 'click',
        created_at: '2026-05-12T12:00:00.000Z',
      },
      {
        item_type: 'cuisine',
        item_value: 'thai',
        action: 'hide',
        created_at: '2026-05-12T12:00:00.000Z',
      },
    ],
    now
  )

  assert.equal(ranked.length, 1)
  assert.equal(ranked[0].positiveScore, 3)
  assert.equal(ranked[0].negativeScore, 12)
  assert.equal(ranked[0].score, -9)
  assert.equal(ranked[0].positiveInteractionCount, 1)
  assert.equal(ranked[0].negativeInteractionCount, 1)
})

test('rankDiscoveryInteractionPreferences ignores malformed and unknown interactions', () => {
  const ranked = rankDiscoveryInteractionPreferences(
    [
      {
        item_type: '',
        item_value: 'thai',
        action: 'click',
        created_at: '2026-05-12T12:00:00.000Z',
      },
      {
        item_type: 'cuisine',
        item_value: 'thai',
        action: 'mystery_action',
        created_at: '2026-05-12T12:00:00.000Z',
      },
    ],
    new Date('2026-05-12T12:00:00.000Z')
  )

  assert.deepEqual(ranked, [])
})
