import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDiscoveryImage,
  getDiscoveryCuisineImage,
  getDiscoveryOccasionImage,
  DISCOVERY_CUISINE_IMAGES,
} from '@/lib/discovery/image-map'

test('getDiscoveryCuisineImage returns mapped image for known cuisine', () => {
  const result = getDiscoveryCuisineImage('italian')
  assert.equal(result.src, '/discovery/cuisine/italian.webp')
  assert.equal(result.alt, 'Italian cuisine')
  assert.ok(result.fallbackGradient.includes('linear-gradient'))
})

test('getDiscoveryCuisineImage returns category fallback for unmapped cuisine', () => {
  const result = getDiscoveryCuisineImage('obscure-regional-cuisine')
  assert.equal(result.src, '/discovery/cuisine/_default.webp')
  assert.ok(result.fallbackGradient)
})

test('getDiscoveryOccasionImage returns mapped image for known occasion', () => {
  const result = getDiscoveryOccasionImage('date-night')
  assert.equal(result.src, '/discovery/occasion/date-night.webp')
  assert.equal(result.alt, 'Date night')
  assert.ok(result.fallbackGradient.includes('linear-gradient'))
})

test('getDiscoveryOccasionImage returns gradient fallback for unknown occasion', () => {
  const result = getDiscoveryOccasionImage('unknown-occasion')
  assert.equal(result.src, '/discovery/occasion/_default.webp')
})

test('getDiscoveryImage routes cuisine type to cuisine image', () => {
  const result = getDiscoveryImage('cuisine', 'italian')
  assert.ok(result.src.includes('/cuisine/'))
})

test('getDiscoveryImage routes occasion type to occasion image', () => {
  const result = getDiscoveryImage('occasion', 'date-night')
  assert.ok(result.src.includes('/occasion/'))
})

test('getDiscoveryImage routes vibe type to vibe image', () => {
  const result = getDiscoveryImage('vibe', 'romantic')
  assert.ok(result.src.includes('/vibe/'))
})

test('getDiscoveryImage returns fallback for unknown type', () => {
  const result = getDiscoveryImage('surprise', 'anything')
  assert.ok(result.fallbackGradient)
})

test('DISCOVERY_CUISINE_IMAGES has at least 30 cuisine entries', () => {
  assert.ok(Object.keys(DISCOVERY_CUISINE_IMAGES).length >= 30)
})
