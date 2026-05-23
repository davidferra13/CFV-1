import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublicChefShowcase,
  derivePublicServicePackages,
  deriveShowcaseReadiness,
} from '@/lib/showcase/public-read-model'
import type { PublicChefBuyerSignals } from '@/lib/public/chef-profile-readiness'

function buyerSignals(
  overrides: {
    pricing?: Partial<PublicChefBuyerSignals['pricing']>
    service?: Partial<PublicChefBuyerSignals['service']>
    operations?: Partial<PublicChefBuyerSignals['operations']>
    verification?: Partial<PublicChefBuyerSignals['verification']>
  } = {}
): PublicChefBuyerSignals {
  return {
    pricing: {
      startingPriceCents: null,
      dinnerLowCents: null,
      dinnerHighCents: null,
      mealPrepLowCents: null,
      mealPrepHighCents: null,
      cookAndLeaveRateCents: null,
      minimumBookingCents: null,
      minimumSpendCents: null,
      depositType: null,
      depositPercent: null,
      depositFixedCents: null,
      ...overrides.pricing,
    },
    service: {
      includedItems: [],
      staffingItems: [],
      equipmentItems: [],
      dietaryItems: [],
      communicationItems: [],
      extraItems: [],
      travelRadiusMiles: null,
      travelFeeCents: null,
      minimumGuests: null,
      guestCountDeadlineDays: null,
      groceriesIncluded: null,
      gratuityPolicy: null,
      hasCancellationPolicy: null,
      cancellationTerms: null,
      hasReschedulePolicy: null,
      rescheduleTerms: null,
      customWhatsIncluded: null,
      customCleanupNote: null,
      customTravelNote: null,
      customDietaryNote: null,
      customGratuityNote: null,
      customIntroPitch: null,
      selfReportedInsurance: false,
      ...overrides.service,
    },
    operations: {
      responseTime: null,
      lastActiveAt: null,
      ...overrides.operations,
    },
    verification: {
      badges: [],
      activeInsuranceCount: 0,
      activeCertificationCount: 0,
      ...overrides.verification,
    },
  }
}

const emptyReviewFeed = {
  reviews: [],
  stats: {
    totalReviews: 0,
    averageRating: 0,
    platformBreakdown: [],
  },
}

test('derives honest public packages from published buyer signals', () => {
  const packages = derivePublicServicePackages(
    buyerSignals({
      pricing: { dinnerLowCents: 12500, dinnerHighCents: 17500 },
      service: {
        includedItems: ['Grocery shopping', 'Cleanup'],
        minimumGuests: 6,
        hasCancellationPolicy: true,
      },
    })
  )

  assert.equal(packages[0].id, 'private-dinner')
  assert.equal(packages[0].priceLabel, 'Starting $125/person to $175/person')
  assert.deepEqual(packages[0].inclusions, ['Grocery shopping', 'Cleanup'])
  assert.match(packages[0].constraints.join(' '), /6 guest minimum/)
})

test('falls back to a custom inquiry package without inventing pricing', () => {
  const packages = derivePublicServicePackages(buyerSignals())

  assert.equal(packages.length, 1)
  assert.equal(packages[0].id, 'custom-event')
  assert.equal(packages[0].priceLabel, 'Quote after scope review')
})

test('public showcase filters unpublished source objects and hidden website links', () => {
  const showcase = buildPublicChefShowcase({
    chef: {
      bio: 'Seasonal private dinners.',
      website_url: 'https://example.com',
      show_website_on_public_profile: false,
      social_links: { instagram: 'https://instagram.com/chef' },
      discovery: { accepting_inquiries: true },
    },
    buyerSignals: buyerSignals({
      pricing: { dinnerLowCents: 9900, dinnerHighCents: null },
    }),
    reviewFeed: {
      ...emptyReviewFeed,
      reviews: [
        {
          id: 'r1',
          kind: 'guest_testimonial',
          sourceLabel: 'Guest',
          sourceUrl: null,
          reviewerName: 'Guest',
          rating: 5,
          reviewText: 'Excellent dinner.',
          reviewDate: '2026-01-01',
          isFeatured: true,
          isVerifiedEvent: true,
        },
      ],
      stats: { ...emptyReviewFeed.stats, totalReviews: 1, averageRating: 5 },
    },
    portfolioEntries: [{ isPublic: true }, { isPublic: false }],
    workHistory: [{ is_public: true }, { is_public: false }],
    achievements: [{}],
  })

  assert.equal(showcase.portfolioCount, 1)
  assert.equal(showcase.workHistoryCount, 1)
  assert.deepEqual(showcase.links, ['https://instagram.com/chef'])
  assert.equal(showcase.proof.featuredReviewText, 'Excellent dinner.')
})

test('readiness remains draft for thin unsafe profiles', () => {
  const readiness = deriveShowcaseReadiness(
    {
      packages: [],
      proof: { reviewCount: 0, averageRating: 0, featuredReviewText: null },
      links: [],
      portfolioCount: 0,
      workHistoryCount: 0,
      menuCount: 0,
    },
    { bio: null, tagline: null }
  )

  assert.equal(readiness.status, 'draft')
  assert.ok(readiness.missing.includes('public URL and bio'))
})
