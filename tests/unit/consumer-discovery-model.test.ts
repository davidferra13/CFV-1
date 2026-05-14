import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildChefMatchReasons,
  buildDiscoveryRecoveryActions,
  buildPublicDiscoveryCollections,
  discoveryBriefFromFreeform,
  discoveryBriefFromFilters,
  inferConsumerPlanningState,
  normalizeCompareCandidates,
  normalizeTastePassport,
  OCCASION_PLANNING_TEMPLATES,
  validateEditorialSlot,
} from '@/lib/discovery/consumer-discovery-model'
import type { ConsumerResultCard } from '@/lib/public-consumer/discovery-actions'

const chefCard: ConsumerResultCard = {
  id: 'chef-1',
  type: 'chef',
  title: 'Chef Nina',
  subtitle: 'Italian dinner parties and seafood tasting menus',
  imageUrl: null,
  eyebrow: 'Private dinner',
  locationLabel: 'Miami, FL',
  priceLabel: 'Premium',
  dietaryTags: ['Vegetarian friendly'],
  serviceModes: ['private_dinner'],
  ctaLabel: 'View chef',
  ctaHref: '/chef/nina',
  rating: 4.9,
  reviewCount: 18,
  isAvailable: true,
  relevanceScore: 80,
  sourceId: '1',
  sourceType: 'chef',
  chefId: '1',
}

test('discovery brief normalization parses freeform dinner planning intent conservatively', () => {
  const brief = discoveryBriefFromFreeform(
    'Birthday dinner tonight for 8 people, vegetarian, premium, Italian'
  )

  assert.equal(brief.occasion, 'birthday')
  assert.equal(brief.urgency, 'tonight')
  assert.equal(brief.partySize, 8)
  assert.equal(brief.dietary, 'vegetarian')
  assert.equal(brief.craving, 'italian')
})

test('planning state inference keeps urgent, compare, and group states distinct', () => {
  assert.equal(inferConsumerPlanningState({ filters: { intent: 'tonight' } }), 'need_tonight')
  assert.equal(inferConsumerPlanningState({ compareCount: 2 }), 'comparing_chefs')
  assert.equal(
    inferConsumerPlanningState({
      brief: { urgency: 'flexible', fulfillment: 'any', partySize: 10 },
    }),
    'coordinating_group'
  )
})

test('consumer discovery models compare, collections, recovery, and taste passport data safely', () => {
  const brief = discoveryBriefFromFilters(
    { intent: 'dinner_party', craving: 'Italian', location: 'Miami, FL', dietary: 'vegetarian' },
    null
  )
  const reasons = buildChefMatchReasons(
    chefCard,
    { craving: 'Italian', dietary: 'vegetarian' },
    brief
  )
  const compare = normalizeCompareCandidates([chefCard], ['chef-1'], {}, brief)
  const collections = buildPublicDiscoveryCollections('Miami, FL')
  const recovery = buildDiscoveryRecoveryActions({ dietary: 'vegan', location: 'Miami, FL' }, 0)
  const passport = normalizeTastePassport({
    cuisines: ['Italian'],
    dietary: ['vegetarian'],
    inferredSignals: ['clicked:seafood'],
  })

  assert.ok(reasons.some((reason) => reason.label.includes('Italian')))
  assert.equal(compare[0].title, 'Chef Nina')
  assert.ok(collections.every((collection) => collection.href.startsWith('/eat?')))
  assert.ok(recovery.some((action) => action.label === 'Remove dietary filter'))
  assert.deepEqual(passport.explicitCuisines, ['Italian'])
  assert.deepEqual(passport.explicitDietaryNeeds, ['vegetarian'])
})

test('planning templates and editorial slots are centralized and route-validated', () => {
  assert.ok(OCCASION_PLANNING_TEMPLATES.length >= 6)
  assert.equal(
    validateEditorialSlot({
      id: 'slot-1',
      slotType: 'featured_chef',
      label: 'Chef Nina',
      href: '/chef/nina',
    }),
    true
  )
  assert.equal(
    validateEditorialSlot({
      id: 'slot-2',
      slotType: 'featured_chef',
      label: 'Bad',
      href: '/admin',
    }),
    false
  )
})
