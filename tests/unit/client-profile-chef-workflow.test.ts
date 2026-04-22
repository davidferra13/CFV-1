import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildDietaryConflictsFromVector,
  buildProposalProfileGuidance,
  mapClientProfileVectorToMenuClientTasteSummary,
} from '@/lib/clients/client-profile-chef-workflow'
import {
  buildCulinaryProfileVector,
  type ClientProfileSourceBundle,
} from '@/lib/clients/client-profile-service'

function makeBaseBundle(
  overrides: Partial<ClientProfileSourceBundle> = {}
): ClientProfileSourceBundle {
  return {
    tenantId: 'tenant-1',
    client: {
      id: 'client-1',
      full_name: 'Jordan Avery',
      preferred_name: 'Jordan',
      dietary_restrictions: [],
      dietary_protocols: [],
      allergies: [],
      dislikes: [],
      spice_tolerance: 'mild',
      favorite_cuisines: [],
      favorite_dishes: [],
      preferred_service_style: 'family_style',
      updated_at: '2026-04-22T10:00:00.000Z',
    },
    allergyRecords: [],
    tasteProfile: null,
    preferences: [],
    servedDishes: [],
    mealRequests: [],
    events: [],
    inquiries: [],
    messages: [],
    communicationLogs: [],
    feedbackRequests: [],
    feedbackResponses: [],
    households: [],
    householdMembers: [],
    linkedClients: [],
    managedSubjects: [],
    ...overrides,
  }
}

describe('client profile chef workflow adapters', () => {
  it('maps a culinary profile vector into the legacy menu taste summary shape', () => {
    const vector = buildCulinaryProfileVector(
      makeBaseBundle({
        client: {
          id: 'client-1',
          full_name: 'Jordan Avery',
          preferred_name: 'Jordan',
          dietary_restrictions: [],
          dietary_protocols: [],
          allergies: [],
          dislikes: [],
          spice_tolerance: 'hot',
          favorite_cuisines: ['Italian'],
          favorite_dishes: ['Cacio e Pepe'],
          preferred_service_style: 'plated',
          updated_at: '2026-04-22T10:00:00.000Z',
        },
        tasteProfile: {
          favorite_cuisines: ['Japanese'],
          disliked_ingredients: ['Cilantro'],
          spice_tolerance: 4,
          preferred_proteins: ['Salmon'],
          avoids: [],
          flavor_notes: null,
          updated_at: '2026-04-22T10:00:00.000Z',
        },
        preferences: [
          {
            item_type: 'ingredient',
            item_name: 'Charred carrots',
            rating: 'liked',
            observed_at: '2026-04-20T10:00:00.000Z',
          },
        ],
        mealRequests: [
          {
            id: 'request-1',
            request_type: 'new_idea',
            dish_name: 'Laksa',
            status: 'requested',
            created_at: '2026-04-19T10:00:00.000Z',
            updated_at: '2026-04-19T10:00:00.000Z',
          },
        ],
      })
    )

    const summary = mapClientProfileVectorToMenuClientTasteSummary({
      vector,
      clientName: 'Jordan Avery',
      pastEventCount: 4,
    })

    assert.equal(summary.clientId, 'client-1')
    assert.equal(summary.clientName, 'Jordan Avery')
    assert.deepEqual(summary.cuisinePreferences, ['Italian', 'Japanese'])
    assert.deepEqual(summary.favoriteDishes, ['Cacio e Pepe', 'Laksa'])
    assert.deepEqual(summary.loved, ['Charred carrots', 'Salmon'])
    assert.deepEqual(summary.disliked, ['Cilantro'])
    assert.equal(summary.spicePreference, 'Hot')
    assert.equal(summary.pastEventCount, 4)
  })

  it('detects menu dietary conflicts from vector hard vetoes', () => {
    const vector = buildCulinaryProfileVector(
      makeBaseBundle({
        client: {
          id: 'client-2',
          full_name: 'Morgan Hale',
          preferred_name: 'Morgan',
          dietary_restrictions: [],
          dietary_protocols: [],
          allergies: ['peanut'],
          dislikes: [],
          spice_tolerance: 'mild',
          favorite_cuisines: [],
          favorite_dishes: [],
          preferred_service_style: 'family_style',
          updated_at: '2026-04-22T10:00:00.000Z',
        },
      })
    )

    const conflicts = buildDietaryConflictsFromVector({
      vector,
      menuDishes: [
        {
          dishName: 'Satay Skewers',
          ingredientNames: ['Chicken', 'Peanut Sauce'],
          labelNames: ['contains nuts'],
        },
        {
          dishName: 'Green Beans',
          ingredientNames: ['Green Beans', 'Lemon'],
          labelNames: [],
        },
      ],
    })

    assert.equal(conflicts.length, 1)
    assert.deepEqual(conflicts[0], {
      ingredientName: 'Peanut Sauce',
      dishName: 'Satay Skewers',
      clientPreference: 'peanut',
      sourceLabel: 'Hard veto',
    })
  })

  it('builds proposal guidance from the profile vector', () => {
    const vector = buildCulinaryProfileVector(
      makeBaseBundle({
        client: {
          id: 'client-3',
          full_name: 'Taylor Brooks',
          preferred_name: 'Taylor',
          dietary_restrictions: [],
          dietary_protocols: [],
          allergies: ['chili'],
          dislikes: [],
          spice_tolerance: 'very_hot',
          favorite_cuisines: ['Thai'],
          favorite_dishes: ['Drunken Noodles'],
          preferred_service_style: 'plated',
          updated_at: '2026-04-22T10:00:00.000Z',
        },
        messages: [
          {
            id: 'msg-1',
            subject: 'Birthday dinner',
            body: 'We are excited to celebrate and try something new.',
            direction: 'inbound',
            created_at: '2026-04-21T10:00:00.000Z',
            sent_at: '2026-04-21T10:00:00.000Z',
          },
        ],
      })
    )

    const guidance = buildProposalProfileGuidance(vector)

    assert.ok(guidance.confidenceScore !== null)
    assert.equal(guidance.serviceDepth, 'Formal Plated')
    assert.equal(guidance.emotionalState, 'Celebratory')
    assert.ok(guidance.hardVetoes.includes('chili'))
    assert.ok(guidance.strongLikes.includes('Thai'))
    assert.ok(guidance.ambiguities.length > 0)
  })
})
