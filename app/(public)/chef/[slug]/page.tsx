// Public Chef Profile & Partner Showcase
// No authentication required - accessible to anyone with the URL
// Shows chef bio, partner venues with seasonal photos, and booking links

import type { Metadata } from 'next'
import Image from 'next/image'
import type { ReactNode } from 'react'
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
import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-navigation-config'
import { absoluteUrl } from '@/lib/site/public-site'
import {
  CalendarCheck,
  ExternalLink,
  Gift,
  Globe,
  Mail,
  ShoppingBag,
  Store,
} from '@/components/ui/icons'
import type { ChefSocialLinks } from '@/lib/chef/profile-types'

type Props = {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}

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
              {row.value || row.emptyText || 'Ask during inquiry.'}
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

  return 'Ask before payment.'
}

function formatLastActive(dateValue: string | null): string {
  if (!dateValue) return 'No recent public activity signal'

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return 'No recent public activity signal'

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
  return 'Ask before payment.'
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

type PublicExternalPresenceLink = {
  key: string
  label: string
  href: string
  category: 'website' | 'social' | 'video' | 'proof' | 'booking' | 'links'
}

const SOCIAL_LINK_METADATA: Record<
  string,
  { label: string; category: PublicExternalPresenceLink['category']; order: number }
> = {
  instagram: { label: 'Instagram', category: 'social', order: 10 },
  youtube: { label: 'YouTube', category: 'video', order: 20 },
  linkedin: { label: 'LinkedIn', category: 'social', order: 30 },
  tiktok: { label: 'TikTok', category: 'social', order: 40 },
  facebook: { label: 'Facebook', category: 'social', order: 50 },
  x: { label: 'X', category: 'social', order: 60 },
  threads: { label: 'Threads', category: 'social', order: 70 },
  pinterest: { label: 'Pinterest', category: 'social', order: 80 },
  substack: { label: 'Newsletter', category: 'proof', order: 90 },
  press: { label: 'Press', category: 'proof', order: 100 },
  bookingPlatform: { label: 'External booking platform', category: 'booking', order: 110 },
  linktree: { label: 'Link hub', category: 'links', order: 120 },
}

function buildExternalPresenceLinks(input: {
  socialLinks: ChefSocialLinks | null | undefined
  websiteUrl?: string | null
  includeWebsite?: boolean
}): PublicExternalPresenceLink[] {
  const links: Array<PublicExternalPresenceLink & { order: number }> = []

  if (input.includeWebsite && input.websiteUrl?.trim()) {
    links.push({
      key: 'website',
      label: 'Website',
      href: input.websiteUrl.trim(),
      category: 'website',
      order: 0,
    })
  }

  for (const [key, value] of Object.entries(input.socialLinks ?? {})) {
    if (key === 'custom' || typeof value !== 'string' || !value.trim()) continue
    const metadata = SOCIAL_LINK_METADATA[key] ?? {
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
      category: 'links' as const,
      order: 200,
    }
    links.push({
      key,
      label: metadata.label,
      href: value.trim(),
      category: metadata.category,
      order: metadata.order,
    })
  }

  for (const [index, link] of (input.socialLinks?.custom ?? []).entries()) {
    if (!link.label.trim() || !link.url.trim()) continue
    links.push({
      key: `custom-${index}`,
      label: link.label.trim(),
      href: link.url.trim(),
      category: 'links',
      order: 300 + index,
    })
  }

  return links.sort((a, b) => a.order - b.order).map(({ order: _order, ...link }) => link)
}

function getSingleSearchValue(searchParams: Props['searchParams'], key: string): string | null {
  const value = searchParams?.[key]
  if (Array.isArray(value)) return value[0] || null
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizePublicHubSource(searchParams: Props['searchParams']): string {
  const raw =
    getSingleSearchValue(searchParams, 'source') ||
    getSingleSearchValue(searchParams, 'utm_source') ||
    'direct'
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 32) || 'direct'
  )
}

function isPublicHubView(searchParams: Props['searchParams']): boolean {
  const view = getSingleSearchValue(searchParams, 'view')
  return view === 'hub' || view === 'links'
}

function withHubSource(href: string, source: string): string {
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}source=${encodeURIComponent(source)}`
}

function PublicHubAction({
  href,
  label,
  description,
  icon,
  analyticsName,
  analyticsProps,
  primary = false,
  external = false,
}: {
  href: string
  label: string
  description?: string
  icon: ReactNode
  analyticsName: string
  analyticsProps: Record<string, string | number | boolean | null>
  primary?: boolean
  external?: boolean
}) {
  return (
    <TrackedLink
      href={href}
      analyticsName={analyticsName}
      analyticsProps={analyticsProps}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={[
        'group flex min-h-[64px] w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950',
        primary
          ? 'border-brand-300 bg-brand-400 text-stone-950 shadow-[0_18px_44px_rgba(232,143,71,0.26)] hover:bg-brand-300 focus-visible:ring-brand-200'
          : 'border-stone-700 bg-stone-900/90 text-stone-100 hover:border-stone-500 hover:bg-stone-800 focus-visible:ring-stone-300',
      ].join(' ')}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            primary ? 'bg-stone-950/10 text-stone-950' : 'bg-stone-800 text-stone-200',
          ].join(' ')}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">{label}</span>
          {description && (
            <span
              className={[
                'mt-1 block text-xs leading-relaxed',
                primary ? 'text-stone-800' : 'text-stone-400',
              ].join(' ')}
            >
              {description}
            </span>
          )}
        </span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
    </TrackedLink>
  )
}

function PublicChefHub({
  chefId,
  publicSlug,
  inquirySlug,
  source,
  chefName,
  businessName,
  tagline,
  bio,
  profileImageUrl,
  locationLabel,
  cuisineLabels,
  serviceLabels,
  buyerStartingPriceLabel,
  reviewCount,
  averageRating,
  portfolioCount,
  acceptingInquiries,
  bookingEnabled,
  bookingSlug,
  bookingModel,
  hasWebsiteLink,
  websiteUrl,
  socialLinks,
}: {
  chefId: string
  publicSlug: string
  inquirySlug: string
  source: string
  chefName: string
  businessName: string | null
  tagline: string | null
  bio: string | null
  profileImageUrl: string | null
  locationLabel: string | null
  cuisineLabels: string[]
  serviceLabels: string[]
  buyerStartingPriceLabel: string | null
  reviewCount: number
  averageRating: number
  portfolioCount: number
  acceptingInquiries: boolean
  bookingEnabled: boolean
  bookingSlug: string | null
  bookingModel: string | null
  hasWebsiteLink: boolean
  websiteUrl: string | null
  socialLinks: ChefSocialLinks
}) {
  const analyticsProps = { chef_slug: publicSlug, public_hub_source: source }
  const avatarUrl = profileImageUrl ? getOptimizedAvatar(profileImageUrl, 220) : null
  const externalPresenceLinks = buildExternalPresenceLinks({ socialLinks })
  const proofItems = [
    reviewCount > 0
      ? {
          label: 'Reviews',
          value: `${averageRating.toFixed(1)} from ${reviewCount}`,
        }
      : null,
    portfolioCount > 0
      ? {
          label: 'Portfolio',
          value: `${portfolioCount} public ${portfolioCount === 1 ? 'highlight' : 'highlights'}`,
        }
      : null,
    buyerStartingPriceLabel ? { label: 'Starting from', value: buyerStartingPriceLabel } : null,
    locationLabel ? { label: 'Service area', value: locationLabel } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item))
  const chips = dedupeStrings([...cuisineLabels, ...serviceLabels]).slice(0, 6)
  const primaryActionLabel =
    bookingEnabled && bookingSlug
      ? bookingModel === 'instant_book'
        ? 'Book instantly'
        : 'Book now'
      : acceptingInquiries
        ? 'Request event'
        : 'Join waitlist'

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-6 text-stone-100 sm:px-6">
      <PublicPageView
        pageName="chef_profile_hub"
        properties={{ chef_slug: publicSlug, public_hub_source: source }}
      />
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col">
        <section className="flex flex-1 flex-col justify-center">
          <div className="rounded-[2rem] border border-stone-800 bg-stone-900/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={chefName}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-3xl border border-stone-700 object-cover"
                  priority
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-stone-700 bg-stone-950 text-3xl font-semibold text-stone-300">
                  {chefName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
                  Chef link hub
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{chefName}</h1>
                {businessName && businessName !== chefName && (
                  <p className="mt-1 text-sm font-medium text-stone-400">{businessName}</p>
                )}
              </div>
            </div>
            {tagline && <p className="mt-4 text-sm leading-relaxed text-stone-200">{tagline}</p>}
            {!tagline && bio && (
              <p className="mt-4 text-sm leading-relaxed text-stone-300">{clampText(bio, 150)}</p>
            )}
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Primary path: {primaryActionLabel}
            </p>
          </div>

          {chips.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          {proofItems.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-2">
              {proofItems.slice(0, 4).map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-stone-800 bg-stone-900 p-3"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold leading-relaxed text-stone-100">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6 space-y-3">
            {bookingEnabled && bookingSlug && (
              <PublicHubAction
                href={withHubSource(`/book/${bookingSlug}`, source)}
                label={bookingModel === 'instant_book' ? 'Book instantly' : 'Book now'}
                description="Start with the chef's public booking flow."
                icon={<CalendarCheck className="h-5 w-5" />}
                analyticsName="public_hub_book"
                analyticsProps={analyticsProps}
                primary
              />
            )}
            {acceptingInquiries && (
              <PublicHubAction
                href={withHubSource(`/chef/${inquirySlug}/inquire`, source)}
                label="Request a private event"
                description="Share date, location, guest count, and budget."
                icon={<Mail className="h-5 w-5" />}
                analyticsName="public_hub_inquiry"
                analyticsProps={analyticsProps}
                primary={!bookingEnabled || !bookingSlug}
              />
            )}
            {!acceptingInquiries && (
              <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
                <ChefAvailabilityWaitlist chefId={chefId} chefName={chefName} />
              </div>
            )}
            <PublicHubAction
              href={withHubSource(`/chef/${publicSlug}/gift-cards`, source)}
              label="Buy a gift card"
              description="Give a future private chef experience."
              icon={<Gift className="h-5 w-5" />}
              analyticsName="public_hub_gift_cards"
              analyticsProps={analyticsProps}
            />
            <PublicHubAction
              href={withHubSource(`/chef/${publicSlug}/store`, source)}
              label="Shop the chef's store"
              description="Browse public products, drops, and orders."
              icon={<Store className="h-5 w-5" />}
              analyticsName="public_hub_store"
              analyticsProps={analyticsProps}
            />
            <PublicHubAction
              href={`/chef/${publicSlug}`}
              label="View full profile"
              description="See reviews, portfolio, menus, policies, and proof."
              icon={<ShoppingBag className="h-5 w-5" />}
              analyticsName="public_hub_full_profile"
              analyticsProps={analyticsProps}
            />
            {hasWebsiteLink && websiteUrl && (
              <PublicHubAction
                href={websiteUrl}
                label="Visit website"
                description="Open the chef's external site."
                icon={<Globe className="h-5 w-5" />}
                analyticsName="public_hub_website"
                analyticsProps={analyticsProps}
                external
              />
            )}
          </div>

          {externalPresenceLinks.length > 0 && (
            <div className="mt-6">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Chef's Sites, Socials, and Press
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {externalPresenceLinks.map((link) => (
                  <TrackedLink
                    key={link.key}
                    href={link.href}
                    analyticsName={`public_hub_external_${link.key}`}
                    analyticsProps={{ ...analyticsProps, external_link_category: link.category }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-center text-xs font-semibold capitalize text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
                  >
                    {link.label}
                  </TrackedLink>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default async function ChefProfilePage({ params, searchParams }: Props) {
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
        ? 'Ask before payment.'
        : null
  const reschedulePolicy =
    buyerSignals.service.hasReschedulePolicy === true
      ? buyerSignals.service.rescheduleTerms ||
        'A reschedule policy is published; full terms are shared directly with the chef.'
      : buyerSignals.service.hasReschedulePolicy === false
        ? 'Ask before payment.'
        : null
  const responseTimeLabel =
    buyerSignals.operations.responseTime != null
      ? `Usually ${buyerSignals.operations.responseTime}`
      : null
  const travelRadiusLabel =
    buyerSignals.service.travelRadiusMiles != null
      ? `${buyerSignals.service.travelRadiusMiles} miles before added travel fees`
      : null
  const travelFeeLabel =
    buyerSignals.service.travelFeeCents != null
      ? `${formatCurrency(buyerSignals.service.travelFeeCents)} published travel fee`
      : buyerSignals.service.travelRadiusMiles != null
        ? 'Travel fees may apply outside the included radius.'
        : null
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
  const externalPresenceLinks = buildExternalPresenceLinks({
    socialLinks: chef.social_links as ChefSocialLinks,
    websiteUrl: chef.website_url,
    includeWebsite: hasWebsiteLink,
  })
  const publishedLinks = externalPresenceLinks.map((link) => link.href)
  const heroSummaryLine = [
    locationLabel ? `Serves ${locationLabel}` : null,
    guestCountLabel ? `Events for ${guestCountLabel}` : null,
    buyerStartingPriceLabel ? `From ${buyerStartingPriceLabel}` : null,
  ]
    .filter(Boolean)
    .join(' - ')
  const heroVisualUrl =
    optimizedBgUrl ||
    (typeof discovery.hero_image_url === 'string' ? discovery.hero_image_url : null) ||
    portfolio.find((photo) => Boolean(photo.signedUrl))?.signedUrl ||
    showcaseMenus.find((menu) => Boolean(menu.photoUrl))?.photoUrl ||
    chef.profile_image_url
  const optimizedHeroVisualUrl = heroVisualUrl
    ? getOptimizedImageUrl(heroVisualUrl, { width: 1800, quality: 'auto', format: 'auto' })
    : null
  const featuredPortfolioPhotos = portfolio.filter((photo) => Boolean(photo.signedUrl)).slice(0, 3)
  const featuredMenuPhotos = showcaseMenus.filter((menu) => Boolean(menu.photoUrl)).slice(0, 3)
  const hasVisualProof = featuredPortfolioPhotos.length > 0 || featuredMenuPhotos.length > 0
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
              : 'Shared after inquiry',
        },
        {
          label: 'Starting from',
          value: buyerStartingPriceLabel || 'Quote shared after scope review',
        },
      ]
    : [
        { label: 'Availability', value: nextAvailableLabel || 'Join the waitlist for updates' },
        {
          label: 'Response',
          value:
            buyerSignals.operations.responseTime != null
              ? buyerSignals.operations.responseTime
              : 'Shared after inquiry',
        },
        { label: 'Lead time', value: leadTimeLabel || 'Shared directly before booking' },
      ]
  const responseExpectationCopy =
    buyerSignals.operations.responseTime != null
      ? `${chef.display_name} publishes a response window of ${buyerSignals.operations.responseTime}.`
      : 'Sharing complete event details helps the chef evaluate fit faster.'
  const inquiryStageCopy =
    buyerSignals.operations.responseTime != null
      ? `Starting an inquiry does not charge your card or confirm the event. ${chef.display_name} publishes a response window of ${buyerSignals.operations.responseTime}.`
      : 'Starting an inquiry does not charge your card or confirm the event. The chef reviews fit, timing, and scope before sending next steps.'
  const publicHubSource = normalizePublicHubSource(searchParams)
  const mobilePrimaryHref =
    chef.booking_enabled && chef.booking_slug
      ? `/book/${chef.booking_slug}`
      : showWebsitePrimaryCta
        ? chef.website_url
        : showDirectInquiryCta
          ? `/chef/${publicSlug}/inquire`
          : null
  const mobilePrimaryLabel =
    chef.booking_enabled && chef.booking_slug
      ? chef.booking_model === 'instant_book'
        ? 'Book instantly'
        : 'Book now'
      : showWebsitePrimaryCta
        ? 'Visit website'
        : showDirectInquiryCta
          ? 'Start inquiry'
          : null

  if (isPublicHubView(searchParams)) {
    return (
      <PublicChefHub
        chefId={chef.id}
        publicSlug={publicSlug}
        inquirySlug={inquirySlug}
        source={publicHubSource}
        chefName={chef.display_name}
        businessName={chef.business_name}
        tagline={chef.tagline}
        bio={chef.bio}
        profileImageUrl={chef.profile_image_url}
        locationLabel={locationLabel}
        cuisineLabels={cuisineLabels}
        serviceLabels={serviceLabels}
        buyerStartingPriceLabel={buyerStartingPriceLabel}
        reviewCount={reviewFeed.stats.totalReviews}
        averageRating={reviewFeed.stats.averageRating}
        portfolioCount={portfolio.length}
        acceptingInquiries={discovery.accepting_inquiries}
        bookingEnabled={chef.booking_enabled}
        bookingSlug={chef.booking_slug}
        bookingModel={chef.booking_model}
        hasWebsiteLink={hasWebsiteLink}
        websiteUrl={chef.website_url}
        socialLinks={(chef.social_links ?? {}) as ChefSocialLinks}
      />
    )
  }

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

      <section className="relative overflow-hidden bg-stone-950">
        {optimizedHeroVisualUrl && (
          <Image
            src={optimizedHeroVisualUrl}
            alt={`${chef.display_name} event preview`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,10,9,0.96),rgba(12,10,9,0.72),rgba(12,10,9,0.34))]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-stone-950 to-transparent" />

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-end gap-10 px-6 pb-14 pt-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:pb-12">
          <div className="max-w-3xl">
            {chef.logo_url && (
              <Image
                src={getOptimizedImageUrl(chef.logo_url, {
                  width: 440,
                  height: 128,
                  fit: 'fit',
                })}
                alt={`${chef.display_name} logo`}
                width={220}
                height={64}
                className="mb-8 max-h-16 max-w-[220px] object-contain"
              />
            )}

            <div className="mb-5 flex flex-wrap gap-2">
              <DetailChip label={availabilityLabel} />
              {chef.booking_enabled &&
                chef.booking_slug &&
                chef.booking_model === 'instant_book' && (
                  <span className="rounded-full border border-emerald-600/50 bg-emerald-950/60 px-3 py-1.5 text-xs font-medium text-emerald-300">
                    Instant booking available
                  </span>
                )}
              {reviewFeed.stats.totalReviews > 0 && reviewFeed.stats.averageRating > 0 && (
                <DetailChip
                  label={`${reviewFeed.stats.averageRating.toFixed(1)} stars - ${reviewFeed.stats.totalReviews} reviews`}
                />
              )}
              {buyerStartingPriceLabel && <DetailChip label={`From ${buyerStartingPriceLabel}`} />}
              {buyerSignals.verification.badges[0] && (
                <DetailChip label={buyerSignals.verification.badges[0].label} />
              )}
            </div>

            <h1 className="max-w-4xl text-5xl font-bold leading-[0.96] tracking-tight text-stone-100 sm:text-6xl lg:text-7xl">
              {chef.display_name}
            </h1>

            {chef.archetype && (
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-brand-300">
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
              <p className="mt-5 max-w-2xl text-xl leading-relaxed text-stone-200 sm:text-2xl">
                {chef.tagline}
              </p>
            )}

            {discovery.highlight_text && discovery.highlight_text !== chef.tagline && (
              <p className="mt-4 max-w-3xl text-sm font-semibold uppercase tracking-[0.18em] text-brand-300">
                {discovery.highlight_text}
              </p>
            )}

            {chef.bio && (
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-300">
                {clampText(chef.bio, 360)}
              </p>
            )}

            {heroSummaryLine && (
              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-stone-300">
                {heroSummaryLine}
              </p>
            )}

            {(cuisineLabels.length > 0 || serviceLabels.length > 0) && (
              <div className="mt-7 flex flex-wrap gap-2">
                {cuisineLabels.slice(0, 4).map((label) => (
                  <DetailChip key={`cuisine-${label}`} label={label} />
                ))}
                {serviceLabels.slice(0, 4).map((label) => (
                  <DetailChip key={`service-${label}`} label={label} />
                ))}
              </div>
            )}

            {externalPresenceLinks.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {externalPresenceLinks.map((link) => (
                  <TrackedLink
                    key={link.key}
                    href={link.href}
                    analyticsName={`public_profile_external_${link.key}`}
                    analyticsProps={{
                      chef_slug: publicSlug,
                      external_link_category: link.category,
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] items-center rounded-full border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs font-semibold text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
                  >
                    {link.label}
                  </TrackedLink>
                ))}
              </div>
            )}
          </div>

          <div
            className="rounded-[2rem] border border-stone-200/70 p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-7"
            style={{ backgroundColor: 'rgba(255, 251, 235, 0.96)' }}
          >
            <div className="flex items-center gap-4">
              {chef.profile_image_url ? (
                <Image
                  src={getOptimizedAvatar(chef.profile_image_url, 160)}
                  alt={chef.display_name}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-900 text-2xl font-bold text-stone-200">
                  {chef.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Booking
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
                  {heroBookingTitle}
                </h2>
              </div>
            </div>
            <p
              id="hero-booking-description"
              className="mt-5 text-sm leading-relaxed text-stone-700 sm:text-base"
            >
              {heroBookingIntro}
            </p>

            <div className="mt-6 space-y-3">
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
                  Start inquiry
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

              <TrackedLink
                href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
                analyticsName="public_profile_browse_to_booking"
                analyticsProps={{ chef_slug: publicSlug }}
                className="inline-flex w-full items-center justify-center text-sm font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-none"
                style={{ color: primaryColor }}
              >
                Need help choosing? {PUBLIC_PRIMARY_CONSUMER_CTA.label}
              </TrackedLink>
            </div>

            <div className="mt-5 grid gap-3">
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
      </section>

      {hasVisualProof && (
        <section className="relative z-10 -mt-8 px-6 pb-12">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-stone-700 bg-stone-950/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur">
            <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
                  Visual proof
                </p>
                <h2 className="mt-2 text-2xl font-bold text-stone-100">Food, rooms, and moments</h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-stone-400">
                Recent public photos and showcased menus appear before the logistics, so clients can
                judge style before reading policy details.
              </p>
            </div>

            {featuredPortfolioPhotos.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {featuredPortfolioPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className={`relative overflow-hidden rounded-2xl bg-stone-900 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                  >
                    <Image
                      src={photo.signedUrl}
                      alt={photo.caption ?? `${chef.display_name} portfolio photo`}
                      width={index === 0 ? 960 : 520}
                      height={index === 0 ? 640 : 320}
                      sizes={
                        index === 0
                          ? '(max-width: 768px) 100vw, 66vw'
                          : '(max-width: 768px) 100vw, 33vw'
                      }
                      className="h-full min-h-[220px] w-full object-cover"
                    />
                    {(photo.caption || photo.event_occasion) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        {photo.caption && (
                          <p className="text-sm font-semibold text-white">{photo.caption}</p>
                        )}
                        {photo.event_occasion && (
                          <p className="mt-1 text-xs text-white/70">{photo.event_occasion}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {featuredMenuPhotos.map((menu) => (
                  <div
                    key={menu.id}
                    className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900"
                  >
                    <div className="relative aspect-[4/3]">
                      <CloudinaryFetchImage
                        src={menu.photoUrl!}
                        alt={`${menu.name} showcase menu`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        aspectRatio={4 / 3}
                        fit="fill"
                        gravity="auto"
                        defaultQuality={90}
                        maxWidth={900}
                        quality={90}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-stone-100">{menu.name}</p>
                      {menu.description && (
                        <p className="mt-2 text-xs leading-relaxed text-stone-400">
                          {clampText(menu.description, 120)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

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
            <h2 className="text-3xl font-bold text-stone-100">Plan With Confidence</h2>
            <p className="mt-3 max-w-2xl mx-auto text-stone-300">
              Clear answers to the questions clients ask before choosing a private chef.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">What does it usually cost?</p>
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
                  Use the inquiry form to request a quote with your guest count, menu style, and
                  location.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">Can this chef handle my event?</p>
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
                  Share the event location, format, and guest count so the chef can confirm fit.
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
              <p className="text-sm font-semibold text-stone-100">What is included?</p>
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
                  Ask what is included, what equipment is provided, and whether added staff is
                  needed.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">What can I book?</p>
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
                  Ask about menu direction, dietary handling, and planning touchpoints in the
                  inquiry.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">What happens next?</p>
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
                  Share complete event details up front so the chef can respond with the right next
                  step.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <p className="text-sm font-semibold text-stone-100">
                What should I know before paying?
              </p>
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
                  Review deposit, cancellation, travel, grocery, and gratuity terms in writing
                  before payment.
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
                    emptyText: 'Ask the chef for current insurance details.',
                  },
                  {
                    label: 'Current certifications',
                    value:
                      buyerSignals.verification.activeCertificationCount > 0
                        ? `${buyerSignals.verification.activeCertificationCount} active record${buyerSignals.verification.activeCertificationCount === 1 ? '' : 's'} on file`
                        : null,
                    emptyText: 'Ask the chef for current certification details.',
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
                Ask about current menu formats, seasonal dishes, or dietary customization.
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
                    className="flex flex-col gap-3 bg-green-950 border border-green-200 rounded-xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
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
                      className="w-full flex-shrink-0 px-4 py-2 text-center text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 sm:w-auto"
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

      {mobilePrimaryHref && mobilePrimaryLabel && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-700 bg-stone-950/95 px-4 py-3 shadow-[0_-16px_40px_rgba(0,0,0,0.28)] backdrop-blur md:hidden">
          <TrackedLink
            href={mobilePrimaryHref}
            analyticsName="public_profile_mobile_primary_cta"
            analyticsProps={{ chef_slug: publicSlug }}
            target={showWebsitePrimaryCta ? '_blank' : undefined}
            rel={showWebsitePrimaryCta ? 'noopener noreferrer' : undefined}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-5 py-3 text-center text-base font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {mobilePrimaryLabel}
          </TrackedLink>
        </div>
      )}
    </div>
  )
}
