import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildUniversalFoodObjectActions,
  decideFoodSocialVisibility,
  evaluateFoodSocialRailCandidate,
  listFoodSocialRailContracts,
  resolveFoodSocialRailMix,
  resolveWhatToEatRecovery,
  type FoodSocialRailCandidate,
} from '@/lib/discovery/food-social-rail-contracts'

test('food social rail contracts cover every promoted 5/12 blocked family with governance metadata', () => {
  const contracts = listFoodSocialRailContracts()
  const families = contracts.map((contract) => contract.family)

  assert.deepEqual(
    new Set(families),
    new Set([
      'opportunity_marketplace',
      'population_governance',
      'social_safety',
      'relationship_life_event',
      'visibility_consent',
      'shared_circle_discovery',
      'food_signal_notifications',
      'universal_food_object',
      'what_to_eat_now',
      'partner_vendor_opportunity',
      'food_social_network',
    ])
  )

  for (const contract of contracts) {
    assert.ok(contract.populationFormula.length > 0, `${contract.family} needs a formula`)
    assert.ok(contract.reasonTemplate.length > 0, `${contract.family} needs a reason`)
    assert.ok(contract.optOutKey.startsWith('rail.'), `${contract.family} needs opt-out key`)
    assert.ok(contract.maxShareOfRail > 0, `${contract.family} needs rail share`)
    assert.ok(contract.demotionPolicy.length > 0, `${contract.family} needs demotion policy`)
  }
})

test('candidate evaluation fails closed for missing consent, opt-out, expiry, and wrong context', () => {
  const candidate: FoodSocialRailCandidate = {
    id: 'anniversary-1',
    family: 'relationship_life_event',
    label: 'Plan anniversary dinner',
    score: 92,
    expiresAt: '2026-06-01T00:00:00.000Z',
  }

  assert.equal(
    evaluateFoodSocialRailCandidate({
      candidate,
      actorMode: 'client',
      context: 'client_home',
      now: '2026-05-13T00:00:00.000Z',
    }).eligible,
    false
  )

  assert.equal(
    evaluateFoodSocialRailCandidate({
      candidate,
      actorMode: 'client',
      context: 'client_home',
      consentGrants: ['relationship_planning'],
      optedOutKeys: ['rail.relationshipPlanning'],
      now: '2026-05-13T00:00:00.000Z',
    }).reason,
    'Relationship Graph And Life Event Planner is suppressed by opt-out.'
  )

  assert.equal(
    evaluateFoodSocialRailCandidate({
      candidate,
      actorMode: 'client',
      context: 'chef_workspace',
      consentGrants: ['relationship_planning'],
      now: '2026-05-13T00:00:00.000Z',
    }).eligible,
    false
  )

  assert.equal(
    evaluateFoodSocialRailCandidate({
      candidate: { ...candidate, expiresAt: '2026-05-01T00:00:00.000Z' },
      actorMode: 'client',
      context: 'client_home',
      consentGrants: ['relationship_planning'],
      now: '2026-05-13T00:00:00.000Z',
    }).reason,
    'Relationship Graph And Life Event Planner is expired.'
  )
})

test('rail mix applies score ordering plus family population caps', () => {
  const candidates: FoodSocialRailCandidate[] = [
    {
      id: 'opening-1',
      family: 'opportunity_marketplace',
      label: 'Chef opening',
      score: 90,
      urgency: 'urgent',
    },
    {
      id: 'opening-2',
      family: 'opportunity_marketplace',
      label: 'Menu discount',
      score: 88,
    },
    {
      id: 'circle-1',
      family: 'shared_circle_discovery',
      label: 'Winning circle pick',
      score: 86,
    },
    {
      id: 'search-1',
      family: 'what_to_eat_now',
      label: 'What sounds good?',
      score: 84,
    },
  ]

  const mix = resolveFoodSocialRailMix({
    candidates,
    actorMode: 'client',
    context: 'client_home',
    maxItems: 4,
    consentGrants: ['partner_opportunities', 'circle_activity'],
  })

  assert.deepEqual(
    mix.selected.map((item) => item.candidateId),
    ['opening-1', 'search-1']
  )
  assert.ok(
    mix.suppressed.some((item) => item.reason.includes('population share cap')),
    'second opportunity should be capped'
  )
  assert.ok(
    mix.suppressed.some((item) => item.reason.includes('not allowed in client_home')),
    'circle-only candidates should not leak into client home'
  )
})

test('visibility and universal object actions preserve cross-context consent boundaries', () => {
  const chefView = decideFoodSocialVisibility({
    family: 'food_social_network',
    viewerMode: 'chef',
    sourceContext: 'client_home',
    targetContext: 'chef_workspace',
    consentGrants: ['circle_activity', 'food_memory'],
  })
  assert.equal(chefView.allowed, true)
  assert.equal(chefView.visibleDetail, 'summary')

  const noConsent = decideFoodSocialVisibility({
    family: 'food_social_network',
    viewerMode: 'chef',
    sourceContext: 'client_home',
    targetContext: 'chef_workspace',
  })
  assert.equal(noConsent.allowed, false)

  const actions = buildUniversalFoodObjectActions({
    objectType: 'menu',
    authenticated: true,
    inCircleContext: true,
    chefAvailable: true,
    consentGrants: ['food_memory', 'circle_activity', 'notifications'],
  })

  assert.deepEqual(
    actions.filter((action) => action.enabled).map((action) => action.action),
    [
      'save',
      'send_to_circle',
      'ask_chef',
      'plan_dinner',
      'vote',
      'keep_private',
      'hide',
      'notify_me',
    ]
  )
  assert.equal(
    actions.find((action) => action.action === 'send_to_circle')?.writesSharedState,
    true
  )
})

test('what-to-eat recovery clarifies vague intent and escalates empty circle searches', () => {
  assert.deepEqual(resolveWhatToEatRecovery({ query: '', resultCount: 0 }), {
    mode: 'clarify',
    prompt: 'What sounds good right now?',
    suggestedFamilies: ['what_to_eat_now', 'population_governance'],
  })

  const recovery = resolveWhatToEatRecovery({
    query: 'birthday vegan dinner',
    resultCount: 0,
    hasCircleContext: true,
  })

  assert.equal(recovery.mode, 'recover')
  assert.ok(recovery.suggestedFamilies.includes('shared_circle_discovery'))
})
