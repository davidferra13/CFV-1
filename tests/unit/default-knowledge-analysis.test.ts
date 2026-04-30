import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CulinaryProfileAnswer } from '@/lib/ai/chef-profile-constants'
import type { RemyMemory } from '@/lib/ai/remy-memory-types'
import {
  buildDefaultKnowledgeModel,
  detectRestatedKnowledge,
  previewKnowledgeScenario,
} from '@/lib/chef/default-knowledge-analysis'
import {
  DEFAULT_MENU_ENGINE_FEATURES,
  DEFAULT_PREFERENCES,
  type ChefPreferences,
} from '@/lib/scheduling/types'

test('default knowledge model scores coverage from real stored facts', () => {
  const model = buildDefaultKnowledgeModel({
    preferences: chefPreferences(),
    culinaryProfile: culinaryProfile(),
    memories: memories(),
  })

  assert.equal(
    model.coverage.some((domain) => domain.id === 'communication'),
    true
  )
  assert.equal(model.coverage.find((domain) => domain.id === 'communication')?.known, 1)
  assert.equal(model.sourceLedger.find((entry) => entry.source === 'remy_memories')?.count, 5)
  assert.ok(model.coverageScore > 50)
})

test('restatement detector flags known facts before the chef repeats them again', () => {
  const model = buildDefaultKnowledgeModel({
    preferences: chefPreferences(),
    culinaryProfile: culinaryProfile(),
    memories: memories(),
  })

  const matches = detectRestatedKnowledge(
    'I already said I shop the day before events and keep client emails concise.',
    model.facts
  )

  assert.equal(
    matches.some((match) => match.label === 'Shopping cadence'),
    true
  )
  assert.equal(
    matches.some((match) => match.category === 'communication_style'),
    true
  )
})

test('contradiction resolver exposes conflicting durable rules', () => {
  const model = buildDefaultKnowledgeModel({
    preferences: chefPreferences(),
    culinaryProfile: culinaryProfile(),
    memories: memories(),
  })

  assert.equal(
    model.conflicts.some((conflict) => conflict.id === 'shopping-cadence-conflict'),
    true
  )
  assert.equal(
    model.conflicts.some((conflict) => conflict.id === 'communication-length-conflict'),
    true
  )
})

test('test mode previews surfaces that would receive matching defaults', () => {
  const model = buildDefaultKnowledgeModel({
    preferences: chefPreferences(),
    culinaryProfile: culinaryProfile(),
    memories: memories(),
  })

  const preview = previewKnowledgeScenario(
    'Plan a tasting and write short concise client emails.',
    model
  )

  assert.ok(preview.matches.length > 0)
  assert.equal(
    preview.appliedSurfaces.some((surface) => surface.surface === 'client_drafts'),
    true
  )
})

function chefPreferences(): ChefPreferences {
  return {
    id: 'pref-1',
    chef_id: 'chef-1',
    ...DEFAULT_PREFERENCES,
    home_city: 'Charleston',
    home_state: 'SC',
    home_zip: '29401',
    default_stores: [{ name: 'Farm Market', address: '1 Market St', place_id: null }],
    default_prep_hours: 4,
    target_margin_percent: 65,
    event_readiness_assistant_enabled: true,
    menu_engine_features: { ...DEFAULT_MENU_ENGINE_FEATURES },
  }
}

function culinaryProfile(): CulinaryProfileAnswer[] {
  return [
    {
      questionKey: 'cooking_philosophy',
      question: "What's your cooking philosophy in one sentence?",
      answer: 'Ingredient-led, warm, and seasonal.',
    },
  ] as CulinaryProfileAnswer[]
}

function memories(): RemyMemory[] {
  return [
    memory('m1', 'communication_style', 'Prefers short, concise client emails.', 8),
    memory('m2', 'communication_style', 'Prefers more detailed event recap drafts.', 6),
    memory('m3', 'scheduling_pattern', 'Shop day before all events by default.', 8),
    memory('m4', 'scheduling_pattern', 'Shop morning of seafood events.', 7),
    memory('m5', 'client_insight', 'The Smith family prefers vegetarian tasting menus.', 9),
  ]
}

function memory(
  id: string,
  category: RemyMemory['category'],
  content: string,
  importance: number
): RemyMemory {
  return {
    id,
    category,
    content,
    importance,
    accessCount: 0,
    relatedClientId: null,
    relatedClientName: null,
    createdAt: '2026-04-29T12:00:00.000Z',
    lastAccessedAt: '2026-04-29T12:00:00.000Z',
    source: 'database',
    editable: true,
  }
}
