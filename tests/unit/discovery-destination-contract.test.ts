import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getDiscoveryDestinationFamily,
  validateDiscoveryDestination,
} from '@/lib/discovery/discovery-destination-contract'

test('discovery destination contract allows approved public route families', () => {
  assert.equal(getDiscoveryDestinationFamily('/eat?intent=dinner_party'), 'eat')
  assert.equal(getDiscoveryDestinationFamily('/chefs?cuisine=italian'), 'chefs')
  assert.equal(getDiscoveryDestinationFamily('/nearby?q=pizza'), 'nearby')
  assert.equal(getDiscoveryDestinationFamily('/ingredients/stone-crab'), 'ingredients')
  assert.equal(getDiscoveryDestinationFamily('/cuisines/italian'), 'cuisine_page')
  assert.equal(getDiscoveryDestinationFamily('/chef/marisol'), 'chef_profile')
  assert.equal(getDiscoveryDestinationFamily('/hub/open-tables'), 'hub')
})

test('discovery destination contract rejects private and incompatible routes', () => {
  assert.equal(validateDiscoveryDestination('circle', '/admin').valid, false)
  assert.equal(validateDiscoveryDestination('featured_chef', '/events/abc').valid, false)
  assert.equal(validateDiscoveryDestination('featured_chef', '/nearby?q=pizza').valid, false)
  assert.equal(validateDiscoveryDestination('food_type', '/nearby?q=pizza').valid, true)
})
