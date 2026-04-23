import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildClientCulinarySignalSnapshot,
  buildNegativeSignalLookup,
  summarizeClientCulinarySignals,
} from '@/lib/clients/culinary-signals'

describe('client culinary signals', () => {
  it('keeps explicit culinary profile facts canonical when history overlaps', () => {
    const snapshot = buildClientCulinarySignalSnapshot({
      client: {
        id: 'client-1',
        full_name: 'Avery Stone',
        allergies: ['Tree Nut'],
        dislikes: ['Mushroom'],
        favorite_cuisines: ['Italian'],
        favorite_dishes: ['Risotto'],
        spice_tolerance: 'mild',
        updated_at: '2026-04-19T10:00:00.000Z',
      },
      allergyRecords: [
        {
          allergen: 'Tree Nut',
          confirmed_by_chef: true,
          updated_at: '2026-04-20T10:00:00.000Z',
        },
      ],
      tasteProfile: {
        favorite_cuisines: ['Italian', 'Japanese'],
        disliked_ingredients: ['Mushroom', 'Cilantro'],
        avoids: ['Cilantro'],
        spice_tolerance: 4,
        updated_at: '2026-04-21T10:00:00.000Z',
      },
      preferences: [
        {
          item_type: 'dish',
          item_name: 'Risotto',
          rating: 'loved',
          observed_at: '2026-04-18T10:00:00.000Z',
        },
        {
          item_type: 'dish',
          item_name: 'Tacos',
          rating: 'liked',
          observed_at: '2026-04-17T10:00:00.000Z',
        },
        {
          item_type: 'cuisine',
          item_name: 'French',
          rating: 'liked',
          observed_at: '2026-04-16T10:00:00.000Z',
        },
        {
          item_type: 'ingredient',
          item_name: 'Mushroom',
          rating: 'disliked',
          observed_at: '2026-04-15T10:00:00.000Z',
        },
      ],
      servedDishes: [
        {
          dish_name: 'Cilantro Salad',
          client_reaction: 'disliked',
          client_feedback_at: '2026-04-14T10:00:00.000Z',
        },
      ],
      mealRequests: [
        {
          request_type: 'repeat_dish',
          dish_name: 'Risotto',
          status: 'requested',
          created_at: '2026-04-13T10:00:00.000Z',
        },
        {
          request_type: 'new_idea',
          dish_name: 'Laksa',
          status: 'requested',
          created_at: '2026-04-12T10:00:00.000Z',
        },
        {
          request_type: 'avoid_dish',
          dish_name: 'Cilantro',
          status: 'requested',
          created_at: '2026-04-11T10:00:00.000Z',
        },
      ],
    })

    assert.equal(snapshot.clientName, 'Avery Stone')
    assert.equal(
      snapshot.canonical.find((signal) => signal.kind === 'allergy' && signal.value === 'Tree Nut')
        ?.sourceLabel,
      'Confirmed Allergy Record'
    )
    assert.equal(
      snapshot.canonical.find((signal) => signal.kind === 'spice_preference')?.value,
      'Hot'
    )
    assert.ok(
      snapshot.secondaryDerived.some(
        (signal) =>
          signal.value === 'Risotto' &&
          signal.shadowedByProfile &&
          (signal.kind === 'positive_item' || signal.kind === 'requested_item')
      )
    )
    assert.deepEqual(
      snapshot.negative.map((signal) => signal.value),
      ['Cilantro', 'Mushroom', 'Cilantro Salad']
    )
  })

  it('summarizes canonical signals for menu planning without duplicating favorites', () => {
    const snapshot = buildClientCulinarySignalSnapshot({
      client: {
        id: 'client-1',
        full_name: 'Avery Stone',
        dislikes: ['Mushroom'],
        favorite_cuisines: ['Italian'],
        favorite_dishes: ['Risotto'],
        spice_tolerance: 'medium',
        updated_at: '2026-04-19T10:00:00.000Z',
      },
      tasteProfile: {
        favorite_cuisines: ['Japanese'],
        disliked_ingredients: ['Cilantro'],
        spice_tolerance: 4,
        updated_at: '2026-04-21T10:00:00.000Z',
      },
      preferences: [
        {
          item_type: 'dish',
          item_name: 'Tacos',
          rating: 'liked',
          observed_at: '2026-04-17T10:00:00.000Z',
        },
        {
          item_type: 'cuisine',
          item_name: 'French',
          rating: 'liked',
          observed_at: '2026-04-16T10:00:00.000Z',
        },
      ],
      mealRequests: [
        {
          request_type: 'new_idea',
          dish_name: 'Laksa',
          status: 'requested',
          created_at: '2026-04-12T10:00:00.000Z',
        },
      ],
    })

    const summary = summarizeClientCulinarySignals(snapshot, 3)
    const negativeLookup = buildNegativeSignalLookup(snapshot)

    assert.deepEqual(summary.favoriteDishes, ['Risotto'])
    assert.deepEqual(summary.loved, ['Tacos', 'Laksa'])
    assert.deepEqual(summary.disliked, ['Cilantro', 'Mushroom'])
    assert.deepEqual(summary.cuisinePreferences, ['Japanese', 'Italian', 'French'])
    assert.equal(summary.spicePreference, 'Hot')
    assert.equal(summary.pastEventCount, 3)
    assert.equal(negativeLookup.get('cilantro')?.sourceLabel, 'Taste Profile')
  })
})
