// Public Chef Profile & Partner Showcase
// No authentication required - accessible to anyone with the URL
// Shows chef bio, partner venues with seasonal photos, and booking links

import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { PartnerShowcase } from '@/components/public/partner-showcase'
import { ReviewShowcase } from '@/components/public/review-showcase'
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
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'
import { ChefProofSummary } from '@/components/public/chef-proof-summary'
import { ChefCredentialsPanel } from '@/components/public/chef-credentials-panel'
import { DietaryTrustStrip } from '@/components/public/dietary-trust-strip'
import {
  getPublicWorkHistory,
  getPublicAchievements,
  getPublicCharityImpact,
} from '@/lib/credentials/actions'
import { getPublicPortfolio } from '@/lib/events/photo-actions'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const publicSlug = data.chef.public_slug || params.slug
  const title = `${data.chef.display_name} - Private Chef | ChefFlow`
  const description =
    data.chef.discovery.highlight_text ||
    data.chef.tagline ||
    data.chef.bio ||
    `Book ${data.chef.display_name}. View profile details, reviews, and availability on ChefFlow.`
  const profileUrl = `${BASE_URL}/chef/${publicSlug}`
  const imageUrl = data.chef.discovery.hero_image_url || data.chef.profile_image_url || undefined

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

function ChefProfileJsonLd({
  chefName,
  description,
  profileUrl,
  imageUrl,
  cuisines,
  serviceArea,
  priceRange,
  averageRating,
  totalReviews,
}: {
  chefName: string
  description: string | null
  profileUrl: string
  imageUrl: string | null
  cuisines: string[]
  serviceArea: string | null
  priceRange: string | null
  averageRating: number
  totalReviews: number
}) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FoodService',
    name: chefName,
    url: profileUrl,
    ...(description ? { description } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(cuisines.length > 0 ? { servesCuisine: cuisines } : {}),
    ...(serviceArea
      ? {
          areaServed: {
            '@type': 'Place',
            name: serviceArea,
          },
        }
      : {}),
    ...(priceRange ? { priceRange } : {}),
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
  const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Chef Directory', item: `${BASE}/chefs` },
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

export default async function ChefProfilePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const { chef, partners } = data
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
      } catch {
        return { showResumeAvailableNote: false }
      }
    })(),
  ])

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
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
  const cuisineLabels = discovery.cuisine_types.slice(0, 6).map(getDiscoveryCuisineLabel)
  const serviceLabels = discovery.service_types.slice(0, 6).map(getDiscoveryServiceTypeLabel)
  const profileUrl = `${BASE_URL}/chef/${publicSlug}`

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <ChefProfileJsonLd
        chefName={chef.display_name}
        description={discovery.highlight_text || chef.tagline || chef.bio || null}
        profileUrl={profileUrl}
        imageUrl={discovery.hero_image_url || chef.profile_image_url || null}
        cuisines={cuisineLabels}
        serviceArea={locationLabel || null}
        priceRange={priceRangeLabel}
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
            {discovery.review_count > 0 && discovery.avg_rating != null && (
              <DetailChip
                label={`${discovery.avg_rating.toFixed(1)} stars · ${discovery.review_count} reviews`}
              />
            )}
            {priceRangeLabel && <DetailChip label={priceRangeLabel} />}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-stone-100">{chef.display_name}</h1>

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

      {!discovery.accepting_inquiries && (
        <section className="px-6 pt-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-amber-800 bg-amber-950/70 p-5 text-amber-200">
            <p className="text-sm font-semibold uppercase tracking-wide">Availability notice</p>
            <p className="mt-2 text-sm">
              {chef.display_name} is not currently accepting new public inquiries.
              {discovery.next_available_date
                ? ` Next opening: ${new Date(
                    `${discovery.next_available_date}T00:00:00`
                  ).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}.`
                : ' Check back soon for updated availability.'}
            </p>
          </div>
        </section>
      )}

      {(locationLabel || guestCountLabel || leadTimeLabel || priceRangeLabel) && (
        <section className="py-12 px-6 bg-stone-900/70">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-stone-100">Chef Snapshot</h2>
              <p className="mt-3 max-w-2xl mx-auto text-stone-300">
                Practical details for planning the right fit before you reach out.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {locationLabel && (
                <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                  <p className="text-sm font-semibold text-stone-100">Service area</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-300">{locationLabel}</p>
                </div>
              )}
              {guestCountLabel && (
                <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                  <p className="text-sm font-semibold text-stone-100">Guest range</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-300">{guestCountLabel}</p>
                </div>
              )}
              {leadTimeLabel && (
                <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                  <p className="text-sm font-semibold text-stone-100">Lead time</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-300">{leadTimeLabel}</p>
                </div>
              )}
              {priceRangeLabel && (
                <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                  <p className="text-sm font-semibold text-stone-100">Positioning</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-300">{priceRangeLabel}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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

      {partners.length > 0 && (
        <section className="py-16 px-6 bg-stone-900/70">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-stone-100">Where I Cook</h2>
              <p className="text-stone-300 mt-3 max-w-xl mx-auto">
                Venues where {chef.display_name} is available for service.
              </p>
            </div>

            <PartnerShowcase partners={partners as any} chefName={chef.display_name} />
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

      <section className="py-16 px-6 bg-stone-900/75">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-stone-100">Ready to plan?</h2>
          <p className="text-stone-300 mt-3">
            {partners.length > 0
              ? 'Choose a venue above or send a custom inquiry below.'
              : `Tell us about your event and ${chef.display_name} will be in touch.`}
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex w-full max-w-md gap-3">
              {discovery.accepting_inquiries && (!preferWebsite || !hasWebsiteLink) && (
                <TrackedLink
                  href={`/chef/${publicSlug}/inquire`}
                  analyticsName="public_profile_start_inquiry"
                  analyticsProps={{ chef_slug: publicSlug, inquiry_slug: inquirySlug }}
                  className="inline-block flex-1 px-6 py-3 text-white rounded-lg font-medium text-center transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Start inquiry
                </TrackedLink>
              )}
              <TrackedLink
                href={`/chef/${publicSlug}/gift-cards`}
                analyticsName="public_profile_gift_cards"
                analyticsProps={{ chef_slug: publicSlug }}
                className="inline-block flex-1 px-6 py-3 rounded-lg font-medium text-center border transition-colors"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              >
                Gift cards
              </TrackedLink>
            </div>
            {hasWebsiteLink && (
              <TrackedLink
                href={chef.website_url!}
                analyticsName="public_profile_website"
                analyticsProps={{ chef_slug: publicSlug }}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full max-w-md px-8 py-3 rounded-lg font-medium border transition-colors text-center"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              >
                Visit website
              </TrackedLink>
            )}
            {preferWebsite &&
              hasWebsiteLink &&
              !preferChefFlow &&
              discovery.accepting_inquiries && (
                <p className="text-xs text-stone-500">
                  Want to use ChefFlow instead?{' '}
                  <TrackedLink
                    href={`/chef/${publicSlug}/inquire`}
                    analyticsName="public_profile_secondary_inquiry"
                    analyticsProps={{ chef_slug: publicSlug }}
                    className="font-medium underline"
                    style={{ color: primaryColor }}
                  >
                    Send inquiry here
                  </TrackedLink>
                </p>
              )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <TrackedLink
              href="/auth/client-signup"
              analyticsName="public_profile_client_account"
              analyticsProps={{ chef_slug: publicSlug }}
              className="font-medium hover:opacity-80"
              style={{ color: primaryColor }}
            >
              Client account
            </TrackedLink>
            <span className="text-stone-300">&middot;</span>
            <TrackedLink
              href={`/chef/${publicSlug}/partner-signup`}
              analyticsName="public_profile_partner_signup"
              analyticsProps={{ chef_slug: publicSlug }}
              className="font-medium hover:opacity-80"
              style={{ color: primaryColor }}
            >
              Partner signup
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  )
}
