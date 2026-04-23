import test from 'node:test'
import assert from 'node:assert/strict'
import type { DirectoryChef } from '@/lib/directory/actions'
import {
  buildLocationBestForFacets,
  buildLocationExperienceFacets,
  buildCuisineFacets,
  buildDirectorySearchHaystack,
  buildStateFacets,
  filterDirectoryChefs,
  sortDirectoryChefs,
} from '@/lib/directory/utils'

function makeChef(overrides: Partial<DirectoryChef>): DirectoryChef {
  return {
    id: overrides.id || 'chef-1',
    slug: overrides.slug || 'chef-1',
    display_name: overrides.display_name || 'Chef One',
    tagline: overrides.tagline ?? 'Seasonal private dining',
    bio: overrides.bio ?? 'Polished service for in-home events.',
    profile_image_url: overrides.profile_image_url ?? null,
    discovery: {
      cuisine_types: ['italian'],
      service_types: ['private_dinner'],
      price_range: 'premium',
      min_guest_count: 2,
      max_guest_count: 12,
      service_area_city: 'Aspen',
      service_area_state: 'Colorado',
      service_area_zip: '81611',
      service_area_radius_miles: 25,
      service_area_lat: null,
      service_area_lng: null,
      avg_rating: 4.8,
      review_count: 10,
      accepting_inquiries: true,
      next_available_date: '2026-04-10',
      lead_time_days: 5,
      hero_image_url: null,
      highlight_text: 'Luxury dinner parties and retreat dining.',
      source: 'marketplace',
      completeness_score: 0.9,
      ...(overrides.discovery || {}),
    },
    is_founder: overrides.is_founder ?? false,
    distance_miles: overrides.distance_miles ?? null,
    directory_listing_location: overrides.directory_listing_location ?? null,
    location_experiences: overrides.location_experiences,
    partners: overrides.partners ?? [
      {
        id: 'partner-1',
        name: 'River Chalet',
        partner_type: 'venue',
        cover_image_url: null,
        description: 'Mountain venue hosting intimate dinners.',
        booking_url: null,
        partner_locations: [
          {
            id: 'location-1',
            name: 'River Chalet Aspen',
            address: '123 River Road',
            city: 'Aspen',
            state: 'Colorado',
            zip: '81611',
            description: 'Mountain venue hosting intimate dinners.',
            experience_tags: ['outdoor'],
            best_for: ['intimate_dinner'],
            service_types: ['tasting_menu'],
          },
        ],
      },
    ],
  }
}

test('buildDirectorySearchHaystack includes discovery labels and partner text', () => {
  const haystack = buildDirectorySearchHaystack(makeChef({ display_name: 'Chef Lucia' }))

  assert.match(haystack, /chef lucia/)
  assert.match(haystack, /italian/)
  assert.match(haystack, /private dinner/)
  assert.match(haystack, /river chalet/)
  assert.match(haystack, /colorado/)
})

test('filterDirectoryChefs applies cuisine, service, state, price, partner, and accepting filters', () => {
  const chefs = [
    makeChef({ id: 'chef-1', slug: 'chef-1' }),
    makeChef({
      id: 'chef-2',
      slug: 'chef-2',
      display_name: 'Chef Mateo',
      discovery: {
        cuisine_types: ['mexican'],
        service_types: ['catering'],
        price_range: 'mid',
        service_area_state: 'Arizona',
        accepting_inquiries: false,
        completeness_score: 0.8,
      },
      partners: [
        {
          id: 'partner-2',
          name: 'Desert House',
          partner_type: 'airbnb_host',
          cover_image_url: null,
          description: null,
          booking_url: null,
          partner_locations: [
            {
              id: 'location-2',
              name: 'Desert House Scottsdale',
              address: '45 Canyon View',
              city: 'Scottsdale',
              state: 'Arizona',
              zip: '85251',
              description: 'Desert-facing private property.',
              experience_tags: ['event'],
              best_for: ['retreat'],
              service_types: ['family_style'],
            },
          ],
        },
      ],
    }),
  ]

  const filtered = filterDirectoryChefs(chefs, {
    query: 'retreat dining',
    stateFilter: 'colorado',
    cuisineFilter: 'italian',
    serviceTypeFilter: 'private_dinner',
    priceRangeFilter: 'premium',
    partnerTypeFilter: 'venue',
    dietaryFilter: '',
    locationExperienceFilter: '',
    locationBestForFilter: '',
    acceptingOnly: true,
  })

  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].slug, 'chef-1')
})

test('sortDirectoryChefs featured prioritizes founder, then accepting inquiries, then completeness', () => {
  const founder = makeChef({
    id: 'founder',
    slug: 'founder',
    is_founder: true,
    discovery: { completeness_score: 0.4, accepting_inquiries: false },
  })
  const complete = makeChef({
    id: 'complete',
    slug: 'complete',
    display_name: 'Chef Complete',
    discovery: { completeness_score: 1, accepting_inquiries: true },
  })
  const partial = makeChef({
    id: 'partial',
    slug: 'partial',
    display_name: 'Chef Partial',
    discovery: { completeness_score: 0.5, accepting_inquiries: true },
  })

  const sorted = sortDirectoryChefs([partial, founder, complete], 'featured')

  assert.deepEqual(
    sorted.map((chef) => chef.slug),
    ['founder', 'complete', 'partial']
  )
})

test('buildStateFacets and buildCuisineFacets dedupe counts per chef', () => {
  const chefs = [
    makeChef({
      id: 'chef-1',
      partners: [
        {
          id: 'partner-1',
          name: 'River Chalet',
          partner_type: 'venue',
          cover_image_url: null,
          description: null,
          booking_url: null,
          partner_locations: [
            {
              id: 'loc-1',
              name: 'Aspen',
              address: '10 Elk Trail',
              city: 'Aspen',
              state: 'Colorado',
              zip: '81611',
              description: null,
              experience_tags: [],
              best_for: [],
              service_types: [],
            },
            {
              id: 'loc-2',
              name: 'Vail',
              address: '99 Summit Way',
              city: 'Vail',
              state: 'Colorado',
              zip: '81657',
              description: null,
              experience_tags: [],
              best_for: [],
              service_types: [],
            },
          ],
        },
      ],
    }),
    makeChef({
      id: 'chef-2',
      slug: 'chef-2',
      display_name: 'Chef Two',
      discovery: {
        cuisine_types: ['italian', 'mediterranean'],
        service_area_state: 'Colorado',
        completeness_score: 0.85,
      },
      partners: [],
    }),
  ]

  const stateFacets = buildStateFacets(chefs)
  const cuisineFacets = buildCuisineFacets(chefs)
  const colorado = stateFacets.find((facet) => facet.value === 'colorado')
  const italian = cuisineFacets.find((facet) => facet.value === 'italian')

  assert.equal(colorado?.count, 2)
  assert.equal(italian?.count, 2)
})

test('buildLocation facets and filters use the shared public location read model', () => {
  const chefs = [
    makeChef({
      id: 'chef-1',
      location_experiences: [
        {
          id: 'loc-1',
          name: 'River Room',
          address: '123 River Road',
          city: 'Aspen',
          state: 'Colorado',
          zip: '81611',
          booking_url: null,
          description: 'Windowed room for retreats.',
          max_guest_count: 14,
          experience_tags: ['outdoor'],
          best_for: ['retreat'],
          service_types: ['family_style'],
          relationship_type: 'featured',
          is_featured: true,
          sort_order: 0,
          partner: {
            id: 'partner-1',
            name: 'River Chalet',
            partner_type: 'venue',
            description: null,
            booking_url: null,
            cover_image_url: null,
          },
          images: [],
        },
      ],
    }),
  ]

  const experienceFacets = buildLocationExperienceFacets(chefs)
  const bestForFacets = buildLocationBestForFacets(chefs)
  const filtered = filterDirectoryChefs(chefs, {
    query: '',
    stateFilter: '',
    cuisineFilter: '',
    serviceTypeFilter: '',
    dietaryFilter: '',
    priceRangeFilter: '',
    partnerTypeFilter: '',
    locationExperienceFilter: 'outdoor',
    locationBestForFilter: 'retreat',
    acceptingOnly: false,
  })

  assert.equal(experienceFacets.some((facet) => facet.value === 'outdoor'), true)
  assert.equal(bestForFacets.some((facet) => facet.value === 'retreat'), true)
  assert.equal(filtered.length, 1)
})

test('sortDirectoryChefs featured favors richer public location coverage before completeness ties', () => {
  const oneLocation = makeChef({
    id: 'one-location',
    slug: 'one-location',
    display_name: 'Chef One Location',
    discovery: { completeness_score: 0.8, avg_rating: 4.6 },
    location_experiences: [
      {
        id: 'loc-one',
        name: 'One Room',
        address: '1 Main St',
        city: 'Aspen',
        state: 'Colorado',
        zip: '81611',
        booking_url: null,
        description: 'Single setting.',
        max_guest_count: 12,
        experience_tags: ['event'],
        best_for: ['celebration'],
        service_types: ['plated_service'],
        relationship_type: 'featured',
        is_featured: true,
        sort_order: 0,
        partner: {
          id: 'partner-1',
          name: 'River Chalet',
          partner_type: 'venue',
          description: null,
          booking_url: null,
          cover_image_url: null,
        },
        images: [],
      },
    ],
  })
  const twoLocations = makeChef({
    id: 'two-locations',
    slug: 'two-locations',
    display_name: 'Chef Two Locations',
    discovery: { completeness_score: 0.8, avg_rating: 4.6 },
    location_experiences: [
      {
        id: 'loc-a',
        name: 'Courtyard',
        address: '2 Main St',
        city: 'Aspen',
        state: 'Colorado',
        zip: '81611',
        booking_url: null,
        description: 'Courtyard dining.',
        max_guest_count: 16,
        experience_tags: ['outdoor'],
        best_for: ['retreat'],
        service_types: ['family_style'],
        relationship_type: 'featured',
        is_featured: true,
        sort_order: 0,
        partner: {
          id: 'partner-2',
          name: 'Summit House',
          partner_type: 'venue',
          description: null,
          booking_url: null,
          cover_image_url: null,
        },
        images: [],
      },
      {
        id: 'loc-b',
        name: 'Dining Room',
        address: '3 Main St',
        city: 'Aspen',
        state: 'Colorado',
        zip: '81611',
        booking_url: null,
        description: 'Private dining room.',
        max_guest_count: 10,
        experience_tags: ['plated'],
        best_for: ['intimate_dinner'],
        service_types: ['plated_service'],
        relationship_type: 'preferred',
        is_featured: false,
        sort_order: 1,
        partner: {
          id: 'partner-2',
          name: 'Summit House',
          partner_type: 'venue',
          description: null,
          booking_url: null,
          cover_image_url: null,
        },
        images: [],
      },
    ],
  })

  const sorted = sortDirectoryChefs([oneLocation, twoLocations], 'featured')

  assert.deepEqual(
    sorted.map((chef) => chef.slug),
    ['two-locations', 'one-location']
  )
})

test('sortDirectoryChefs featured prioritizes nearer chefs when distance is available', () => {
  const nearChef = makeChef({
    id: 'near',
    slug: 'near',
    display_name: 'Chef Near',
    distance_miles: 8,
  })
  const farChef = makeChef({
    id: 'far',
    slug: 'far',
    display_name: 'Chef Far',
    distance_miles: 42,
  })

  const sorted = sortDirectoryChefs([farChef, nearChef], 'featured')

  assert.deepEqual(
    sorted.map((chef) => chef.slug),
    ['near', 'far']
  )
})
