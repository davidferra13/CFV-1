import test from 'node:test'
import assert from 'node:assert/strict'

import { buildNearbyBrowseHubModel } from '../../lib/discover/nearby-browse-hubs'

test('buildNearbyBrowseHubModel returns live combo hubs when city-plus-type density exists', () => {
  const model = buildNearbyBrowseHubModel({
    totalListings: 44,
    states: [
      { state: 'MA', count: 21 },
      { state: 'TX', count: 23 },
    ],
    topCities: [
      { city: 'Boston', state: 'MA', count: 12 },
      { city: 'Austin', state: 'TX', count: 10 },
    ],
    topBusinessTypes: [
      { businessType: 'restaurant', count: 18 },
      { businessType: 'bakery', count: 9 },
      { businessType: 'caterer', count: 7 },
    ],
    topCityBusinessTypes: [
      { city: 'Boston', state: 'MA', businessType: 'restaurant', count: 8 },
      { city: 'Boston', state: 'MA', businessType: 'bakery', count: 4 },
      { city: 'Austin', state: 'TX', businessType: 'restaurant', count: 6 },
      { city: 'Austin', state: 'TX', businessType: 'caterer', count: 5 },
    ],
  })

  assert.equal(model.typeHubs[0]?.href, '/nearby?type=restaurant')
  assert.equal(
    model.typeHubs[0]?.supportingLinks[0]?.href,
    '/nearby?state=MA&city=Boston&type=restaurant'
  )
  assert.equal(
    model.cityHubs[0]?.supportingLinks[0]?.href,
    '/nearby?state=MA&city=Boston&type=restaurant'
  )
  assert.equal(model.comboSection.mode, 'live')

  if (model.comboSection.mode === 'live') {
    assert.equal(model.comboSection.items[0]?.href, '/nearby?state=MA&city=Boston&type=restaurant')
    assert.equal(model.comboSection.items[0]?.typeLabel, 'Restaurant')
    assert.match(model.comboSection.items[0]?.description ?? '', /8 live listings/i)
  }
})

test('buildNearbyBrowseHubModel falls back to city and type links when combo density is thin', () => {
  const model = buildNearbyBrowseHubModel({
    totalListings: 2,
    states: [{ state: 'ME', count: 2 }],
    topCities: [{ city: 'Portland', state: 'ME', count: 2 }],
    topBusinessTypes: [{ businessType: 'bakery', count: 2 }],
    topCityBusinessTypes: [{ city: 'Portland', state: 'ME', businessType: 'bakery', count: 2 }],
  })

  assert.equal(model.comboSection.mode, 'fallback')
  assert.equal(model.typeHubs[0]?.label, 'Bakery')
  assert.equal(model.typeHubs[1]?.label, 'Restaurant')
  assert.equal(model.typeHubs[1]?.count, null)
  assert.equal(model.quickCityLinks[0]?.href, '/nearby?state=ME&city=Portland')

  if (model.comboSection.mode === 'fallback') {
    assert.equal(model.comboSection.cityLinks[0]?.href, '/nearby?state=ME&city=Portland')
    assert.equal(model.comboSection.typeLinks[0]?.href, '/nearby?type=bakery')
    assert.match(model.comboSection.description, /city and category hubs/i)
  }
})
