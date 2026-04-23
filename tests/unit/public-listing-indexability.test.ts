import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateDirectoryListingIndexability,
  type DirectoryListingIndexabilityCandidate,
} from '../../lib/discover/public-listing-indexability'

function makeCandidate(
  overrides: Partial<DirectoryListingIndexabilityCandidate> = {}
): DirectoryListingIndexabilityCandidate {
  return {
    status: 'discovered',
    claimed_at: null,
    updated_at: '2026-04-20T12:00:00.000Z',
    city: null,
    state: null,
    description: null,
    address: null,
    phone: null,
    email: null,
    website_url: null,
    menu_url: null,
    hours: null,
    photo_urls: [],
    price_range: null,
    ...overrides,
  }
}

test('verified listings can index once they have location plus a few useful details', () => {
  const result = evaluateDirectoryListingIndexability(
    makeCandidate({
      status: 'verified',
      updated_at: '2026-04-01T12:00:00.000Z',
      address: '123 Main St',
      website_url: 'https://example.com',
      hours: { Monday: '9:00 AM - 5:00 PM' },
    })
  )

  assert.equal(result.indexable, true)
  assert.equal(result.reason, 'verified_listing')
})

test('claimed listings become indexable after enough owner-facing detail and a recent update', () => {
  const result = evaluateDirectoryListingIndexability(
    makeCandidate({
      status: 'claimed',
      claimed_at: '2026-04-10T12:00:00.000Z',
      updated_at: '2026-04-18T12:00:00.000Z',
      address: '123 Main St',
      website_url: 'https://example.com',
      description: 'Seasonal seafood and pasta in a small dining room.',
      menu_url: 'https://example.com/menu',
      hours: { Monday: '9:00 AM - 5:00 PM' },
    })
  )

  assert.equal(result.indexable, true)
  assert.equal(result.reason, 'claimed_listing_ready')
})

test('claimed listings stay noindex when the claim marker is missing', () => {
  const result = evaluateDirectoryListingIndexability(
    makeCandidate({
      status: 'claimed',
      updated_at: '2026-04-18T12:00:00.000Z',
      address: '123 Main St',
      phone: '(555) 123-4567',
      description: 'Seasonal seafood and pasta in a small dining room.',
      hours: { Monday: '9:00 AM - 5:00 PM' },
      photo_urls: ['https://example.com/photo.jpg'],
    })
  )

  assert.equal(result.indexable, false)
  assert.equal(result.reason, 'missing_claim_timestamp')
})

test('claimed listings stay noindex when the owner profile has gone stale', () => {
  const result = evaluateDirectoryListingIndexability(
    makeCandidate({
      status: 'claimed',
      claimed_at: '2025-09-10T12:00:00.000Z',
      updated_at: '2025-09-10T12:00:00.000Z',
      address: '123 Main St',
      website_url: 'https://example.com',
      description: 'Seasonal seafood and pasta in a small dining room.',
      hours: { Monday: '9:00 AM - 5:00 PM' },
      photo_urls: ['https://example.com/photo.jpg'],
    })
  )

  assert.equal(result.indexable, false)
  assert.equal(result.reason, 'listing_stale')
})

test('claimed listings stay noindex when the page still lacks enough useful detail', () => {
  const result = evaluateDirectoryListingIndexability(
    makeCandidate({
      status: 'claimed',
      claimed_at: '2026-04-10T12:00:00.000Z',
      updated_at: '2026-04-18T12:00:00.000Z',
      city: 'Boston',
      state: 'MA',
      website_url: 'https://example.com',
    })
  )

  assert.equal(result.indexable, false)
  assert.equal(result.reason, 'insufficient_detail')
})

test('public-source listings stay noindex even when they look complete', () => {
  const result = evaluateDirectoryListingIndexability(
    makeCandidate({
      status: 'discovered',
      updated_at: '2026-04-18T12:00:00.000Z',
      address: '123 Main St',
      phone: '(555) 123-4567',
      description: 'Seasonal seafood and pasta in a small dining room.',
      menu_url: 'https://example.com/menu',
      hours: { Monday: '9:00 AM - 5:00 PM' },
      photo_urls: ['https://example.com/photo.jpg'],
    })
  )

  assert.equal(result.indexable, false)
  assert.equal(result.reason, 'status_requires_noindex')
})
