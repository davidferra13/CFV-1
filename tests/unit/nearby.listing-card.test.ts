import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ListingCard } from '../../app/(public)/nearby/_components/listing-card'
import type { DirectoryListingSummary } from '../../lib/discover/actions'

function createListing(overrides: Partial<DirectoryListingSummary> = {}): DirectoryListingSummary {
  return {
    id: 'listing-1',
    name: 'North End Bakery',
    slug: 'north-end-bakery',
    city: 'Boston',
    state: 'MA',
    cuisine_types: ['desserts'],
    business_type: 'bakery',
    website_url: 'https://example.com',
    status: 'verified',
    price_range: '$$',
    featured: false,
    description: 'Fresh pastry and bread daily.',
    photo_urls: ['https://example.com/photo.jpg'],
    phone: '617-555-0100',
    email: null,
    address: '123 Hanover St',
    hours: null,
    menu_url: null,
    source: 'submission',
    claimed_at: '2026-03-15T12:00:00.000Z',
    updated_at: '2026-04-10T12:00:00.000Z',
    lat: 42.364,
    lon: -71.054,
    lead_score: 82,
    distance_miles: null,
    ...overrides,
  }
}

test('ListingCard shows distance when a location search is active', () => {
  const html = renderToStaticMarkup(
    React.createElement(ListingCard, {
      listing: createListing({ distance_miles: 4.2 }),
    })
  )

  assert.match(html, /4\.2 mi away/)
  assert.match(html, /Boston, MA \| 4\.2 mi away/)
})

test('ListingCard omits distance text when no distance is available', () => {
  const html = renderToStaticMarkup(
    React.createElement(ListingCard, {
      listing: createListing(),
    })
  )

  assert.doesNotMatch(html, /mi away/)
  assert.match(html, /Boston, MA/)
})

test('ListingCard makes discovered trust and freshness cues explicit', () => {
  const html = renderToStaticMarkup(
    React.createElement(ListingCard, {
      listing: createListing({
        status: 'discovered',
        source: 'openstreetmap',
        updated_at: '2025-09-01T12:00:00.000Z',
      }),
    })
  )

  assert.match(html, /Discovered/)
  assert.match(html, /Public-source only/)
  assert.match(html, /Check freshness/)
  assert.match(html, /Older contact details may still need confirmation\./)
})

test('ListingCard shows owner-verified confidence with a concrete update date', () => {
  const html = renderToStaticMarkup(
    React.createElement(ListingCard, {
      listing: createListing({
        status: 'verified',
        updated_at: '2026-04-18T12:00:00.000Z',
      }),
    })
  )

  assert.match(html, /Verified/)
  assert.match(html, /High confidence/)
  assert.match(html, /Updated Apr 18, 2026/)
  assert.match(html, /Freshness is based on the latest owner-backed listing update\./)
})
