import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNearbyListingTrustModel,
  shouldShowNearbyClaimFlow,
} from '../../lib/discover/nearby-detail-metadata'

const NOW = new Date('2026-04-20T12:00:00.000Z')

test('discovered listings expose public-source labels across the user-facing fields', () => {
  const model = buildNearbyListingTrustModel(
    {
      status: 'discovered',
      source: 'openstreetmap',
      created_at: '2026-01-15T00:00:00.000Z',
      updated_at: '2026-03-12T00:00:00.000Z',
      claimed_at: null,
      website_url: 'https://example.com',
      menu_url: 'https://example.com/menu',
      address: '123 Main St',
      city: 'Boston',
      state: 'MA',
      phone: '555-123-4567',
      email: 'hello@example.com',
      description: 'Seasonal neighborhood restaurant.',
      photo_urls: ['https://example.com/photo.jpg'],
      hours: { Monday: '9 AM - 5 PM' },
    },
    NOW
  )

  assert.equal(model.showClaimFlow, true)
  assert.match(model.summary, /Compiled from OpenStreetMap\./)
  assert.deepEqual(
    model.fieldItems.map((item) => item.key),
    ['status', 'photos', 'menu', 'contact', 'hours']
  )
  assert.equal(model.fieldItems[0]?.trust.badge, 'Public source')
  assert.equal(model.fieldItems[2]?.trust.badge, 'Public source')
  assert.equal(model.fieldItems[4]?.trust.badge, 'Public source')
})

test('stale public menu links are downgraded to needs-confirmation instead of shown as current', () => {
  const model = buildNearbyListingTrustModel(
    {
      status: 'discovered',
      source: 'manual',
      created_at: '2025-01-15T00:00:00.000Z',
      updated_at: '2025-08-12T00:00:00.000Z',
      claimed_at: null,
      website_url: 'https://example.com',
      menu_url: 'https://example.com/menu',
      address: '123 Main St',
      city: 'Boston',
      state: 'MA',
      phone: null,
      email: null,
      description: null,
      photo_urls: [],
      hours: null,
    },
    NOW
  )

  const menu = model.fieldItems.find((item) => item.key === 'menu')
  assert.ok(menu)
  assert.equal(menu?.trust.badge, 'Needs confirmation')
  assert.equal(menu?.trust.suppress, true)
})

test('verified listings keep owner-verified status but can still warn on stale hours', () => {
  const model = buildNearbyListingTrustModel(
    {
      status: 'verified',
      source: 'submission',
      created_at: '2025-10-01T00:00:00.000Z',
      updated_at: '2025-10-15T00:00:00.000Z',
      claimed_at: '2025-10-10T00:00:00.000Z',
      website_url: 'https://example.com',
      menu_url: null,
      address: '500 Market St',
      city: 'San Francisco',
      state: 'CA',
      phone: '555-999-0000',
      email: null,
      description: null,
      photo_urls: [],
      hours: { Monday: '9 AM - 5 PM' },
    },
    NOW
  )

  const status = model.fieldItems.find((item) => item.key === 'status')
  const hours = model.fieldItems.find((item) => item.key === 'hours')

  assert.equal(model.showClaimFlow, false)
  assert.equal(status?.trust.badge, 'Owner verified')
  assert.equal(hours?.trust.badge, 'Needs confirmation')
  assert.match(hours?.trust.evidence ?? '', /Confirm hours before visiting\./)

  assert.equal(shouldShowNearbyClaimFlow('discovered'), true)
  assert.equal(shouldShowNearbyClaimFlow('claimed'), false)
  assert.equal(shouldShowNearbyClaimFlow('verified'), false)
  assert.equal(shouldShowNearbyClaimFlow('pending_submission'), false)
})
