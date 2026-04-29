import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildClientDefaultKnowledgeSnapshot,
  normalizeClientDefaultKnowledgeInput,
  type UpdateClientDefaultKnowledgeInput,
} from '@/lib/clients/client-default-knowledge'

describe('client default knowledge', () => {
  it('builds a complete client-visible scope map from profile and passport facts', () => {
    const snapshot = buildClientDefaultKnowledgeSnapshot(
      {
        updated_at: '2026-04-29T10:00:00.000Z',
        full_name: 'Jordan Avery',
        preferred_name: 'Jordan',
        email: 'jordan@example.com',
        phone: '555-0100',
        address: '10 Market St',
        allergies: ['peanut'],
        dietary_restrictions: ['gluten free'],
        dietary_protocols: ['low_fodmap'],
        favorite_cuisines: ['Italian'],
        favorite_dishes: ['Cacio e Pepe'],
        dislikes: ['cilantro'],
        spice_tolerance: 'mild',
        wine_beverage_preferences: 'Sparkling water',
        kitchen_size: 'Large open kitchen',
        kitchen_constraints: 'Induction only',
        equipment_available: ['Stand mixer'],
        house_rules: 'Shoes off',
        parking_instructions: 'Use driveway',
        access_instructions: 'Door code with concierge',
        partner_name: 'Riley',
        children: ['Sam (8)'],
        family_notes: 'Early dinners on school nights',
      },
      {
        updated_at: '2026-04-29T11:00:00.000Z',
        communication_mode: 'delegate_preferred',
        preferred_contact_method: 'email',
        chef_autonomy_level: 'high',
        default_guest_count: 6,
        budget_range_min_cents: 80000,
        budget_range_max_cents: 160000,
        service_style: 'family_style',
        standing_instructions: 'Package leftovers.',
        auto_approve_under_cents: 50000,
        max_interaction_rounds: 2,
        delegate_name: 'Taylor',
        delegate_email: 'taylor@example.com',
        delegate_phone: '555-0120',
      }
    )

    assert.equal(snapshot.scopes.length, 7)
    assert.equal(snapshot.completion.empty, 0)
    assert.ok(snapshot.scopes.every((scope) => scope.items.length > 0))
    assert.equal(snapshot.scopes.find((scope) => scope.key === 'food_safety')?.lockedOn, true)
    assert.equal(
      snapshot.scopes
        .find((scope) => scope.key === 'service_defaults')
        ?.items.some((item) => item.value === '$800 - $1,600'),
      true
    )
  })

  it('nulls disabled optional defaults without clearing required communication controls', () => {
    const input: UpdateClientDefaultKnowledgeInput = {
      communication_mode: 'direct',
      preferred_contact_method: 'sms',
      chef_autonomy_level: 'moderate',
      use_auto_approval: false,
      auto_approve_under_cents: 25000,
      max_interaction_rounds: 3,
      use_standing_instructions: false,
      standing_instructions: 'Should not persist',
      use_service_defaults: false,
      default_guest_count: 10,
      service_style: 'formal_plated',
      use_budget_range: false,
      budget_range_min_cents: 100000,
      budget_range_max_cents: 200000,
      use_delegate: false,
      delegate_name: 'Hidden',
      delegate_email: 'hidden@example.com',
      delegate_phone: '555-0199',
    }

    const normalized = normalizeClientDefaultKnowledgeInput(input)

    assert.equal(normalized.communication_mode, 'direct')
    assert.equal(normalized.preferred_contact_method, 'sms')
    assert.equal(normalized.chef_autonomy_level, 'moderate')
    assert.equal(normalized.max_interaction_rounds, 3)
    assert.equal(normalized.auto_approve_under_cents, null)
    assert.equal(normalized.standing_instructions, null)
    assert.equal(normalized.default_guest_count, null)
    assert.equal(normalized.service_style, null)
    assert.equal(normalized.budget_range_min_cents, null)
    assert.equal(normalized.budget_range_max_cents, null)
    assert.equal(normalized.delegate_name, null)
  })
})
