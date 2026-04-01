// Public Profile Preview - inline render of the /chef/[slug] page content.
// We render inline (not via iframe) because next.config.js sets X-Frame-Options: DENY
// globally, which would cause any same-origin iframe to be blocked by the browser.

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { PartnerShowcase } from '@/components/public/partner-showcase'
import { ReviewShowcase } from '@/components/public/review-showcase'
import { ChefCredentialsPanel } from '@/components/public/chef-credentials-panel'
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
import type { PublicReviewItem, PublicReviewStats } from '@/lib/reviews/public-actions'

type PublicProfileData = {
  chef: {
    display_name: string
    profile_image_url: string | null
    logo_url: string | null
    tagline: string | null
    bio: string | null
    website_url: string | null
    show_website_on_public_profile: boolean
    preferred_inquiry_destination: string | null
    portal_primary_color: string | null
    portal_background_color: string | null
    portal_background_image_url: string | null
    public_slug: string | null
    inquiry_slug: string | null
    discovery: {
      cuisine_types: string[]
      service_types: string[]
      price_range: string | null
      accepting_inquiries: boolean
      next_available_date: string | null
      lead_time_days: number | null
      service_area_city: string | null
      service_area_state: string | null
      service_area_radius_miles: number | null
      min_guest_count: number | null
      max_guest_count: number | null
      highlight_text: string | null
    }
  }
  partners: any[]
} | null

type ReviewFeed = {
  reviews: PublicReviewItem[]
  stats: PublicReviewStats
} | null

type CredentialsData = {
  workHistory: any[]
  achievements: any[]
  portfolio: any[]
  charityImpact: {
    totalHours: number
    totalEntries: number
    uniqueOrgs: number
    verified501cOrgs: number
    publicCharityPercent: number | null
    publicCharityNote: string | null
  }
  showResumeNote: boolean
}

type Props = {
  slug: string | null
  publicProfileData: PublicProfileData
  reviewFeed: ReviewFeed
  availabilitySignals: Array<{ id: string; start_date: string; public_note?: string | null }>
  deviceFrame: 'desktop' | 'mobile'
  credentialsData?: CredentialsData
}

function DetailChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200">
      {label}
    </span>
  )
}

export function PublicProfilePreview({
  slug,
  publicProfileData,
  reviewFeed,
  availabilitySignals,
  deviceFrame,
  credentialsData,
}: Props) {
  if (!slug) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-16 text-center">
        <div className="text-stone-300 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <p className="font-medium text-stone-300">No public profile URL set</p>
        <p className="text-sm text-stone-500 mt-2">
          Set up your profile URL to preview your public page.
        </p>
        <Link
          href="/settings/my-profile"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Go to My Profile
        </Link>
      </div>
    )
  }

  if (!publicProfileData) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-16 text-center">
        <p className="text-stone-500 text-sm">Could not load public profile preview.</p>
      </div>
    )
  }

  const { chef, partners } = publicProfileData
  const primaryColor = chef.portal_primary_color || '#1c1917'
  const backgroundColor = chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = chef.portal_background_image_url
  const hasWebsiteLink = Boolean(chef.website_url && chef.show_website_on_public_profile)
  const preferWebsite = chef.preferred_inquiry_destination === 'website_only'
  const publicSlug = chef.public_slug || slug

  const pageBackgroundStyle: CSSProperties = backgroundImageUrl
    ? {
        backgroundColor,
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.92)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { backgroundColor }

  const isMobile = deviceFrame === 'mobile'
  const discovery = chef.discovery
  const locationLabel = getDiscoveryLocationLabel(discovery as any)
  const guestCountLabel = getDiscoveryGuestCountLabel(discovery as any)
  const leadTimeLabel = getDiscoveryLeadTimeLabel(discovery as any)
  const priceRangeLabel = discovery.price_range
    ? getDiscoveryPriceRangeLabel(discovery.price_range)
    : null

  return (
    <div className={isMobile ? 'flex justify-center' : undefined}>
      <div
        className={[
          'rounded-xl border-2 border-stone-700 overflow-y-auto',
          isMobile ? 'w-[390px]' : 'w-full',
        ].join(' ')}
        style={{ maxHeight: '680px' }}
      >
        <div className="min-h-screen" style={pageBackgroundStyle}>
          <section className="py-16 md:py-24 bg-stone-900/70 backdrop-blur-[1px]">
            <div className="max-w-4xl mx-auto px-6 text-center">
              {chef.logo_url && (
                <div className="flex justify-center mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chef.logo_url}
                    alt={`${chef.display_name} logo`}
                    className="max-h-16 max-w-[220px] object-contain"
                  />
                </div>
              )}

              {chef.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={chef.profile_image_url}
                  alt={chef.display_name}
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
                <DetailChip label={getDiscoveryAvailabilityLabel(discovery as any)} />
                {priceRangeLabel && <DetailChip label={priceRangeLabel} />}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-stone-100">{chef.display_name}</h1>

              {chef.tagline && (
                <p className="text-lg md:text-xl text-stone-300 mt-3 max-w-2xl mx-auto">
                  {chef.tagline}
                </p>
              )}

              {discovery.highlight_text && (
                <p className="mt-4 max-w-3xl mx-auto text-sm uppercase tracking-[0.18em] text-brand-300">
                  {discovery.highlight_text}
                </p>
              )}

              {chef.bio && (
                <p className="text-stone-300 mt-6 max-w-xl mx-auto leading-relaxed">{chef.bio}</p>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {discovery.cuisine_types.slice(0, 4).map((value) => (
                  <DetailChip key={`cuisine-${value}`} label={getDiscoveryCuisineLabel(value)} />
                ))}
                {discovery.service_types.slice(0, 4).map((value) => (
                  <DetailChip
                    key={`service-${value}`}
                    label={getDiscoveryServiceTypeLabel(value)}
                  />
                ))}
              </div>
            </div>
          </section>

          {!discovery.accepting_inquiries && (
            <section className="px-6 pt-8">
              <div className="mx-auto max-w-4xl rounded-2xl border border-amber-800 bg-amber-950/70 p-5 text-amber-200">
                <p className="text-sm font-semibold uppercase tracking-wide">Availability notice</p>
                <p className="mt-2 text-sm">Public inquiries are currently paused for this chef.</p>
              </div>
            </section>
          )}

          {(locationLabel || guestCountLabel || leadTimeLabel || priceRangeLabel) && (
            <section className="py-12 px-6 bg-stone-900/70">
              <div className="max-w-5xl mx-auto grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {locationLabel && (
                  <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                    <p className="text-sm font-semibold text-stone-100">Service area</p>
                    <p className="mt-2 text-sm text-stone-300">{locationLabel}</p>
                  </div>
                )}
                {guestCountLabel && (
                  <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                    <p className="text-sm font-semibold text-stone-100">Guest range</p>
                    <p className="mt-2 text-sm text-stone-300">{guestCountLabel}</p>
                  </div>
                )}
                {leadTimeLabel && (
                  <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                    <p className="text-sm font-semibold text-stone-100">Lead time</p>
                    <p className="mt-2 text-sm text-stone-300">{leadTimeLabel}</p>
                  </div>
                )}
                {priceRangeLabel && (
                  <div className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                    <p className="text-sm font-semibold text-stone-100">Positioning</p>
                    <p className="mt-2 text-sm text-stone-300">{priceRangeLabel}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {credentialsData && (
            <ChefCredentialsPanel
              workHistory={credentialsData.workHistory}
              achievements={credentialsData.achievements}
              portfolio={credentialsData.portfolio}
              charityImpact={credentialsData.charityImpact}
              showResumeNote={credentialsData.showResumeNote}
              chefName={chef.display_name}
            />
          )}

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

          {reviewFeed && reviewFeed.reviews.length > 0 && (
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
                Choose a venue above or direct clients to your inquiry form.
              </p>
              {discovery.accepting_inquiries &&
                (!preferWebsite || !hasWebsiteLink) &&
                publicSlug && (
                  <a
                    href={`/chef/${publicSlug}/inquire`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-6 px-8 py-3 text-white rounded-lg font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Start inquiry
                  </a>
                )}
              {hasWebsiteLink && (
                <a
                  href={chef.website_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block px-8 py-3 rounded-lg font-medium border transition-colors ${preferWebsite ? 'mt-6' : 'mt-3'}`}
                  style={{
                    borderColor: primaryColor,
                    color: primaryColor,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }}
                >
                  Visit website
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
