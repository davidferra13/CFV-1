import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildActiveFilterSummaryTokens,
  formatActiveFilterSummary,
  getAvailableDiscoveryNextActions,
  getDiscoveryActionEligibility,
  getOneTapFeedbackOptions,
} from '@/lib/discovery/action-contracts'
import {
  buildShareableDiscoveryLink,
  parseShareableDiscoveryLink,
} from '@/lib/discovery/action-shareable-link'

test('discovery action eligibility prevents inert action bar controls', () => {
  const emptyActions = getAvailableDiscoveryNextActions({
    surface: 'homepage',
    authenticated: false,
    remyAvailable: false,
  }).map((action) => action.id)

  assert.deepEqual(emptyActions, ['find_restaurants', 'find_chefs', 'fresh_mix'])
  assert.equal(getDiscoveryActionEligibility('save', { surface: 'eat' }).requiresSelection, true)

  const selectedActions = getAvailableDiscoveryNextActions({
    surface: 'eat',
    selectedItems: [{ id: 'chef-1', type: 'chef', label: 'Chef Nina', href: '/chef/nina' }],
    compareCandidateCount: 2,
    authenticated: true,
    remyAvailable: true,
    circleId: 'circle-1',
    filters: { fulfillment: 'private_chef', craving: 'Italian' },
  }).map((action) => action.id)

  assert.ok(selectedActions.includes('compare'))
  assert.ok(selectedActions.includes('save'))
  assert.ok(selectedActions.includes('share_to_circle'))
  assert.ok(selectedActions.includes('build_plan'))
})

test('active filter summary exposes visible state in stable order', () => {
  const tokens = buildActiveFilterSummaryTokens({
    filters: {
      craving: 'Romanian',
      fulfillment: 'restaurant',
      budget: 'budget-friendly',
      partySize: 4,
    },
    radiusMiles: 10,
    remyTuningEnabled: true,
  })

  assert.deepEqual(
    tokens.map((token) => token.value),
    ['Romanian', 'restaurant', '10 miles', 'budget-friendly', '4 people', 'on']
  )
  assert.equal(
    formatActiveFilterSummary({ filters: { craving: 'Romanian' }, radiusMiles: 10 }),
    'Romanian · 10 miles'
  )
})

test('one tap feedback maps visible intents to profile and ranking effects', () => {
  const options = getOneTapFeedbackOptions()
  const notForMe = options.find((option) => option.intent === 'not_for_me')
  const moreLikeThis = options.find((option) => option.intent === 'show_more_like_this')

  assert.equal(notForMe?.profileAction, 'hide')
  assert.equal(notForMe?.undoable, true)
  assert.equal(moreLikeThis?.profileAction, 'pin')
  assert.equal(moreLikeThis?.effect, 'expand_similar')
})

test('shareable discovery link preserves public state and omits private tuning', () => {
  const href = buildShareableDiscoveryLink('/eat?existing=1', {
    mode: 'compare',
    filters: {
      craving: 'Thai',
      fulfillment: 'restaurant',
      location: 'Miami, FL',
      partySize: 3,
      visualMode: true,
    },
    selectedIds: ['chef-1', 'chef-1', 'restaurant-2'],
    shortlistIds: ['menu-3'],
    compareIds: ['chef-1', 'restaurant-2'],
  })

  assert.equal(
    href,
    '/eat?existing=1&craving=Thai&fulfillment=restaurant&location=Miami%2C+FL&partySize=3&visualMode=1&mode=compare&sel=chef-1%2Crestaurant-2&sl=menu-3&cmp=chef-1%2Crestaurant-2'
  )

  const parsed = parseShareableDiscoveryLink(href)
  assert.equal(parsed.mode, 'compare')
  assert.equal(parsed.filters?.craving, 'Thai')
  assert.equal(parsed.filters?.partySize, 3)
  assert.deepEqual(parsed.selectedIds, ['chef-1', 'restaurant-2'])
})
