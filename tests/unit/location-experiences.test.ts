import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublicLocationExperiences,
  evaluatePublicLocationExperienceReadiness,
  buildLocationExperienceImages,
  normalizeLocationOptionValues,
  normalizeRelationshipType,
  LOCATION_BEST_FOR_OPTIONS,
  LOCATION_EXPERIENCE_TAG_OPTIONS,
} from '@/lib/partners/location-experiences'

test('normalizeLocationOptionValues canonicalizes labels, slugs, and duplicates', () => {
  const tags = normalizeLocationOptionValues(
    ['Food', 'outdoor', 'Outdoor Dining', 'food', 'invalid'],
    LOCATION_EXPERIENCE_TAG_OPTIONS
  )
  const bestFor = normalizeLocationOptionValues(
    ['Intimate dinner', 'large_group', 'Large Group', 'unknown'],
    LOCATION_BEST_FOR_OPTIONS
  )

  assert.deepEqual(tags, ['food', 'outdoor'])
  assert.deepEqual(bestFor, ['intimate_dinner', 'large_group'])
})

test('normalizeRelationshipType falls back safely when the value is unknown', () => {
  assert.equal(normalizeRelationshipType('Available on request'), 'available_on_request')
  assert.equal(normalizeRelationshipType('Exclusive'), 'exclusive')
  assert.equal(normalizeRelationshipType(''), 'preferred')
  assert.equal(normalizeRelationshipType('not_real'), 'preferred')
})

test('buildLocationExperienceImages prefers location images before broader fallbacks', () => {
  const images = [
    {
      id: 'img-general',
      image_url: 'https://example.com/general.jpg',
      caption: 'General',
      season: null,
      display_order: 3,
      location_id: null,
    },
    {
      id: 'img-location',
      image_url: 'https://example.com/location.jpg',
      caption: 'Location',
      season: 'summer',
      display_order: 1,
      location_id: 'loc-1',
    },
  ]

  const scoped = buildLocationExperienceImages({
    locationId: 'loc-1',
    images,
    coverImageUrl: 'https://example.com/cover.jpg',
  })
  const fallback = buildLocationExperienceImages({
    locationId: 'loc-2',
    images,
    coverImageUrl: 'https://example.com/cover.jpg',
  })
  const coverOnly = buildLocationExperienceImages({
    locationId: 'loc-3',
    images: [],
    coverImageUrl: 'https://example.com/cover.jpg',
  })

  assert.equal(scoped[0]?.id, 'img-location')
  assert.equal(fallback[0]?.id, 'img-general')
  assert.equal(coverOnly[0]?.image_url, 'https://example.com/cover.jpg')
})

test('evaluatePublicLocationExperienceReadiness fails closed when core public context is missing', () => {
  const missingContext = evaluatePublicLocationExperienceReadiness({
    name: 'Ridge House',
    city: 'Aspen',
    state: 'Colorado',
    description: null,
    images: [],
    experience_tags: [],
    best_for: [],
    service_types: [],
  })
  const ready = evaluatePublicLocationExperienceReadiness({
    name: 'Ridge House',
    city: 'Aspen',
    state: 'Colorado',
    description: 'A ridge-top venue built for private dining.',
    images: [],
    experience_tags: ['event'],
    best_for: ['retreat'],
    service_types: ['family_style'],
  })

  assert.equal(missingContext.isReady, false)
  assert.deepEqual(missingContext.blockers, ['missing_context'])
  assert.equal(ready.isReady, true)
  assert.deepEqual(ready.blockers, [])
})

test('buildPublicLocationExperiences excludes hidden and not-ready locations', () => {
  const experiences = buildPublicLocationExperiences(
    [
      {
        id: 'partner-1',
        name: 'River House',
        partner_type: 'venue',
        description: 'Mountain venue',
        booking_url: null,
        cover_image_url: null,
        partner_images: [],
        partner_locations: [
          {
            id: 'loc-ready',
            name: 'River Room',
            city: 'Aspen',
            state: 'Colorado',
            description: 'Windowed dining room with plated-service setup.',
            experience_tags: ['plated'],
            best_for: ['intimate_dinner'],
            service_types: ['plated_service'],
            is_active: true,
          },
          {
            id: 'loc-hidden',
            name: 'Private Loft',
            city: 'Aspen',
            state: 'Colorado',
            description: 'Invite-only loft.',
            experience_tags: ['event'],
            best_for: ['celebration'],
            service_types: ['cocktail_reception'],
            is_active: true,
          },
          {
            id: 'loc-not-ready',
            name: 'Empty Shell',
            city: 'Aspen',
            state: 'Colorado',
            description: null,
            experience_tags: [],
            best_for: [],
            service_types: [],
            is_active: true,
          },
        ],
      },
    ],
    [
      {
        location_id: 'loc-ready',
        relationship_type: 'featured',
        is_public: true,
        is_featured: true,
        sort_order: 0,
      },
      {
        location_id: 'loc-hidden',
        relationship_type: 'preferred',
        is_public: false,
        is_featured: false,
        sort_order: 1,
      },
      {
        location_id: 'loc-not-ready',
        relationship_type: 'preferred',
        is_public: true,
        is_featured: false,
        sort_order: 2,
      },
    ]
  )

  assert.deepEqual(
    experiences.map((experience) => experience.id),
    ['loc-ready']
  )
})
