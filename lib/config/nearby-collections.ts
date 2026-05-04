import type { BusinessType, CuisineCategory, PriceRange } from '@/lib/discover/constants'

export type NearbyCollectionFilters = {
  query?: string
  businessType?: BusinessType
  cuisine?: CuisineCategory
  state?: string
  city?: string
  priceRange?: PriceRange
}

export type NearbyCollectionDefinition = {
  slug: string
  title: string
  eyebrow: string
  description: string
  intro: string
  filters: NearbyCollectionFilters
  featuredOnLanding?: boolean
}

// Add new collections here. Each definition only uses the filters /nearby already supports,
// so collections stay config-backed and do not need extra schema or admin tooling for v1.
export const NEARBY_COLLECTIONS = [
  {
    slug: 'best-bakeries-boston',
    title: 'Best Bakeries in Boston',
    eyebrow: 'Curated bakery path',
    description:
      'A pastry-first starting point for Boston bakery browsing, built on the live Nearby directory.',
    intro:
      'Start here when you want a tighter Boston bakery view instead of the full city directory.',
    filters: {
      businessType: 'bakery',
      state: 'MA',
      city: 'Boston',
    },
    featuredOnLanding: true,
  },
  {
    slug: 'caterers-in-austin',
    title: 'Caterers in Austin',
    eyebrow: 'Curated catering path',
    description:
      'An Austin catering collection for visitors who want event-ready operators without a cold start.',
    intro:
      'This collection narrows Nearby to Austin caterers so planners can browse a focused list right away.',
    filters: {
      businessType: 'caterer',
      state: 'TX',
      city: 'Austin',
    },
    featuredOnLanding: true,
  },
  {
    slug: 'private-chefs-in-miami',
    title: 'Private Chefs in Miami',
    eyebrow: 'Curated chef path',
    description: 'A Miami private-chef browse path layered on top of the live Nearby inventory.',
    intro:
      'Use this collection for a Miami private-chef starting point, then switch into the booking flow if you need a direct match.',
    filters: {
      businessType: 'private_chef',
      state: 'FL',
      city: 'Miami',
    },
    featuredOnLanding: true,
  },
  {
    slug: 'food-trucks-in-denver',
    title: 'Food Trucks in Denver',
    eyebrow: 'Curated truck path',
    description:
      'A Denver food-truck collection for quick browsing across mobile operators and pop-up service styles.',
    intro:
      'This keeps the browse focused on Denver food trucks while preserving the normal Nearby filter model underneath.',
    filters: {
      businessType: 'food_truck',
      state: 'CO',
      city: 'Denver',
    },
    featuredOnLanding: true,
  },
  {
    slug: 'seafood-spots-in-seattle',
    title: 'Seafood Spots in Seattle',
    eyebrow: 'Curated cuisine path',
    description:
      'A Seattle seafood collection for visitors who want a cuisine-led browse path instead of a generic city sweep.',
    intro:
      'Open this collection when the cuisine matters more than the business model and you want Seattle-specific results.',
    filters: {
      cuisine: 'seafood',
      state: 'WA',
      city: 'Seattle',
    },
    featuredOnLanding: true,
  },
  {
    slug: 'italian-in-new-york-city',
    title: 'Italian in New York City',
    eyebrow: 'Curated cuisine path',
    description:
      'A New York City Italian collection that turns the full directory into a tighter destination-style browse.',
    intro:
      'Use this collection for a cuisine-led New York browse path while still relying on the same live Nearby data.',
    filters: {
      cuisine: 'italian',
      state: 'NY',
      city: 'New York',
    },
    featuredOnLanding: true,
  },
  {
    slug: 'meal-prep-in-san-diego',
    title: 'Meal Prep in San Diego',
    eyebrow: 'Curated meal prep path',
    description:
      'A San Diego meal-prep collection for recurring-order and ready-to-eat focused browsing.',
    intro:
      'This collection helps users jump directly into meal-prep operators instead of starting from every San Diego listing.',
    filters: {
      businessType: 'meal_prep',
      state: 'CA',
      city: 'San Diego',
    },
  },
  {
    slug: 'bbq-in-kansas-city',
    title: 'BBQ in Kansas City',
    eyebrow: 'Curated cuisine path',
    description:
      'A Kansas City BBQ browse path built for visitors who want a cuisine-specific destination page.',
    intro:
      'This collection uses the existing Nearby filters to anchor Kansas City BBQ into its own browseable destination.',
    filters: {
      cuisine: 'bbq',
      state: 'MO',
      city: 'Kansas City',
    },
  },
] satisfies readonly NearbyCollectionDefinition[]
