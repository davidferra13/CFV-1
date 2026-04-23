import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildCulinaryProfileVector,
  recommendCandidateMealsAgainstVector,
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

describe('client profile service', () => {
  it('flags ambiguous spice-vs-chili conflicts before menu generation', () => {
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
          spice_tolerance: 'very_hot',
          favorite_cuisines: ['Thai'],
          favorite_dishes: ['Drunken Noodles'],
          preferred_service_style: 'plated',
          updated_at: '2026-04-22T10:00:00.000Z',
        },
        allergyRecords: [
          {
            id: 'allergy-1',
            allergen: 'chili',
            severity: 'allergy',
            confirmed_by_chef: true,
            updated_at: '2026-04-22T10:00:00.000Z',
          },
        ],
      })
    )

    assert.ok(vector.hardVetoes.some((constraint) => constraint.label === 'chili'))
    assert.ok(vector.statedLikes.some((signal) => signal.label === 'spice'))
    assert.ok(
      vector.ambiguousConstraints.some(
        (conflict) =>
          conflict.conflictKey === 'spice-vs-chili-veto' && conflict.status === 'pending_user'
      )
    )
  })

  it('rejects vetoed meals and returns the safest aligned candidate with justification', () => {
    const vector = buildCulinaryProfileVector(
      makeBaseBundle({
        client: {
          id: 'client-2',
          full_name: 'Morgan Hale',
          preferred_name: 'Morgan',
          dietary_restrictions: [],
          dietary_protocols: [],
          allergies: ['mushroom'],
          dislikes: ['cilantro'],
          spice_tolerance: 'mild',
          favorite_cuisines: ['Italian'],
          favorite_dishes: ['Cacio e Pepe'],
          preferred_service_style: 'family_style',
          updated_at: '2026-04-22T10:00:00.000Z',
        },
        servedDishes: [
          {
            id: 'served-1',
            dish_name: 'Cacio e Pepe',
            client_reaction: 'loved',
            served_date: '2026-04-01',
            client_feedback_at: '2026-04-01T18:00:00.000Z',
          },
        ],
        messages: [
          {
            id: 'msg-1',
            subject: 'Need something easy this week',
            body: 'I am stressed and want a cozy dinner.',
            direction: 'inbound',
            created_at: '2026-04-20T10:00:00.000Z',
            sent_at: '2026-04-20T10:00:00.000Z',
          },
        ],
      })
    )

    const recommendation = recommendCandidateMealsAgainstVector(vector, {
      candidates: [
        {
          id: 'meal-1',
          title: 'Wild Mushroom Risotto',
          cuisineTags: ['Italian'],
          ingredientTags: ['mushroom', 'parmesan'],
          dishTags: ['risotto'],
          flavorTags: ['earthy'],
          serviceDepth: 'casual_family_style',
          courseCount: 1,
          comfortScore: 0.8,
          boldScore: 0.3,
          complexityScore: 0.7,
        },
        {
          id: 'meal-2',
          title: 'Cacio e Pepe with Roasted Broccolini',
          cuisineTags: ['Italian'],
          ingredientTags: ['pecorino', 'broccolini', 'black pepper'],
          dishTags: ['pasta', 'comfort'],
          flavorTags: ['savory'],
          serviceDepth: 'casual_family_style',
          courseCount: 1,
          comfortScore: 0.95,
          boldScore: 0.35,
          complexityScore: 0.25,
        },
      ],
    })

    assert.equal(recommendation.status, 'ready')
    assert.equal(recommendation.recommendedMeal?.id, 'meal-2')
    assert.ok(recommendation.confidenceScore !== null && recommendation.confidenceScore > 0.5)
    assert.ok(
      recommendation.vetoedCandidates.some((candidate) => candidate.candidateId === 'meal-1')
    )
    assert.ok(recommendation.confidenceJustification.length > 0)
  })
})
