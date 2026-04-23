import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_NEARBY_RADIUS_MILES,
  MAX_NEARBY_RADIUS_MILES,
  formatDistanceMiles,
  hasNearbyCoordinates,
  normalizeNearbyLocationInput,
  normalizeNearbyRadius,
  normalizeNearbyZipCode,
} from '../../lib/discover/nearby-search'

test('normalizeNearbyLocationInput trims and collapses whitespace', () => {
  assert.equal(normalizeNearbyLocationInput('  Boston   ,   MA  '), 'Boston, MA')
  assert.equal(normalizeNearbyLocationInput(''), '')
  assert.equal(normalizeNearbyLocationInput(null), '')
})

test('normalizeNearbyZipCode keeps canonical five-digit ZIPs', () => {
  assert.equal(normalizeNearbyZipCode('02115'), '02115')
  assert.equal(normalizeNearbyZipCode('02115-1234'), '02115')
  assert.equal(normalizeNearbyZipCode('Boston, MA'), null)
})

test('normalizeNearbyRadius falls back for invalid values and clamps large values', () => {
  assert.equal(normalizeNearbyRadius(undefined), DEFAULT_NEARBY_RADIUS_MILES)
  assert.equal(normalizeNearbyRadius('0'), DEFAULT_NEARBY_RADIUS_MILES)
  assert.equal(normalizeNearbyRadius('12'), 12)
  assert.equal(normalizeNearbyRadius(9999), MAX_NEARBY_RADIUS_MILES)
})

test('hasNearbyCoordinates requires both coordinates to be finite', () => {
  assert.equal(hasNearbyCoordinates(42.36, -71.06), true)
  assert.equal(hasNearbyCoordinates(42.36, Number.NaN), false)
  assert.equal(hasNearbyCoordinates(undefined, -71.06), false)
})

test('formatDistanceMiles formats short and long distances', () => {
  assert.equal(formatDistanceMiles(4.2), '4.2 mi away')
  assert.equal(formatDistanceMiles(12.4), '12 mi away')
  assert.equal(formatDistanceMiles(null), null)
})
