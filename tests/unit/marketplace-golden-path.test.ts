import test from 'node:test'
import assert from 'node:assert/strict'
import type { ConsumerResultCard } from '@/lib/public-consumer/discovery-actions'
import {
  buildMarketplaceBookHref,
  buildMarketplaceDiscoveryFilters,
  chefProfileHref,
  readMarketplaceSearch,
  selectMarketplaceChefMatches,
} from '@/lib/marketplace/golden-path'

test('reads and normalizes marketplace search intent', () => {
  const search = readMarketplaceSearch({
    location: '  Portland, ME  ',
    date: '2026-10-10',
    guests: '8',
    craving: '  tasting menu ',
    dietary: ' gluten-free ',
    budget: 'fine-dining',
  })

  assert.deepEqual(search, {
    location: 'Portland, ME',
    date: '2026-10-10',
    guests: 8,
    craving: 'tasting menu',
    dietary: 'gluten-free',
    budget: 'fine-dining',
  })

  assert.deepEqual(buildMarketplaceDiscoveryFilters(search), {
    intent: 'private_chef',
    fulfillment: 'private_chef',
    location: 'Portland, ME',
    dateWindow: '2026-10-10',
    partySize: 8,
    craving: 'tasting menu',
    dietary: 'gluten-free',
    budget: 'premium',
  })
})

test('carries marketplace context into the real booking request', () => {
  const href = buildMarketplaceBookHref(
    readMarketplaceSearch({
      location: 'Portland, ME',
      date: '2026-10-10',
      guests: '8',
      craving: 'tasting menu',
      dietary: 'gluten-free',
      budget: 'fine-dining',
    })
  )
  const url = new URL(href, 'https://cheflow.test')
  assert.equal(url.pathname, '/book')
  assert.equal(url.searchParams.get('location'), 'Portland, ME')
  assert.equal(url.searchParams.get('event_date'), '2026-10-10')
  assert.equal(url.searchParams.get('guest_count'), '8')
  assert.equal(url.searchParams.get('budget_range'), 'fine-dining')
  assert.equal(url.searchParams.get('dietary_restrictions'), 'gluten-free')
  assert.match(url.searchParams.get('additional_notes') ?? '', /tasting menu/)
})

function card(input: {
  id: string
  score: number
  available?: boolean
  type?: ConsumerResultCard['type']
  chefId?: string
}): ConsumerResultCard {
  return {
    id: input.id,
    type: input.type ?? 'chef',
    title: input.id,
    subtitle: null,
    imageUrl: null,
    eyebrow: 'Private Chef',
    locationLabel: null,
    priceLabel: null,
    dietaryTags: [],
    serviceModes: ['private_dinner'],
    ctaLabel: 'View chef',
    ctaHref: `/chef/${input.id}`,
    profileHref: `/chef/${input.id}`,
    rating: null,
    reviewCount: null,
    isAvailable: input.available ?? true,
    relevanceScore: input.score,
    sourceId: input.id,
    sourceType: input.type ?? 'chef',
    chefId: input.chefId ?? input.id,
  }
}

test('returns no more than three unique accepting chefs ordered by fit', () => {
  const matches = selectMarketplaceChefMatches([
    card({ id: 'b', score: 20 }),
    card({ id: 'a', score: 40 }),
    card({ id: 'c', score: 30 }),
    card({ id: 'd', score: 10 }),
    card({ id: 'closed', score: 99, available: false }),
    card({ id: 'place', score: 100, type: 'listing' }),
    card({ id: 'a-duplicate', score: 35, chefId: 'a' }),
  ])

  assert.deepEqual(
    matches.map((match) => match.id),
    ['a', 'c', 'b']
  )
  assert.equal(chefProfileHref(matches[0]), '/chef/a')
})
