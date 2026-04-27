// Public Chef Profile & Partner Showcase
// No authentication required - accessible to anyone with the URL
// Shows chef bio, partner venues with seasonal photos, and booking links

import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LocationExperienceShowcase } from '@/components/public/location-experience-showcase'
import { ReviewShowcase } from '@/components/public/review-showcase'
import { CloudinaryFetchImage } from '@/components/ui/cloudinary-fetch-image'
import {
  getDiscoveryCuisineLabel,
  getDiscoveryPriceRangeLabel,
  getDiscoveryServiceTypeLabel,
} from '@/lib/discovery/constants'
import {
  getDiscoveryAvailabilityLabel,
  getDiscoveryGuestCountLabel,
  getDiscoveryLeadTimeLabel,
  getDiscoveryLocationLabel,
} from '@/lib/discovery/profile'
import { getOptimizedAvatar, getOptimizedImageUrl } from '@/lib/images/cloudinary'
import { getPublicAvailabilitySignals } from '@/lib/calendar/entry-actions'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'
import { ChefProofSummary } from '@/components/public/chef-proof-summary'
import { ChefCredentialsPanel } from '@/components/public/chef-credentials-panel'
import { DietaryTrustStrip } from '@/components/public/dietary-trust-strip'
import { ChefAvailabilityWaitlist } from '@/components/public/chef-availability-waitlist'
import {
  getPublicWorkHistory,
  getPublicAchievements,
  getPublicCharityImpact,
} from '@/lib/credentials/actions'
import { getPublicPortfolio } from '@/lib/events/photo-actions'
import { getUpcomingPublicEvents } from '@/lib/tickets/purchase-actions'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { getCurrentUser } from '@/lib/auth/get-user'
import { triggerVisitorAlert } from '@/lib/activity/visitor-alert'
import {
  getPublicChefBuyerSignals,
  getPublicShowcaseMenus,
} from '@/lib/public/chef-profile-readiness'
import { absoluteUrl } from '@/lib/site/public-site'

type Props = { params: { slug: string } }

function hasMinimumPublicProfileContent(input: {
  displayName: string
  bio: string | null
  tagline: string | null
}): boolean {
  const displayName = input.displayName?.trim() || ''
  const isEmailPrefix = displayName.includes('@') || /^[a-z0-9]+$/i.test(displayName)
  return Boolean((input.bio || input.tagline) && !isEmailPrefix)
}

function clampText(text: string, maxLength = 180): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized
    .slice(0, maxLength - 3)
    .trimEnd()
    .replace(/[,:;.\-]+$/, '')}...`
}

function formatStartingPrice(
  basePriceCents: number | null,
  pricingType: 'flat_rate' | 'per_person' | null
): string | null {
  if (!basePriceCents) return null
  return `${formatCurrency(basePriceCents)}/${pricingType === 'per_person' ? 'person' : 'booking'}`
}

function buildMetadataDescription(input: {
  chefName: string
  highlightText: string | null
  tagline: string | null
  bio: string | null
  locationLabel: string | null
  cuisineLabels: string[]
  startingPriceLabel: string | null
  priceRangeLabel: string | null
  averageRating: number | null
  reviewCount: number | null
}): string {
  const leadText = [input.highlightText, input.tagline, input.bio].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  )

  const facts: string[] = []
  if (input.locationLabel) facts.push(`Service area: ${input.locationLabel}`)
  if (input.cuisineLabels.length > 0) {
    facts.push(`Cuisines: ${input.cuisineLabels.slice(0, 3).join(', ')}`)
  }
  if (input.startingPriceLabel) {
    facts.push(`Pricing from ${input.startingPriceLabel}`)
  } else if (input.priceRangeLabel) {
    facts.push(`Price positioning: ${input.priceRangeLabel}`)
  }
  if ((input.reviewCount ?? 0) > 0 && (input.averageRating ?? 0) > 0) {
    facts.push(`${input.averageRating!.toFixed(1)} stars across ${input.reviewCount} reviews`)
  }

  const fallback = `View ${input.chefName}'s private chef profile with pricing guidance, service details, and inquiry options on ChefFlow.`
  return clampText(
    [leadText, facts.length > 0 ? `${facts.join('. ')}.` : null, fallback].filter(Boolean).join(' ')
  )
}

function formatLongDate(dateValue: string | null): string | null {
  if (!dateValue) return null
  const parsed = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  const publicSlug = data.chef.public_slug || params.slug
  const profileUrl = absoluteUrl(`/chef/${publicSlug}`)
  const title = `${data.chef.display_name} | Private Chef Profile`
  const imageUrl = data.chef.discovery.hero_image_url || data.chef.profile_image_url || undefined
  const hasMinimumContent = hasMinimumPublicProfileContent({
    displayName: data.chef.display_name,
    bio: data.chef.bio,
    tagline: data.chef.tagline,
  })

  if (!hasMinimumContent) {
    return {
      title: 'Profile Coming Soon',
      description: `${data.chef.display_name} is setting up their public chef profile on ChefFlow.`,
      alternates: {
        canonical: profileUrl,
      },
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const description = buildMetadataDescription({
    chefName: data.chef.display_name,
    highlightText: data.chef.discovery.highlight_text,
    tagline: data.chef.tagline,
    bio: data.chef.bio,
    locationLabel: getDiscoveryLocationLabel(data.chef.discovery),
    cuisineLabels: data.chef.discovery.cuisine_types.map(getDiscoveryCuisineLabel),
    startingPriceLabel: formatStartingPrice(
      data.chef.booking_base_price_cents,
      data.chef.booking_pricing_type
    ),
    priceRangeLabel: data.chef.discovery.price_range
      ? getDiscoveryPriceRangeLabel(data.chef.discovery.price_range)
      : null,
    averageRating: data.chef.discovery.avg_rating ?? null,
    reviewCount: data.chef.discovery.review_count ?? null,
  })

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: 'ChefFlow',
      type: 'profile',
      ...(imageUrl ? { images: [{ url: imageUrl, alt: data.chef.display_name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    alternates: {
      canonical: profileUrl,
    },
  }
}

function buildServiceOffer(input: {
  name: string
  lowCents: number | null
  highCents: number | null
  unitText?: string
  description?: string
}): Record<string, unknown> | null {
  const low = input.lowCents
  const high = input.highCents
  if (low == null && high == null) return null

  const offer =
    low != null && high != null && low !== high
      ? ({
          '@type': 'AggregateOffer',
          lowPrice: (low / 100).toFixed(2),
          highPrice: (high / 100).toFixed(2),
          offerCount: 2,
          priceCurrency: 'USD',
        } satisfies Record<string, unknown>)
      : ({
          '@type': 'Offer',
          price: ((low ?? high)! / 100).toFixed(2),
          priceCurrency: 'USD',
        } satisfies Record<string, unknown>)

  return {
    ...offer,
    itemOffered: {
      '@type': 'Service',
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      ...(input.unitText ? { unitText: input.unitText } : {}),
    },
  }
}

function ChefProfileJsonLd({
  chefName,
  description,
  profileUrl,
  imageUrl,
  cuisines,
  serviceTypes,
  sameAs,
  serviceArea,
  priceRange,
  dinnerLowCents,
  dinnerHighCents,
  mealPrepLowCents,
  mealPrepHighCents,
  cookAndLeaveRateCents,
  averageRating,
  totalReviews,
}: {
  chefName: string
  description: string | null
  profileUrl: string
  imageUrl: string | null
  cuisines: string[]
  serviceTypes: string[]
  sameAs: string[]
  serviceArea: string | null
  priceRange: string | null
  dinnerLowCents: number | null
  dinnerHighCents: number | null
  mealPrepLowCents: number | null
  mealPrepHighCents: number | null
  cookAndLeaveRateCents: number | null
  averageRating: number
  totalReviews: number
}) {
  const serviceOffers = [
    buildServiceOffer({
      name: 'Private dinner service',
      lowCents: dinnerLowCents,
      highCents: dinnerHighCents,
      unitText: 'person',
    }),
    buildServiceOffer({
      name: 'Meal prep service',
      lowCents: mealPrepLowCents,
      highCents: mealPrepHighCents,
    }),
    buildServiceOffer({
      name: 'Cook-and-leave service',
      lowCents: cookAndLeaveRateCents,
      highCents: null,
    }),
  ].filter((offer): offer is Record<string, unknown> => Boolean(offer))

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FoodService',
    name: chefName,
    url: profileUrl,
    ...(description ? { description } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(cuisines.length > 0 ? { servesCuisine: cuisines } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(cuisines.length + serviceTypes.length > 0
      ? { knowsAbout: [...new Set([...cuisines, ...serviceTypes])] }
      : {}),
    ...(serviceArea
      ? {
          areaServed: {
            '@type': 'Place',
            name: serviceArea,
          },
        }
      : {}),
    ...(priceRange ? { priceRange } : {}),
    ...(serviceOffers.length > 0
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: `${chefName} services`,
            itemListElement: serviceOffers,
          },
        }
      : {}),
  }

  if (totalReviews > 0 && averageRating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(2),
      bestRating: '5',
      worstRating: '1',
      reviewCount: totalReviews,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

function ChefBreadcrumbJsonLd({ chefName, profileUrl }: { chefName: string; profileUrl: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Chef Directory', item: absoluteUrl('/chefs') },
      { '@type': 'ListItem', position: 3, name: chefName, item: profileUrl },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

function DetailChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200">
      {label}
    </span>
  )
}

function DetailRows({
  rows,
}: {
  rows: Array<{ label: string; value: string | null; emptyText?: string }>
}) {
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {rows.map((row) => {
        const hasValue = Boolean(row.value)
        return (
          <div key={row.label} className="flex items-start justify-between gap-3">
            <dt className="text-stone-400">{row.label}</dt>
            <dd
              className={[
                'max-w-[58%] text-right leading-relaxed',
                hasValue ? 'text-stone-200' : 'text-stone-500',
              ].join(' ')}
            >
              {row.value || row.emptyText || 'Not published yet.'}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function formatRange(
  lowCents: number | null,
  highCents: number | null,
  suffix = ''
): string | null {
  if (lowCents && highCents && lowCents !== highCents) {
    return `${formatCurrency(lowCents)}${suffix} to ${formatCurrency(highCents)}${suffix}`
  }

  const singleValue = lowCents ?? highCents
  return singleValue ? `${formatCurrency(singleValue)}${suffix}` : null
}

function formatDepositPolicy(input: {
  depositType: 'percent' | 'fixed' | null
  depositPercent: number | null
  depositFixedCents: number | null
}): string {
  if (input.depositType === 'fixed' && input.depositFixedCents) {
    return `${formatCurrency(input.depositFixedCents)} deposit to hold the date`
  }

  if (typeof input.depositPercent === 'number' && input.depositPercent > 0) {
    return `${input.depositPercent}% deposit to hold the date`
  }

  return 'Deposit policy not published yet.'
}

function formatLastActive(dateValue: string | null): string {
  if (!dateValue) return 'Not published yet'

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return 'Not published yet'

  const diffMs = Date.now() - parsed.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Active today'
  if (diffDays === 1) return 'Active yesterday'
  if (diffDays < 7) return `Active ${diffDays} days ago`
  if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)} week${diffDays < 14 ? '' : 's'} ago`

  return `Last active ${parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`
}

function formatGratuityPolicy(value: 'not_expected' | 'appreciated' | 'included' | null): string {
  if (value === 'included') return 'Gratuity is included in pricing.'
  if (value === 'appreciated') return 'Gratuity is appreciated, not required.'
  if (value === 'not_expected') return 'Gratuity is not expected.'
  return 'Gratuity policy not published yet.'
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]
}

function formatMenuGuestRange(values: Array<number | null | undefined>): string | null {
  const guestCounts = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
  )

  if (guestCounts.length === 0) return null

  const low = Math.min(...guestCounts)
  const high = Math.max(...guestCounts)
  return low === high ? `${low} guests` : `${low}-${high} guests`
}

export default async function ChefProfilePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const { chef, locationExperiences, ownedRestaurants } = data

  const hasMinimumContent = hasMinimumPublicProfileContent({
    displayName: chef.display_name,
    bio: chef.bio,
    tagline: chef.tagline,
  })
  if (!hasMinimumContent) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-stone-500">?</span>
          </div>
          <h1 className="text-xl font-semibold text-stone-100 mb-2">Profile Coming Soon</h1>
          <p className="text-sm text-stone-400">
            This chef is setting up their profile. Check back soon for their full portfolio, menu
            offerings, and booking details.
          </p>
        </div>
      </div>
    )
  }

  // Non-blocking: notify chef when a known client views their public profile
  getCurrentUser()
    .then((user) => {
      if (user?.role === 'client' && user.tenantId === chef.id && user.entityId) {
        triggerVisitorAlert({
          tenantId: chef.id,
          clientId: user.entityId,
          clientName: '',
          eventType: 'public_profile_viewed',
        }).catch(() => {})
      }
    })
    .catch(() => {})
  const publicSlug = chef.public_slug || params.slug
  const inquirySlug = chef.inquiry_slug || publicSlug

  const [
    reviewFeed,
    availabilitySignals,
    workHistory,
    achievements,
    charityImpact,
    portfolio,
    chefCredFields,
    upcomingEvents,
    buyerSignals,
    showcaseMenus,
  ] = await Promise.all([
    getPublicChefReviewFeed(chef.id),
    chef.show_availability_signals ? getPublicAvailabilitySignals(chef.id) : Promise.resolve([]),
    getPublicWorkHistory(chef.id).catch(() => []),
    getPublicAchievements(chef.id).catch(() => []),
    getPublicCharityImpact(chef.id).catch(() => ({
      totalHours: 0,
      totalEntries: 0,
      uniqueOrgs: 0,
      verified501cOrgs: 0,
      publicCharityPercent: null,
      publicCharityNote: null,
      showPublicCharity: false,
      organizations: [],
    })),
    getPublicPortfolio(chef.id).catch(() => []),
    (async () => {
      try {
        const { createServerClient } = await import('@/lib/db/server')
        const db: any = createServerClient({ admin: true })
        const { data } = await db
          .from('chefs')
          .select('show_resume_available_note')
          .eq('id', chef.id)
          .single()
        return { showResumeAvailableNote: data?.show_resume_available_note ?? false }
      } catch (err) {
        console.error('[chef-profile] Failed to fetch resume availability', err)
        return { showResumeAvailableNote: false }
      }
    })(),
    getUpcomingPublicEvents(chef.id).catch((err) => {
      console.error('[chef-profile] Failed to fetch upcoming events', err)
      return []
    }),
    getPublicChefBuyerSignals(
      chef.id,
      {
        bookingBasePriceCents: chef.booking_base_price_cents,
        bookingPricingType: chef.booking_pricing_type,
        bookingDepositType: chef.booking_deposit_type,
        bookingDepositPercent: chef.booking_deposit_percent,
        bookingDepositFixedCents: chef.booking_deposit_fixed_cents,
      },
      chef.service_config ?? null
    ).catch((err) => {
      console.error('[chef-profile] Failed to fetch buyer signals', err)
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
        },
        operations: {
          responseTime: null,
          lastActiveAt: null,
        },
        verification: {
          badges: [],
          activeInsuranceCount: 0,
          activeCertificationCount: 0,
        },
      }
    }),
    getPublicShowcaseMenus(chef.id).catch((err) => {
      console.error('[chef-profile] Failed to fetch showcase menus', err)
      return []
    }),
  ])

  const primaryColor = chef.portal_primary_color || '#1c1917'
  const backgroundColor = chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = chef.portal_background_image_url
  const optimizedBgUrl = backgroundImageUrl
    ? getOptimizedImageUrl(backgroundImageUrl, { width: 1920, quality: 'auto', format: 'auto' })
    : null
  const hasWebsiteLink = Boolean(chef.website_url && chef.show_website_on_public_profile)
  const preferWebsite = chef.preferred_inquiry_destination === 'website_only'
  const preferChefFlow = chef.preferred_inquiry_destination === 'chefflow_only'
  const pageBackgroundStyle = optimizedBgUrl
    ? {
        backgroundColor,
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.92)), url(${optimizedBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed' as const,
      }
    : { backgroundColor }

  const discovery = chef.discovery
  const availabilityLabel = getDiscoveryAvailabilityLabel(discovery)
  const locationLabel = getDiscoveryLocationLabel(discovery)
  const guestCountLabel = getDiscoveryGuestCountLabel(discovery)
  const leadTimeLabel = getDiscoveryLeadTimeLabel(discovery)
  const priceRangeLabel = discovery.price_range
    ? getDiscoveryPriceRangeLabel(discovery.price_range)
    : null
  const bookingStartingPriceLabel = formatStartingPrice(
    chef.booking_base_price_cents,
    chef.booking_pricing_type
  )
  const buyerStartingPriceLabel =
    buyerSignals.pricing.startingPriceCents != null
      ? `${formatCurrency(buyerSignals.pricing.startingPriceCents)}/person`
      : bookingStartingPriceLabel
  const cuisineLabels = discovery.cuisine_types.slice(0, 6).map(getDiscoveryCuisineLabel)
  const serviceLabels = discovery.service_types.slice(0, 6).map(getDiscoveryServiceTypeLabel)
  const profileUrl = absoluteUrl(`/chef/${publicSlug}`)
  const featuredTestimonials =
    reviewFeed.reviews.filter((review) => review.isFeatured).slice(0, 3).length > 0
      ? reviewFeed.reviews.filter((review) => review.isFeatured).slice(0, 3)
      : reviewFeed.reviews.slice(0, 3)
  const featuredReview = featuredTestimonials[0] ?? null
  const highlightedWorkHistory = workHistory.slice(0, 3)
  const highlightedAchievements = achievements.slice(0, 3)
  const highlightedCareerCredits = dedupeStrings(
    highlightedWorkHistory.flatMap((entry) => entry.notable_credits)
  ).slice(0, 6)
  const showProofHighlights =
    reviewFeed.stats.totalReviews > 0 ||
    highlightedWorkHistory.length > 0 ||
    highlightedAchievements.length > 0
  const achievementTypeLabels: Record<string, string> = {
    competition: 'Competition',
    stage: 'Stage',
    trail: 'Trail',
    press_feature: 'Press feature',
    award: 'Award',
    speaking: 'Speaking',
    certification: 'Certification',
    course: 'Course',
    book: 'Book',
    podcast: 'Podcast',
    other: 'Achievement',
  }
  const dinnerRange = formatRange(
    buyerSignals.pricing.dinnerLowCents,
    buyerSignals.pricing.dinnerHighCents,
    '/person'
  )
  const mealPrepRange = formatRange(
    buyerSignals.pricing.mealPrepLowCents,
    buyerSignals.pricing.mealPrepHighCents
  )
  const cookAndLeaveRange = formatRange(buyerSignals.pricing.cookAndLeaveRateCents, null)
  const minimumBooking = formatRange(buyerSignals.pricing.minimumBookingCents, null)
  const minimumSpend = formatRange(buyerSignals.pricing.minimumSpendCents, null)
  const depositPolicy = formatDepositPolicy(buyerSignals.pricing)
  const groceriesPolicyLabel =
    buyerSignals.service.groceriesIncluded == null
      ? null
      : buyerSignals.service.groceriesIncluded
        ? 'Included in the quoted service price.'
        : 'Handled separately from the service fee.'
  const cancellationPolicy =
    buyerSignals.service.hasCancellationPolicy === true
      ? buyerSignals.service.cancellationTerms ||
        'A cancellation policy is published; full terms are shared before payment.'
      : buyerSignals.service.hasCancellationPolicy === false
        ? 'No public cancellation policy published yet.'
        : 'Cancellation policy not published yet.'
  const reschedulePolicy =
    buyerSignals.service.hasReschedulePolicy === true
      ? buyerSignals.service.rescheduleTerms ||
        'A reschedule policy is published; full terms are shared directly with the chef.'
      : buyerSignals.service.hasReschedulePolicy === false
        ? 'No public reschedule policy published yet.'
        : 'Reschedule policy not published yet.'
  const responseTimeLabel =
    buyerSignals.operations.responseTime != null
      ? `Usually ${buyerSignals.operations.responseTime}`
      : 'No public response-time signal yet.'
  const travelRadiusLabel =
    buyerSignals.service.travelRadiusMiles != null
      ? `${buyerSignals.service.travelRadiusMiles} miles before added travel fees`
      : 'Travel radius not published yet.'
  const travelFeeLabel =
    buyerSignals.service.travelFeeCents != null
      ? `${formatCurrency(buyerSignals.service.travelFeeCents)} published travel fee`
      : buyerSignals.service.travelRadiusMiles != null
        ? 'Travel fees may apply outside the included radius.'
        : 'Travel fee policy not published yet.'
  const minimumGuestsLabel =
    buyerSignals.service.minimumGuests != null
      ? `${buyerSignals.service.minimumGuests} guest minimum`
      : null
  const guestCountDeadlineLabel =
    buyerSignals.service.guestCountDeadlineDays != null
      ? `${buyerSignals.service.guestCountDeadlineDays} day${buyerSignals.service.guestCountDeadlineDays === 1 ? '' : 's'} before the event`
      : null
  const nextAvailableLabel = formatLongDate(discovery.next_available_date)
  const includedItems = buyerSignals.service.includedItems.slice(0, 10)
  const equipmentItems = buyerSignals.service.equipmentItems
  const staffingItems = buyerSignals.service.staffingItems
  const dietaryItems = buyerSignals.service.dietaryItems
  const communicationItems = buyerSignals.service.communicationItems
  const extraItems = buyerSignals.service.extraItems
  const sampleMenuStyles = dedupeStrings(showcaseMenus.map((menu) => menu.serviceStyle))
  const sampleMenuCuisines = dedupeStrings(showcaseMenus.map((menu) => menu.cuisineType))
  const sampleMenuGuestRange = formatMenuGuestRange(showcaseMenus.map((menu) => menu.guestCount))
  const eventTypeChips = dedupeStrings([...serviceLabels, ...sampleMenuStyles]).slice(0, 8)
  const menuFitChips = dedupeStrings([...cuisineLabels, ...sampleMenuCuisines]).slice(0, 8)
  const operationalFitChips = extraItems.slice(0, 8)
  const inquiryChecklist = [
    'Event date and serving time',
    'Address or venue location',
    'Guest count and occasion',
    'Target budget or spending range',
    'Dietary needs and strong dislikes',
  ]
  if (
    buyerSignals.service.travelRadiusMiles != null ||
    buyerSignals.service.travelFeeCents != null
  ) {
    inquiryChecklist.push('Any travel, access, or venue constraints')
  }
  if (showcaseMenus.length === 0) {
    inquiryChecklist.push('Menu direction or favorite ingredients')
  }
  const publishedLinks = [
    hasWebsiteLink ? chef.website_url : null,
    ...(chef.social_links ? Object.values(chef.social_links) : []),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  const heroSummaryLine = [
    locationLabel ? `Serves ${locationLabel}` : null,
    guestCountLabel ? `Events for ${guestCountLabel}` : null,
    buyerStartingPriceLabel ? `From ${buyerStartingPriceLabel}` : null,
  ]
    .filter(Boolean)
    .join(' - ')
  const hasPricingSignals = Boolean(
    buyerStartingPriceLabel ||
    dinnerRange ||
    mealPrepRange ||
    cookAndLeaveRange ||
    minimumBooking ||
    minimumSpend ||
    buyerSignals.pricing.depositPercent != null ||
    buyerSignals.pricing.depositFixedCents != null
  )
  const hasServiceFitSignals = Boolean(
    locationLabel ||
    guestCountLabel ||
    minimumGuestsLabel ||
    leadTimeLabel ||
    buyerSignals.service.travelRadiusMiles != null ||
    buyerSignals.service.travelFeeCents != null ||
    eventTypeChips.length ||
    operationalFitChips.length ||
    buyerSignals.service.customIntroPitch
  )
  const hasInclusionSignals = Boolean(
    includedItems.length ||
    equipmentItems.length ||
    staffingItems.length ||
    buyerSignals.service.customWhatsIncluded ||
    buyerSignals.service.customCleanupNote
  )
  const hasMenuFitSignals = Boolean(
    communicationItems.length ||
    dietaryItems.length ||
    menuFitChips.length ||
    sampleMenuGuestRange ||
    guestCountDeadlineLabel ||
    buyerSignals.service.customDietaryNote
  )
  const hasVerificationSignals = Boolean(
    buyerSignals.verification.badges.length ||
    buyerSignals.verification.activeInsuranceCount > 0 ||
    buyerSignals.verification.activeCertificationCount > 0 ||
    buyerSignals.service.selfReportedInsurance
  )
  const hasPolicySignals = Boolean(
    minimumSpend ||
    minimumGuestsLabel ||
    buyerSignals.pricing.depositPercent != null ||
    buyerSignals.pricing.depositFixedCents != null ||
    buyerSignals.service.hasCancellationPolicy != null ||
    buyerSignals.service.hasReschedulePolicy != null ||
    buyerSignals.service.travelRadiusMiles != null ||
    buyerSignals.service.travelFeeCents != null ||
    groceriesPolicyLabel ||
    buyerSignals.service.gratuityPolicy != null ||
    buyerSignals.service.customTravelNote ||
    buyerSignals.service.customGratuityNote
  )
  const hasBookingExpectationSignals = Boolean(
    communicationItems.length ||
    buyerSignals.operations.responseTime != null ||
    leadTimeLabel ||
    nextAvailableLabel ||
    guestCountDeadlineLabel
  )
  const trustEvidenceNote =
    buyerSignals.verification.badges.length > 0
      ? 'Public badges reflect current records on file in ChefFlow. Self-reported service statements do not create a current-record badge on their own.'
      : buyerSignals.service.selfReportedInsurance
        ? 'This profile includes a self-reported insurance statement, but ChefFlow is not currently showing a current record badge.'
        : 'This profile is not currently showing public current-record badges from ChefFlow protection or compliance records.'
  const nextStepTitle = discovery.accepting_inquiries ? 'Ready to inquire?' : 'Planning ahead?'
  const nextStepIntro = discovery.accepting_inquiries
    ? hasWebsiteLink && preferWebsite && !preferChefFlow
      ? `${chef.display_name} prefers directing new leads to their website, but ChefFlow inquiry is also available if you want a structured intake path.`
      : `Use the inquiry form when you have enough detail for ${chef.display_name} to evaluate fit and quote scope.`
    : `${chef.display_name} is not taking new public inquiries right now, but you can still review fit signals here and join the waitlist below.`
  const showDirectInquiryCta = discovery.accepting_inquiries && (!preferWebsite || !hasWebsiteLink)
  const showWebsitePrimaryCta = hasWebsiteLink && preferWebsite && !preferChefFlow
  const heroBookingTitle = discovery.accepting_inquiries
    ? showWebsitePrimaryCta
      ? 'Choose your booking path'
      : 'Check availability for your date'
    : 'Join the waitlist for the next opening'
  const heroBookingIntro = discovery.accepting_inquiries
    ? showWebsitePrimaryCta
      ? `${chef.display_name} prefers new leads through the website, but ChefFlow inquiry is also available if you want a structured intake path.`
      : `Share your date, location, guest count, and budget to see if ${chef.display_name} is the right fit. Starting an inquiry does not charge your card.`
    : nextAvailableLabel
      ? `${chef.display_name} is not taking new public inquiries right now. Join the waitlist and we will follow up when the next opening around ${nextAvailableLabel} is available.`
      : `${chef.display_name} is not taking new public inquiries right now. Join the waitlist and we will let you know when availability opens.`
  const planningSectionTitle = discovery.accepting_inquiries
    ? 'Before you send details'
    : nextStepTitle
  const planningSectionIntro = discovery.accepting_inquiries
    ? 'Use these details to help the chef evaluate fit and quote scope faster.'
    : nextStepIntro
  const heroBookingFacts = discovery.accepting_inquiries
    ? [
        { label: 'What to share', value: 'Date, location, and guest count' },
        {
          label: 'Response',
          value:
            buyerSignals.operations.responseTime != null
              ? buyerSignals.operations.responseTime
              : 'Not published publicly',
        },
        {
          label: 'Starting from',
          value: buyerStartingPriceLabel || 'Quote shared after scope review',
        },
      ]
    : [
        { label: 'Availability', value: nextAvailableLabel || 'No opening published yet' },
        {
          label: 'Response',
          value:
            buyerSignals.operations.responseTime != null
              ? buyerSignals.operations.responseTime
              : 'Not published publicly',
        },
        { label: 'Lead time', value: leadTimeLabel || 'Shared directly before booking' },
      ]
  const responseExpectationCopy =
    buyerSignals.operations.responseTime != null
      ? `${chef.display_name} publishes a response window of ${buyerSignals.operations.responseTime}.`
      : 'Response timing is not published on this profile, so sharing complete event details helps the chef evaluate fit faster.'
  const inquiryStageCopy =
    buyerSignals.operations.responseTime != null
      ? `Starting an inquiry does not charge your card or confirm the event. ${chef.display_name} publishes a response window of ${buyerSignals.operations.responseTime}.`
      : 'Starting an inquiry does not charge your card or confirm the event. The chef reviews fit, timing, and scope before sending next steps.'

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <PublicPageView pageName="chef_profile" properties={{ chef_slug: publicSlug }} />
      <ChefProfileJsonLd
        chefName={chef.display_name}
        description={discovery.highlight_text || chef.tagline || chef.bio || null}
        profileUrl={profileUrl}
        imageUrl={discovery.hero_image_url || chef.profile_image_url || null}
        cuisines={cuisineLabels}
        serviceTypes={serviceLabels}
        sameAs={publishedLinks}
        serviceArea={locationLabel || null}
        priceRange={priceRangeLabel}
        dinnerLowCents={buyerSignals.pricing.dinnerLowCents}
        dinnerHighCents={buyerSignals.pricing.dinnerHighCents}
        mealPrepLowCents={buyerSignals.pricing.mealPrepLowCents}
        mealPrepHighCents={buyerSignals.pricing.mealPrepHighCents}
        cookAndLeaveRateCents={buyerSignals.pricing.cookAndLeaveRateCents}
        averageRating={reviewFeed.stats.averageRating}
        totalReviews={reviewFeed.stats.totalReviews}
      />
      <ChefBreadcrumbJsonLd chefName={chef.display_name} profileUrl={profileUrl} />

      <section className="py-16 md:py-24 bg-stone-900/70 backdrop-blur-[1px]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {chef.logo_url && (
            <div className="flex justify-center mb-6">
              <Image
                src={getOptimizedImageUrl(chef.logo_url, {
                  width: 440,
                  height: 128,
                  fit: 'fit',
                })}
                alt={`${chef.display_name} logo`}
                width={220}
                height={64}
                className="max-h-16 max-w-[220px] object-contain"
              />
            </div>
          )}

          {chef.profile_image_url ? (
            <Image
              src={getOptimizedAvatar(chef.profile_image_url, 224)}
              alt={chef.display_name}
              width={112}
              height={112}
              className="w-28 h-28 rounded-full object-cover mx-auto mb-6 ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-stone-700 flex items-center justify-center mx-auto mb-6 ring-4 ring-white shadow-lg">
              <span className="text-3xl font-bold text-stone-500">
                {chef.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="mb-4 flex flex-wrap justify-center gap-2">
            <DetailChip label={availabilityLabel} />
            {chef.booking_enabled && chef.booking_slug && chef.booking_model === 'instant_book' && (
              <span className="rounded-full border border-emerald-600/50 bg-emerald-950/60 px-3 py-1.5 text-xs font-medium text-emerald-300">
                Instant booking available
              </span>
            )}
            {discovery.review_count > 0 && discovery.avg_rating != null && (
              <DetailChip
                label={`${discovery.avg_rating.toFixed(1)} stars - ${discovery.review_count} reviews`}
              />
            )}
            {buyerStartingPriceLabel && <DetailChip label={`From ${buyerStartingPriceLabel}`} />}
            {priceRangeLabel && <DetailChip label={priceRangeLabel} />}
            {nextAvailableLabel && !discovery.accepting_inquiries && (
              <DetailChip label={`Next opening ${nextAvailableLabel}`} />
            )}
            {buyerSignals.verification.badges[0] && (
              <DetailChip label={buyerSignals.verification.badges[0].label} />
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-stone-100">{chef.display_name}</h1>

          {chef.archetype && (
            <p className="text-sm font-medium text-brand-400 mt-2 uppercase tracking-widest">
              {(
                {
                  private_chef: 'Private Chef',
                  caterer: 'Catering',
                  meal_prep: 'Meal Prep',
                  bakery: 'Bakery',
                  restaurant: 'Restaurant',
                  food_truck: 'Food Truck',
                } as Record<string, string>
              )[chef.archetype] ?? null}
            </p>
          )}

          {chef.tagline && (
            <p className="text-lg md:text-xl text-stone-300 mt-3 max-w-2xl mx-auto">
              {chef.tagline}
            </p>
          )}

          {discovery.highlight_text && discovery.highlight_text !== chef.tagline && (
            <p className="mt-4 max-w-3xl mx-auto text-sm uppercase tracking-[0.18em] text-brand-300">
              {discovery.highlight_text}
            </p>
          )}

          {chef.social_links && Object.values(chef.social_links).some(Boolean) && (
            <div className="mt-5 flex justify-center gap-4">
              {chef.social_links.instagram && (
                <TrackedLink
                  href={chef.social_links.instagram}
                  analyticsName="public_profile_social_instagram"
                  analyticsProps={{ chef_slug: publicSlug }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </TrackedLink>
              )}
              {chef.social_links.tiktok && (
                <TrackedLink
                  href={chef.social_links.tiktok}
                  analyticsName="public_profile_social_tiktok"
                  analyticsProps={{ chef_slug: publicSlug }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors"
                  aria-label="TikTok"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-3.77-1.82 4.83 4.83 0 003.77-2.77z" />
                  </svg>
                </TrackedLink>
              )}
              {chef.social_links.facebook && (
                <TrackedLink
                  href={chef.social_links.facebook}
                  analyticsName="public_profile_social_facebook"
                  analyticsProps={{ chef_slug: publicSlug }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </TrackedLink>
              )}
              {chef.social_links.youtube && (
                <TrackedLink
                  href={chef.social_links.youtube}
                  analyticsName="public_profile_social_youtube"
                  analyticsProps={{ chef_slug: publicSlug }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors"
                  aria-label="YouTube"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </TrackedLink>
              )}
              {chef.social_links.linktree && (
                <TrackedLink
                  href={chef.social_links.linktree}
                  analyticsName="public_profile_social_linktree"
                  analyticsProps={{ chef_slug: publicSlug }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors"
                  aria-label="Link hub"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </TrackedLink>
              )}
            </div>
          )}

          {chef.bio && (
            <p className="text-stone-300 mt-6 max-w-2xl mx-auto leading-relaxed">{chef.bio}</p>
          )}

          {heroSummaryLine && (
            <p className="mt-5 max-w-3xl mx-auto text-sm leading-relaxed text-stone-300">
              {heroSummaryLine}
            </p>
          )}

          {(cuisineLabels.length > 0 || serviceLabels.length > 0) && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {cuisineLabels.map((label) => (
                <DetailChip key={`cuisine-${label}`} label={label} />
              ))}
              {serviceLabels.map((label) => (
                <DetailChip key={`service-${label}`} label={label} />
              ))}
            </div>
          )}

          <div className="mt-10">
            <div
              className="mx-auto max-w-4xl rounded-[2rem] border border-stone-200/70 p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-7"
              style={{ backgroundColor: 'rgba(255, 251, 235, 0.96)' }}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Booking
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-stone-950 sm:text-3xl">
                    {heroBookingTitle}
                  </h2>
                  <p
                    id="hero-booking-description"
                    className="mt-3 max-w-xl text-sm leading-relaxed text-stone-700 sm:text-base"
                  >
                    {heroBookingIntro}
                  </p>
                </div>

                <div className="w-full max-w-lg space-y-3 lg:max-w-sm">
                  {chef.booking_enabled && chef.booking_slug && (
                    <TrackedLink
                      href={`/book/${chef.booking_slug}`}
                      analyticsName="public_profile_instant_book"
                      analyticsProps={{ chef_slug: publicSlug, booking_slug: chef.booking_slug }}
                      aria-describedby="hero-booking-description"
                      className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-center text-base font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-all duration-150 hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {chef.booking_model === 'instant_book' ? 'Book instantly' : 'Book now'}
                    </TrackedLink>
                  )}
                  {showWebsitePrimaryCta ? (
                    <TrackedLink
                      href={chef.website_url!}
                      analyticsName="public_profile_website"
                      analyticsProps={{ chef_slug: publicSlug }}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-describedby="hero-booking-description"
                      className={`inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl px-6 py-4 text-center text-base font-semibold shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-all duration-150 hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 ${chef.booking_enabled && chef.booking_slug ? 'border border-stone-300 text-stone-900 bg-white/80' : 'text-white'}`}
                      style={
                        chef.booking_enabled && chef.booking_slug
                          ? { borderColor: primaryColor }
                          : { backgroundColor: primaryColor }
                      }
                    >
                      Visit chef website
                    </TrackedLink>
                  ) : showDirectInquiryCta ? (
                    <TrackedLink
                      href={`/chef/${publicSlug}/inquire`}
                      analyticsName="public_profile_start_inquiry"
                      analyticsProps={{ chef_slug: publicSlug, inquiry_slug: inquirySlug }}
                      aria-describedby="hero-booking-description"
                      className={`inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl px-6 py-4 text-center text-base font-semibold shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-all duration-150 hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 ${chef.booking_enabled && chef.booking_slug ? 'border border-stone-300 text-stone-900 bg-white/80' : 'text-white'}`}
                      style={
                        chef.booking_enabled && chef.booking_slug
                          ? { borderColor: primaryColor }
                          : { backgroundColor: primaryColor }
                      }
                    >
                      Check availability
                    </TrackedLink>
                  ) : null}

                  <div
                    className={`grid gap-3 ${
                      hasWebsiteLink && !showWebsitePrimaryCta ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                    }`}
                  >
                    <TrackedLink
                      href={`/chef/${publicSlug}/store`}
                      analyticsName="public_profile_store"
                      analyticsProps={{ chef_slug: publicSlug }}
                      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border px-5 py-3 text-center text-sm font-semibold text-stone-900 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2"
                      style={{
                        borderColor: primaryColor,
                        backgroundColor: 'rgba(255,255,255,0.78)',
                      }}
                    >
                      Shop store
                    </TrackedLink>

                    <TrackedLink
                      href={`/chef/${publicSlug}/gift-cards`}
                      analyticsName="public_profile_gift_cards"
                      analyticsProps={{ chef_slug: publicSlug }}
                      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border px-5 py-3 text-center text-sm font-semibold text-stone-900 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2"
                      style={{
                        borderColor: primaryColor,
                        backgroundColor: 'rgba(255,255,255,0.78)',
                      }}
                    >
                      Gift cards
                    </TrackedLink>

                    {hasWebsiteLink && !showWebsitePrimaryCta && (
                      <TrackedLink
                        href={chef.website_url!}
                        analyticsName="public_profile_website"
                        analyticsProps={{ chef_slug: publicSlug }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border px-5 py-3 text-center text-sm font-semibold text-stone-900 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2"
                        style={{
                          borderColor: primaryColor,
                          backgroundColor: 'rgba(255,255,255,0.78)',
                        }}
                      >
                        Visit website
                      </TrackedLink>
                    )}
                  </div>

                  {preferWebsite &&
                    hasWebsiteLink &&
                    !preferChefFlow &&
                    discovery.accepting_inquiries && (
                      <p className="text-xs leading-relaxed text-stone-600">
                        Prefer ChefFlow?{' '}
                        <TrackedLink
                          href={`/chef/${publicSlug}/inquire`}
                          analyticsName="public_profile_secondary_inquiry"
                          analyticsProps={{ chef_slug: publicSlug }}
                          className="font-semibold underline decoration-2 underline-offset-2 focus-visible:outline-none"
                          style={{ color: primaryColor }}
                        >
                          Start the inquiry here
                        </TrackedLink>
                        .
                      </p>
                    )}

                  {!discovery.accepting_inquiries && (
                    <div className="rounded-2xl border border-stone-300/80 bg-white/70 p-4">
                      <ChefAvailabilityWaitlist chefId={chef.id} chefName={chef.display_name} />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {heroBookingFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-2xl border border-stone-300/80 bg-white/65 p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-stone-900">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {(reviewFeed.stats.totalReviews > 0 ||
        chef.google_review_url ||
        (chef.website_url && chef.show_website_on_public_profile)) && (
        <section className="px-6 pt-8">
          <div className="max-w-5xl mx-auto">
            <ChefProofSummary
              slug={publicSlug}
              stats={reviewFeed.stats}
              googleReviewUrl={chef.google_review_url}
              websiteUrl={chef.website_url ?? null}
              showWebsite={chef.show_website_on_public_profile}
              acceptingInquiries={discovery.accepting_inquiries}
              preferWebsite={preferWebsite}
              preferChefFlow={preferChefFlow}
            />
          </div>
        </section>
      )}

      {showProofHighlights && (
        <section className="px-6 pt-2">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-stone-100">
                Proof, Background, and Recognition
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-stone-300">
                Surface the strongest trust signals early: public reviews, culinary history, and
                notable professional recognition.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {reviewFeed.stats.totalReviews > 0 && (
                <div className="rounded-3xl border border-stone-700 bg-stone-950/80 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">
                    Reviews
                  </p>
                  <div className="mt-4 flex items-end gap-3">
                    <p className="text-4xl font-bold text-stone-100">
                      {reviewFeed.stats.averageRating.toFixed(1)}
                    </p>
                    <p className="pb-1 text-sm text-stone-400">
                      from {reviewFeed.stats.totalReviews}{' '}
                      {reviewFeed.stats.totalReviews === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  {featuredReview && (
                    <blockquote className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                      <p className="text-sm leading-relaxed text-stone-200">
                        &ldquo;{clampText(featuredReview.reviewText, 180)}&rdquo;
                      </p>
                      <footer className="mt-3 text-xs text-stone-500">
                        {featuredReview.reviewerName} via {featuredReview.sourceLabel}
                      </footer>
                    </blockquote>
                  )}
                  {reviewFeed.stats.platformBreakdown.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {reviewFeed.stats.platformBreakdown.slice(0, 4).map((platform) => (
                        <span
                          key={platform.platform}
                          className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1 text-xs text-stone-300"
                        >
                          {platform.platform} - {platform.count}
                        </span>
                      ))}
                    </div>
                  )}
                  <TrackedLink
                    href={`/chef/${publicSlug}#reviews`}
                    analyticsName="public_profile_top_reviews_anchor"
                    analyticsProps={{ chef_slug: publicSlug }}
                    className="mt-5 inline-flex items-center rounded-xl border border-stone-600 bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800"
                  >
                    Read all reviews
                  </TrackedLink>
                </div>
              )}

              {highlightedWorkHistory.length > 0 && (
                <div className="rounded-3xl border border-stone-700 bg-stone-950/80 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">
                    Culinary history
                  </p>
                  <div className="mt-4 space-y-4">
                    {highlightedWorkHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
                      >
                        <p className="text-sm font-semibold text-stone-100">{entry.role_title}</p>
                        <p className="mt-1 text-sm text-stone-300">{entry.organization_name}</p>
                        {entry.location_label && (
                          <p className="mt-1 text-xs text-stone-500">{entry.location_label}</p>
                        )}
                        {entry.summary && (
                          <p className="mt-3 text-xs leading-relaxed text-stone-400">
                            {clampText(entry.summary, 140)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {highlightedCareerCredits.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Notable credits
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {highlightedCareerCredits.map((credit) => (
                          <span
                            key={credit}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1 text-xs text-stone-300"
                          >
                            {credit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {highlightedAchievements.length > 0 && (
                <div className="rounded-3xl border border-stone-700 bg-stone-950/80 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">
                    Recognition
                  </p>
                  <div className="mt-4 space-y-4">
                    {highlightedAchievements.map((achievement: any) => (
                      <div
                        key={achievement.id}
                        className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-stone-100">
                              {achievement.title}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {achievement.organization ||
                                achievementTypeLabels[achievement.achieve_type] ||
                                'Achievement'}
                            </p>
                          </div>
                          {achievement.achieve_date && (
                            <span className="text-xs text-stone-500">
                              {new Date(`${achievement.achieve_date}T00:00:00`).getFullYear()}
                            </span>
                          )}
                        </div>
                        {achievement.outcome && (
                          <p className="mt-3 text-xs font-medium text-emerald-300">
                            {achievement.outcome}
                          </p>
                        )}
                        {achievement.description && (
                          <p className="mt-2 text-xs leading-relaxed text-stone-400">
                            {clampText(achievement.description, 140)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!discovery.accepting_inquiries && (
        <section className="px-6 pt-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-amber-800 bg-amber-950/70 p-5 text-amber-200">
            <p className="text-sm font-semibold uppercase tracking-wide">Availability notice</p>
            <p className="mt-2 text-sm">
              {chef.display_name} is not currently accepting new public inquiries.
              {nextAvailableLabel
                ? ` Next opening: ${nextAvailableLabel}.`
                : ' Check back soon for updated availability.'}
            </p>
          </div>
        </section>
      )}

      {featuredTestimonials.length > 0 && (
        <section className="px-6 pt-8">
          <div className="mx-auto max-w-5xl rounded-3xl border border-stone-700 bg-stone-950/80 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">
                  Client Testimonials
                </p>
                <h2 className="mt-3 text-2xl font-bold text-stone-100">
                  {reviewFeed.stats.totalReviews} reviews and testimonials
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-300">
                  Recent public feedback from clients and guests. Full review details appear lower
                  on the page.
                </p>
              </div>
              {reviewFeed.stats.averageRating > 0 && (
                <div className="rounded-2xl border border-stone-700 bg-stone-900/80 px-4 py-3 text-sm text-stone-300">
                  Average rating: {reviewFeed.stats.averageRating.toFixed(1)} / 5
                </div>
              )}
            </div>
            <div className="mt-6">
              <ReviewShowcase
                reviews={featuredTestimonials}
                stats={reviewFeed.stats}
                compact
                maxCompact={3}
              />
            </div>
          </div>
        </section>
      )}

      <section className="py-12 px-6 bg-stone-900/70">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-stone-100">Booking Snapshot</h2>
            <p className="mt-3 max-w-2xl mx-auto text-stone-300">
              Only information this chef has actually published is shown here. Missing details stay
              omitted rather than being guessed.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Pricing guidance</p>
              {hasPricingSignals ? (
                <>
                  {buyerStartingPriceLabel && (
                    <p className="mt-2 text-lg font-semibold text-brand-400">
                      Starting at {buyerStartingPriceLabel}
                    </p>
                  )}
                  {priceRangeLabel && !buyerStartingPriceLabel && (
                    <p className="mt-2 text-sm text-stone-300">{priceRangeLabel}</p>
                  )}
                  <DetailRows
                    rows={[
                      { label: 'Private dinner', value: dinnerRange },
                      { label: 'Meal prep', value: mealPrepRange },
                      { label: 'Cook-and-leave', value: cookAndLeaveRange },
                      { label: 'Minimum booking', value: minimumBooking },
                      { label: 'Minimum spend', value: minimumSpend },
                      { label: 'Deposit', value: depositPolicy },
                    ]}
                  />
                  <p className="mt-4 text-xs leading-relaxed text-stone-500">
                    Treat these as planning guidance, not a final quote. Scope, menu, staffing,
                    travel, and venue details can still change the final number.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  This chef has not published public pricing guidance yet. Use the inquiry form to
                  request a quote with your guest count, menu style, and location.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Service fit</p>
              {hasServiceFitSignals ? (
                <>
                  {buyerSignals.service.customIntroPitch && (
                    <p className="mt-3 text-sm leading-relaxed text-stone-300">
                      {buyerSignals.service.customIntroPitch}
                    </p>
                  )}
                  <DetailRows
                    rows={[
                      { label: 'Service area', value: locationLabel },
                      { label: 'Event sizes', value: guestCountLabel },
                      { label: 'Minimum guests', value: minimumGuestsLabel },
                      { label: 'Lead time', value: leadTimeLabel },
                      { label: 'Sample menu size', value: sampleMenuGuestRange },
                    ]}
                  />
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  Service-area, format, and guest-count guidance have not been published on this
                  profile yet.
                </p>
              )}
              {eventTypeChips.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Ideal event types
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {eventTypeChips.map((label) => (
                      <DetailChip key={`fit-${label}`} label={label} />
                    ))}
                  </div>
                </div>
              )}
              {operationalFitChips.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Operational fit
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {operationalFitChips.map((label) => (
                      <DetailChip key={`fit-${label}`} label={label} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Included and staffing</p>
              {hasInclusionSignals ? (
                <>
                  {includedItems.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Included
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {includedItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {equipmentItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Equipment
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {equipmentItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {staffingItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Staffing
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {staffingItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {buyerSignals.service.customWhatsIncluded && (
                    <p className="mt-4 text-sm leading-relaxed text-stone-300">
                      {buyerSignals.service.customWhatsIncluded}
                    </p>
                  )}
                  {buyerSignals.service.customCleanupNote && (
                    <p className="mt-3 text-sm leading-relaxed text-stone-400">
                      Cleanup: {buyerSignals.service.customCleanupNote}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  This chef has not published a public inclusion or staffing checklist yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Menu fit and planning</p>
              {hasMenuFitSignals ? (
                <>
                  {menuFitChips.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Menu fit
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {menuFitChips.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {communicationItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Planning workflow
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {communicationItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dietaryItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Dietary support
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {dietaryItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {sampleMenuGuestRange && (
                    <p className="mt-4 text-sm text-stone-300">
                      Published sample menus currently cover around {sampleMenuGuestRange}.
                    </p>
                  )}
                  {guestCountDeadlineLabel && (
                    <p className="mt-4 text-sm text-stone-300">
                      Guest count deadline: {guestCountDeadlineLabel}
                    </p>
                  )}
                  {buyerSignals.service.customDietaryNote && (
                    <p className="mt-4 text-sm leading-relaxed text-stone-300">
                      {buyerSignals.service.customDietaryNote}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  This chef has not published a detailed menu-fit or planning workflow yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Booking expectations</p>
              {hasBookingExpectationSignals ? (
                <>
                  <DetailRows
                    rows={[
                      { label: 'Response', value: responseTimeLabel },
                      { label: 'Lead time', value: leadTimeLabel },
                      { label: 'Next opening', value: nextAvailableLabel },
                      { label: 'Guest count final', value: guestCountDeadlineLabel },
                    ]}
                  />
                  {communicationItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Published touchpoints
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {communicationItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  Response timing and pre-event workflow details have not been published on this
                  profile yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Policies and boundaries</p>
              {hasPolicySignals ? (
                <>
                  <DetailRows
                    rows={[
                      { label: 'Deposit', value: depositPolicy },
                      { label: 'Minimum spend', value: minimumSpend },
                      { label: 'Travel radius', value: travelRadiusLabel },
                      { label: 'Travel fees', value: travelFeeLabel },
                      { label: 'Cancellation', value: cancellationPolicy },
                      { label: 'Rescheduling', value: reschedulePolicy },
                      { label: 'Groceries', value: groceriesPolicyLabel },
                      {
                        label: 'Gratuity',
                        value: formatGratuityPolicy(buyerSignals.service.gratuityPolicy),
                      },
                    ]}
                  />
                  {buyerSignals.service.customTravelNote && (
                    <p className="mt-4 text-sm leading-relaxed text-stone-300">
                      {buyerSignals.service.customTravelNote}
                    </p>
                  )}
                  {buyerSignals.service.customGratuityNote && (
                    <p className="mt-3 text-sm leading-relaxed text-stone-300">
                      {buyerSignals.service.customGratuityNote}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  This chef has not published public boundary or policy details yet.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Trust and readiness</p>
              <DetailRows
                rows={[
                  {
                    label: 'Inquiry status',
                    value: discovery.accepting_inquiries
                      ? 'Currently accepting public inquiries.'
                      : 'Public inquiries are paused right now.',
                  },
                  { label: 'Next opening', value: nextAvailableLabel },
                  { label: 'Response time', value: responseTimeLabel },
                  {
                    label: 'Activity',
                    value: formatLastActive(buyerSignals.operations.lastActiveAt),
                  },
                  {
                    label: 'Current insurance records',
                    value:
                      buyerSignals.verification.activeInsuranceCount > 0
                        ? `${buyerSignals.verification.activeInsuranceCount} active record${buyerSignals.verification.activeInsuranceCount === 1 ? '' : 's'} on file`
                        : null,
                    emptyText: 'No public insurance records on file yet.',
                  },
                  {
                    label: 'Current certifications',
                    value:
                      buyerSignals.verification.activeCertificationCount > 0
                        ? `${buyerSignals.verification.activeCertificationCount} active record${buyerSignals.verification.activeCertificationCount === 1 ? '' : 's'} on file`
                        : null,
                    emptyText: 'No public certification records on file yet.',
                  },
                ]}
              />
              {hasVerificationSignals ? (
                <>
                  {buyerSignals.verification.badges.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {buyerSignals.verification.badges.map((badge) => (
                        <div
                          key={badge.label}
                          className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-3"
                        >
                          <p className="text-sm font-medium text-emerald-300">{badge.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-stone-300">
                            {badge.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {buyerSignals.service.selfReportedInsurance &&
                    buyerSignals.verification.activeInsuranceCount === 0 && (
                      <p className="mt-4 text-xs leading-relaxed text-stone-400">
                        This chef says they carry insurance, but ChefFlow is not currently showing
                        an uploaded policy record on this public profile.
                      </p>
                    )}
                </>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-stone-400">
                  ChefFlow is not currently showing public insurance or certification badges for
                  this chef.
                </p>
              )}
              <p className="mt-4 text-xs leading-relaxed text-stone-500">{trustEvidenceNote}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-stone-900/70">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-stone-100">Sample Menus</h2>
            <p className="mt-3 max-w-2xl mx-auto text-stone-300">
              Public showcase menus this chef has chosen to share as starting points.
            </p>
          </div>

          {showcaseMenus.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {showcaseMenus.map((menu) => (
                <div
                  key={menu.id}
                  className="overflow-hidden rounded-2xl border border-stone-700 bg-stone-950/80"
                >
                  {menu.photoUrl && (
                    <div className="relative aspect-[4/3] bg-stone-900">
                      <CloudinaryFetchImage
                        src={menu.photoUrl}
                        alt={`${menu.name} sample menu`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        aspectRatio={4 / 3}
                        fit="fill"
                        gravity="auto"
                        defaultQuality={90}
                        maxWidth={1200}
                        quality={90}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-stone-100">{menu.name}</h3>
                        {menu.description && (
                          <p className="mt-2 text-sm leading-relaxed text-stone-300">
                            {menu.description}
                          </p>
                        )}
                      </div>
                      {menu.timesUsed > 0 && (
                        <span className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1 text-xs font-medium text-stone-300">
                          Used {menu.timesUsed} times
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-stone-300">
                      {menu.cuisineType && <p>Cuisine: {menu.cuisineType}</p>}
                      {menu.serviceStyle && <p>Style: {menu.serviceStyle}</p>}
                      {menu.guestCount && <p>Sample guest count: {menu.guestCount}</p>}
                    </div>

                    <div className="mt-4 space-y-3">
                      {menu.dishes.slice(0, 5).map((dish) => (
                        <div
                          key={dish.id}
                          className="rounded-xl border border-stone-800 bg-stone-900/60 p-3"
                        >
                          <p className="text-xs uppercase tracking-wide text-stone-500">
                            Course {dish.courseNumber}
                          </p>
                          <p className="mt-1 text-sm font-medium text-stone-100">
                            {dish.courseName}
                          </p>
                          {dish.name !== dish.courseName && (
                            <p className="mt-1 text-xs text-stone-400">{dish.name}</p>
                          )}
                          {dish.description && (
                            <p className="mt-2 text-xs leading-relaxed text-stone-400">
                              {dish.description}
                            </p>
                          )}
                          {(dish.dietaryTags.length > 0 || dish.allergenFlags.length > 0) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {dish.dietaryTags.map((tag) => (
                                <span
                                  key={`${dish.id}-${tag}`}
                                  className="rounded-full border border-emerald-800/50 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-medium text-emerald-300"
                                >
                                  {tag}
                                </span>
                              ))}
                              {dish.allergenFlags.map((flag) => (
                                <span
                                  key={`${dish.id}-${flag}`}
                                  className="rounded-full border border-amber-800/50 bg-amber-950/30 px-2.5 py-1 text-[11px] font-medium text-amber-200"
                                >
                                  Allergen: {flag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-6 text-center">
              <p className="text-sm text-stone-300">
                This chef has not published showcase menus yet.
              </p>
              <p className="mt-2 text-sm text-stone-400">
                Ask about current menu formats, seasonal dishes, or dietary customization through
                the inquiry form.
              </p>
            </div>
          )}
        </div>
      </section>

      {chef.dietaryTrust && (
        <section className="py-12 px-6 bg-stone-900/70">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-semibold text-stone-100 mb-4">Dietary Fit</h2>
            <DietaryTrustStrip summary={chef.dietaryTrust} showSummary maxChips={7} />
          </div>
        </section>
      )}

      <ChefCredentialsPanel
        workHistory={workHistory}
        achievements={achievements as any}
        portfolio={portfolio}
        charityImpact={charityImpact}
        showResumeNote={chefCredFields.showResumeAvailableNote}
        chefName={chef.display_name}
      />

      {ownedRestaurants.length > 0 && (
        <section className="py-16 px-6 bg-gradient-to-b from-stone-900/90 to-stone-900/70">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-stone-100">
                {chef.restaurant_group_name ||
                  (ownedRestaurants.length === 1 ? 'Our Restaurant' : 'Our Restaurants')}
              </h2>
              <p className="text-stone-300 mt-3 max-w-xl mx-auto">
                {ownedRestaurants.length === 1
                  ? `Owned and operated by ${chef.display_name}.`
                  : `${ownedRestaurants.length} restaurants by ${chef.display_name}.`}
              </p>
            </div>

            <LocationExperienceShowcase
              locations={ownedRestaurants}
              chefName={chef.display_name}
              profileSlug={publicSlug}
            />
          </div>
        </section>
      )}

      {locationExperiences.length > 0 && (
        <section className="py-16 px-6 bg-stone-900/70">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-stone-100">Book In Real Settings</h2>
              <p className="text-stone-300 mt-3 max-w-xl mx-auto">
                Published settings, venue context, and direct booking paths for {chef.display_name}.
              </p>
            </div>

            <LocationExperienceShowcase
              locations={locationExperiences}
              chefName={chef.display_name}
              profileSlug={publicSlug}
            />
          </div>
        </section>
      )}

      {reviewFeed.reviews.length > 0 && (
        <section id="reviews" className="py-16 px-6 bg-stone-900/70">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-stone-100">Client Reviews</h2>
              <p className="text-stone-300 mt-3 max-w-xl mx-auto">
                Feedback from recent clients and guests.
              </p>
            </div>

            <ReviewShowcase reviews={reviewFeed.reviews} stats={reviewFeed.stats} />
          </div>
        </section>
      )}

      {availabilitySignals.length > 0 && (
        <section className="py-12 px-6 bg-stone-900/70">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-100">Available Dates</h2>
              <p className="text-stone-300 mt-2 text-sm">
                Open dates currently available for booking.
              </p>
            </div>
            <div className="space-y-3">
              {availabilitySignals.map((signal) => {
                const dateLabel = new Date(`${signal.start_date}T00:00:00`).toLocaleDateString(
                  'en-US',
                  {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }
                )
                return (
                  <div
                    key={signal.id}
                    className="flex items-center justify-between bg-green-950 border border-green-200 rounded-xl px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold text-stone-100">{dateLabel}</p>
                      {signal.public_note && (
                        <p className="text-sm text-stone-300 mt-0.5">{signal.public_note}</p>
                      )}
                    </div>
                    <TrackedLink
                      href={`/chef/${publicSlug}/inquire?date=${signal.start_date}`}
                      analyticsName="public_profile_availability_inquire"
                      analyticsProps={{ chef_slug: publicSlug, date: signal.start_date }}
                      className="flex-shrink-0 ml-4 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Inquire
                    </TrackedLink>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {upcomingEvents.length > 0 && (
        <section className="py-12 px-6 bg-stone-900/70">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-100">Upcoming Events</h2>
              <p className="text-stone-300 mt-2 text-sm">
                Public events you can attend. Buy tickets directly.
              </p>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((evt) => {
                const dateLabel = new Date(`${evt.eventDate}T00:00:00`).toLocaleDateString(
                  'en-US',
                  { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }
                )
                const priceLabel =
                  evt.minPriceCents != null
                    ? evt.minPriceCents === evt.maxPriceCents
                      ? `$${(evt.minPriceCents / 100).toFixed(0)}`
                      : `$${(evt.minPriceCents / 100).toFixed(0)} - $${(evt.maxPriceCents! / 100).toFixed(0)}`
                    : null
                return (
                  <TrackedLink
                    key={evt.shareToken}
                    href={`/e/${evt.shareToken}`}
                    analyticsName="public_profile_upcoming_event"
                    analyticsProps={{ chef_slug: publicSlug, event_date: evt.eventDate }}
                    className="flex items-center justify-between rounded-xl border border-stone-700 bg-stone-950/80 px-5 py-4 transition-colors hover:border-stone-500 hover:bg-stone-900"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-100 truncate">{evt.eventName}</p>
                      <p className="text-sm text-stone-400 mt-0.5">
                        {dateLabel}
                        {evt.locationCity ? ` - ${evt.locationCity}` : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4 text-right">
                      {priceLabel && (
                        <p className="text-sm font-medium text-brand-400">{priceLabel}</p>
                      )}
                      <p className="text-xs text-stone-400">Get Tickets</p>
                    </div>
                  </TrackedLink>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 px-6 bg-stone-900/75">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-stone-100">{planningSectionTitle}</h2>
          <p className="mx-auto mt-3 max-w-3xl text-stone-300">{planningSectionIntro}</p>

          <div className="mt-8">
            <div className="grid w-full gap-3 text-left md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  When to inquire
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Best when you can already share the date, location, guest count, and target
                  budget.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  {responseExpectationCopy}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Include these details
                </p>
                <ul className="mt-2 space-y-2 text-sm text-stone-300">
                  {inquiryChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Inquiry stage
                </p>
                <p className="mt-2 text-sm text-stone-300">{inquiryStageCopy}</p>
              </div>
              <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Before payment
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Deposit, cancellation, and refund terms should be reviewed in writing before you
                  pay.
                </p>
                {(buyerSignals.service.hasCancellationPolicy === true ||
                  buyerSignals.service.hasReschedulePolicy === true) && (
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">
                    This profile publishes at least one policy detail, but full written terms still
                    matter before money changes hands.
                  </p>
                )}
              </div>
            </div>
            <TrackedLink
              href="/trust"
              analyticsName="public_profile_trust_center"
              analyticsProps={{ chef_slug: publicSlug }}
              className="mt-1 w-full rounded-2xl border border-stone-700 bg-stone-950/70 p-4 text-left transition-colors hover:border-stone-500 hover:bg-stone-900"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Trust center
              </p>
              <p className="mt-2 text-sm text-stone-300">
                Read how badge evidence is sourced, what counts as current vs self-reported, and
                what ChefFlow support can and cannot do.
              </p>
            </TrackedLink>
          </div>
          {!discovery.accepting_inquiries && (
            <p className="mx-auto mt-6 max-w-2xl text-sm text-stone-400">
              Booking actions stay near the top of the page so they are visible before the long
              profile detail grid. The waitlist is available in that hero booking panel.
            </p>
          )}
          <PublicSecondaryEntryCluster
            links={PUBLIC_SECONDARY_ENTRY_CONFIG.chef_profile}
            heading="Not sure yet?"
            theme="dark"
          />
        </div>
      </section>
    </div>
  )
}
