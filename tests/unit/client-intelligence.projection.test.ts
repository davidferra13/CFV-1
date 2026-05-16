import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildClientIntelligenceProjection,
  dedupeClientIntelligenceFacts,
  type ClientIntelligenceFact,
  type ClientIntelligenceProjectionBundle,
} from '@/lib/client-intelligence/projection'

const NOW = new Date('2026-05-15T12:00:00.000Z')

function makeBundle(
  overrides: Partial<ClientIntelligenceProjectionBundle> = {}
): ClientIntelligenceProjectionBundle {
  return {
    tenantId: 'tenant-1',
    client: {
      id: 'client-1',
      tenant_id: 'tenant-1',
      full_name: 'Jordan Avery',
      status: 'active',
      favorite_dishes: [],
      favorite_cuisines: [],
      allergies: [],
      dietary_restrictions: [],
      dislikes: [],
      updated_at: '2026-05-01T00:00:00.000Z',
    },
    events: [],
    preferences: [],
    allergyRecords: [],
    surveys: [],
    financialSummary: null,
    households: [],
    householdMembers: [],
    profileVectors: [],
    ...overrides,
  }
}

function makeFact(overrides: Partial<ClientIntelligenceFact>): ClientIntelligenceFact {
  return {
    id: 'fact-1',
    clientId: 'client-1',
    category: 'Dietary Rules',
    fieldKey: 'allergy_record',
    label: 'Allergy record',
    value: 'Peanut',
    rawValue: 'Peanut',
    lifecycle: 'needs_review',
    confidence: 0.68,
    confidenceLabel: 'medium',
    disclosure: 'client_visible',
    sensitivity: 'medical_sensitive',
    consentStatus: 'client_provided',
    sourceLabel: 'Unconfirmed allergy record',
    evidence: [
      {
        sourceType: 'allergy_record',
        sourceTable: 'client_allergy_records',
        sourceRecordId: 'allergy-1',
        label: 'Unconfirmed allergy record',
        observedAt: '2026-05-01T00:00:00.000Z',
        confidence: 0.68,
      },
    ],
    freshnessDays: 14,
    actionability: 'warning',
    importanceScore: 0,
    ...overrides,
  }
}

describe('client intelligence projection', () => {
  it('refuses to project a client from another tenant', () => {
    assert.throws(
      () =>
        buildClientIntelligenceProjection(
          makeBundle({
            client: {
              id: 'client-1',
              tenant_id: 'tenant-2',
              full_name: 'Jordan Avery',
            },
          }),
          { now: NOW }
        ),
      /cross-tenant/
    )
  })

  it('dedupes equivalent facts while keeping stronger confidence and merged evidence', () => {
    const deduped = dedupeClientIntelligenceFacts([
      makeFact({ value: 'Peanut', confidence: 0.68, confidenceLabel: 'medium' }),
      makeFact({
        id: 'fact-2',
        value: 'peanut',
        lifecycle: 'confirmed',
        confidence: 0.96,
        confidenceLabel: 'high',
        sourceLabel: 'Chef-confirmed allergy record',
        evidence: [
          {
            sourceType: 'allergy_record',
            sourceTable: 'client_allergy_records',
            sourceRecordId: 'allergy-2',
            label: 'Chef-confirmed allergy record',
            observedAt: '2026-05-10T00:00:00.000Z',
            confidence: 0.96,
          },
        ],
        freshnessDays: 5,
      }),
    ])

    assert.equal(deduped.length, 1)
    assert.equal(deduped[0].confidence, 0.96)
    assert.equal(deduped[0].confidenceLabel, 'high')
    assert.equal(deduped[0].lifecycle, 'confirmed')
    assert.equal(deduped[0].evidence.length, 2)
  })

  it('creates suggestion-status predictions from fresh confirmed preference evidence', () => {
    const projection = buildClientIntelligenceProjection(
      makeBundle({
        client: {
          id: 'client-1',
          tenant_id: 'tenant-1',
          full_name: 'Jordan Avery',
          status: 'active',
          favorite_dishes: ['Cacio e Pepe'],
          favorite_cuisines: ['Italian'],
          allergies: [],
          dietary_restrictions: [],
          dislikes: [],
          updated_at: '2026-05-01T00:00:00.000Z',
        },
        financialSummary: {
          client_id: 'client-1',
          tenant_id: 'tenant-1',
          average_spend_per_event: 120000,
          last_event_date: '2026-04-20',
        },
      }),
      { now: NOW }
    )

    const nextMeal = projection.predictions.find((prediction) => prediction.type === 'next_meal')
    assert.ok(nextMeal)
    assert.equal(nextMeal.status, 'suggestion')
    assert.equal(nextMeal.reviewRequired, false)
    assert.equal(nextMeal.safeToAutomate, true)
    assert.ok(nextMeal.reasons.some((reason) => reason.includes('Cacio e Pepe')))
  })

  it('marks stale facts out of the active prediction evidence set', () => {
    const projection = buildClientIntelligenceProjection(
      makeBundle({
        client: {
          id: 'client-1',
          tenant_id: 'tenant-1',
          full_name: 'Jordan Avery',
          status: 'active',
          favorite_dishes: ['Old tasting menu'],
          favorite_cuisines: [],
          allergies: [],
          dietary_restrictions: [],
          dislikes: [],
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      }),
      { now: NOW }
    )

    assert.ok(
      projection.facts.some(
        (fact) => fact.fieldKey === 'favorite_dish' && fact.lifecycle === 'stale'
      )
    )
    assert.equal(
      projection.predictions.some((prediction) => prediction.type === 'next_meal'),
      false
    )
  })

  it('blocks prediction automation when positive food signals contradict safety rules', () => {
    const projection = buildClientIntelligenceProjection(
      makeBundle({
        client: {
          id: 'client-1',
          tenant_id: 'tenant-1',
          full_name: 'Jordan Avery',
          status: 'active',
          favorite_dishes: [],
          favorite_cuisines: [],
          allergies: ['gluten'],
          dietary_restrictions: ['gluten-free'],
          dislikes: [],
          updated_at: '2026-05-01T00:00:00.000Z',
        },
        preferences: [
          {
            id: 'pref-1',
            tenant_id: 'tenant-1',
            client_id: 'client-1',
            item_name: 'fresh pasta',
            rating: 'loved',
            observed_at: '2026-05-10T00:00:00.000Z',
          },
        ],
      }),
      { now: NOW }
    )

    assert.ok(
      projection.contradictions.some((item) => item.id === 'contradiction:gluten-positive-signal')
    )
    assert.ok(projection.facts.some((fact) => fact.lifecycle === 'contradicted'))
    assert.ok(
      projection.predictions.some(
        (prediction) =>
          prediction.status === 'blocked_by_contradiction' &&
          prediction.reviewRequired &&
          !prediction.safeToAutomate
      )
    )
    assert.ok(projection.actions.some((action) => action.status === 'needs_review'))
  })
})
