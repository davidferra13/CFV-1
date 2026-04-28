import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPreEventProfileAlignment,
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

  it('treats confirmed pre-event checklist details as current profile evidence', () => {
    const bundle = makeBaseBundle({
      client: {
        id: 'client-3',
        full_name: 'Riley Stone',
        preferred_name: 'Riley',
        dietary_restrictions: [],
        dietary_protocols: [],
        allergies: [],
        dislikes: [],
        spice_tolerance: 'mild',
        favorite_cuisines: [],
        favorite_dishes: [],
        preferred_service_style: 'plated',
        updated_at: '2026-04-20T10:00:00.000Z',
      },
      events: [
        {
          id: 'event-1',
          occasion: 'Anniversary Dinner',
          event_date: '2026-06-01',
          service_style: 'plated',
          status: 'confirmed',
          dietary_restrictions: ['gluten free'],
          allergies: ['peanut'],
          kitchen_notes: 'Six-burner range available.',
          access_instructions: 'Use service entrance.',
          pre_event_checklist_confirmed_at: '2026-04-22T12:00:00.000Z',
        },
      ],
    })

    const alignment = buildPreEventProfileAlignment(bundle)
    const vector = buildCulinaryProfileVector(bundle)

    assert.equal(alignment.status, 'ready')
    assert.deepEqual(alignment.confirmedEventIds, ['event-1'])
    assert.ok(
      vector.hardVetoes.some(
        (constraint) =>
          constraint.label === 'gluten free' &&
          constraint.evidenceRefs.some(
            (ref) => ref.signalKey === 'pre_event_confirmed_dietary_restriction'
          )
      )
    )
    assert.ok(
      vector.hardVetoes.some(
        (constraint) =>
          constraint.label === 'peanut' &&
          constraint.evidenceRefs.some((ref) => ref.signalKey === 'pre_event_confirmed_allergy')
      )
    )
    assert.ok(
      vector.serviceDepth.evidenceRefs.some(
        (ref) => ref.signalKey === 'pre_event_confirmed_service_style'
      )
    )
  })

  it('blocks profile recommendations when an active event lacks checklist confirmation', () => {
    const vector = buildCulinaryProfileVector(
      makeBaseBundle({
        events: [
          {
            id: 'event-2',
            occasion: 'Graduation Dinner',
            event_date: '2026-06-02',
            service_style: 'family_style',
            status: 'confirmed',
            dietary_restrictions: ['vegetarian'],
            allergies: [],
            kitchen_notes: 'Island prep space.',
            access_instructions: 'Front desk has chef name.',
            pre_event_checklist_confirmed_at: null,
          },
        ],
      })
    )

    assert.ok(
      vector.ambiguousConstraints.some(
        (conflict) =>
          conflict.conflictKey === 'pre-event-checklist:event-2:unconfirmed' &&
          conflict.requiresUserArbitration
      )
    )
  })

  it('marks alignment stale when the client profile changed after confirmation', () => {
    const bundle = makeBaseBundle({
      client: {
        id: 'client-4',
        full_name: 'Taylor Reed',
        preferred_name: 'Taylor',
        dietary_restrictions: ['dairy free'],
        dietary_protocols: [],
        allergies: [],
        dislikes: [],
        spice_tolerance: 'mild',
        favorite_cuisines: [],
        favorite_dishes: [],
        preferred_service_style: 'family_style',
        updated_at: '2026-04-24T10:00:00.000Z',
      },
      events: [
        {
          id: 'event-3',
          occasion: 'Board Dinner',
          event_date: '2026-06-03',
          service_style: 'plated',
          status: 'confirmed',
          dietary_restrictions: ['dairy free'],
          allergies: [],
          kitchen_notes: 'Kitchen walkthrough complete.',
          access_instructions: 'Loading dock opens at 2 PM.',
          pre_event_checklist_confirmed_at: '2026-04-23T10:00:00.000Z',
        },
      ],
    })

    const alignment = buildPreEventProfileAlignment(bundle)
    const vector = buildCulinaryProfileVector(bundle)

    assert.equal(alignment.status, 'stale_profile')
    assert.equal(alignment.staleSinceProfileUpdate, true)
    assert.ok(
      vector.ambiguousConstraints.some(
        (conflict) =>
          conflict.conflictKey === 'pre-event-checklist:stale-profile:client-4' &&
          conflict.requiresUserArbitration
      )
    )
  })
})
