import test from 'node:test'
import assert from 'node:assert/strict'

import {
  curateNearbyCollectionCandidates,
  evaluateNearbyCollectionReadiness,
  NEARBY_COLLECTION_MIN_READY_RESULTS,
} from '../../lib/discover/nearby-collection-readiness'

function createCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: String(overrides.id ?? 'listing-1'),
    name: String(overrides.name ?? 'North End Bakery'),
    status: String(overrides.status ?? 'verified'),
    featured: Boolean(overrides.featured ?? false),
    lead_score: Number(overrides.lead_score ?? 25),
    photo_urls:
      overrides.photo_urls === undefined
        ? ['https://example.com/photo.jpg']
        : (overrides.photo_urls as string[] | null),
    website_url:
      overrides.website_url === undefined
        ? 'https://example.com'
        : (overrides.website_url as string | null),
    description:
      overrides.description === undefined
        ? 'Fresh pastry, breads, coffee, custom cakes, and a neighborhood menu updated every week.'
        : (overrides.description as string | null),
    phone: overrides.phone === undefined ? '617-555-0100' : (overrides.phone as string | null),
    address:
      overrides.address === undefined ? '123 Hanover St' : (overrides.address as string | null),
    city: String(overrides.city ?? 'Boston'),
    state: String(overrides.state ?? 'MA'),
    hours: overrides.hours === undefined ? { mon: '8am-4pm', tue: '8am-4pm' } : overrides.hours,
    menu_url:
      overrides.menu_url === undefined
        ? 'https://example.com/menu'
        : (overrides.menu_url as string | null),
    updated_at:
      overrides.updated_at === undefined
        ? '2026-04-10T12:00:00.000Z'
        : (overrides.updated_at as string | null),
  }
}

test('evaluateNearbyCollectionReadiness passes strong owner-backed listings', () => {
  const readiness = evaluateNearbyCollectionReadiness(createCandidate())

  assert.equal(readiness.isReady, true)
  assert.equal(readiness.hasOwnerConfidence, true)
  assert.ok(readiness.score >= 7)
  assert.ok(readiness.coreSignalCount >= 2)
})

test('evaluateNearbyCollectionReadiness rejects thin claimed listings', () => {
  const readiness = evaluateNearbyCollectionReadiness(
    createCandidate({
      status: 'claimed',
      photo_urls: [],
      website_url: null,
      description: 'Small bakery.',
      phone: null,
      hours: null,
      menu_url: null,
      updated_at: '2025-01-10T12:00:00.000Z',
    })
  )

  assert.equal(readiness.isReady, false)
  assert.ok(readiness.coreSignalCount < 2)
})

test('curateNearbyCollectionCandidates hides weak overflow when enough ready cards exist', () => {
  const ready = Array.from({ length: NEARBY_COLLECTION_MIN_READY_RESULTS }, (_, index) =>
    createCandidate({
      id: `ready-${index + 1}`,
      name: `Ready ${index + 1}`,
      lead_score: 100 - index,
    })
  )
  const weak = createCandidate({
    id: 'weak-1',
    name: 'Weak 1',
    status: 'discovered',
    photo_urls: [],
    website_url: null,
    description: 'Short description.',
    phone: null,
    hours: null,
    menu_url: null,
    updated_at: '2024-01-10T12:00:00.000Z',
  })

  const curated = curateNearbyCollectionCandidates([...ready, weak], 1, 24)

  assert.equal(curated.total, NEARBY_COLLECTION_MIN_READY_RESULTS)
  assert.equal(curated.summary?.mode, 'ready_only')
  assert.equal(curated.summary?.fallbackCount, 0)
  assert.equal(curated.summary?.suppressedCount, 1)
  assert.equal(
    curated.listings.some((listing) => listing.id === 'weak-1'),
    false
  )
})

test('curateNearbyCollectionCandidates backfills near-ready cards when the market is sparse', () => {
  const ready = Array.from({ length: 2 }, (_, index) =>
    createCandidate({
      id: `ready-${index + 1}`,
      name: `Ready ${index + 1}`,
      lead_score: 100 - index,
    })
  )
  const fallback = Array.from({ length: 5 }, (_, index) =>
    createCandidate({
      id: `fallback-${index + 1}`,
      name: `Fallback ${index + 1}`,
      status: 'discovered',
      photo_urls: index < 3 ? ['https://example.com/photo.jpg'] : [],
      website_url: 'https://fallback.example.com',
      description: 'Short summary.',
      phone: null,
      hours: null,
      menu_url: null,
      updated_at: '2026-04-01T12:00:00.000Z',
      lead_score: 50 - index,
    })
  )

  const curated = curateNearbyCollectionCandidates([...ready, ...fallback], 1, 24)

  assert.equal(curated.total, NEARBY_COLLECTION_MIN_READY_RESULTS)
  assert.equal(curated.summary?.mode, 'fallback')
  assert.equal(curated.summary?.readyCount, 2)
  assert.equal(curated.summary?.fallbackCount, 4)
  assert.equal(curated.summary?.suppressedCount, 1)
})
