// Public Chef Profile & Partner Showcase
// No authentication required — accessible to anyone with the URL
// Shows chef bio, partner venues with seasonal photos, and booking links

import { getPublicChefProfile } from '@/lib/profile/actions'
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PartnerShowcase } from '@/components/public/partner-showcase'
import { ReviewShowcase } from '@/components/public/review-showcase'
import { getPublicAvailabilitySignals } from '@/lib/calendar/entry-actions'
import { RemyPublicWidget } from '@/components/ai/remy-public-widget'
import { getOptimizedImageUrl, getOptimizedAvatar } from '@/lib/images/cloudinary'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const title = `${data.chef.display_name} — Private Chef | Book Now`
  const description =
    data.chef.tagline ||
    data.chef.bio ||
    `Book ${data.chef.display_name} for your next private dining experience. View menus, reviews, and availability on ChefFlow.`
  const profileUrl = `${BASE_URL}/chef/${params.slug}`
  const imageUrl = (data.chef as any).profile_image_url as string | undefined

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

/**
 * JSON-LD AggregateRating for SEO — enables star ratings in Google search results.
 * Only rendered when the chef has at least 1 review with a rating.
 */
function AggregateRatingJsonLd({
  chefName,
  averageRating,
  totalReviews,
  profileUrl,
}: {
  chefName: string
  averageRating: number
  totalReviews: number
  profileUrl: string
}) {
  if (totalReviews === 0 || averageRating === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: chefName,
    url: profileUrl,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(2),
      bestRating: '5',
      worstRating: '1',
      reviewCount: totalReviews,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function ChefProfilePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const { chef, partners } = data

  // Load reviews + availability in parallel
  const [reviewFeed, availabilitySignals] = await Promise.all([
    getPublicChefReviewFeed(chef.id),
    (chef as any).show_availability_signals
      ? getPublicAvailabilitySignals(chef.id)
      : Promise.resolve([]),
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

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <AggregateRatingJsonLd
        chefName={chef.display_name}
        averageRating={reviewFeed.stats.averageRating}
        totalReviews={reviewFeed.stats.totalReviews}
        profileUrl={`${BASE_URL}/chef/${params.slug}`}
      />

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-stone-900/70 backdrop-blur-[1px]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {(chef as any).logo_url && (
            <div className="flex justify-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOptimizedImageUrl((chef as any).logo_url, {
                  width: 440,
                  height: 128,
                  fit: 'fit',
                })}
                alt={`${chef.display_name} logo`}
                className="max-h-16 max-w-[220px] object-contain"
              />
            </div>
          )}

          {chef.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getOptimizedAvatar(chef.profile_image_url, 224)}
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

          <h1 className="text-4xl md:text-5xl font-bold text-stone-100">{chef.display_name}</h1>

          {chef.tagline && (
            <p className="text-lg md:text-xl text-stone-300 mt-3 max-w-2xl mx-auto">
              {chef.tagline}
            </p>
          )}

          {chef.bio && (
            <p className="text-stone-500 mt-6 max-w-xl mx-auto leading-relaxed">{chef.bio}</p>
          )}
        </div>
      </section>

      {/* Partner Showcase */}
      {partners.length > 0 && (
        <section className="py-16 px-6 bg-stone-900/70">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-stone-100">Where I Cook</h2>
              <p className="text-stone-300 mt-3 max-w-xl mx-auto">
                Book one of these amazing venues and enjoy a private dining experience with a
                personal chef
              </p>
            </div>

            <PartnerShowcase partners={partners as any} chefName={chef.display_name} />
          </div>
        </section>
      )}

      {/* Reviews & Testimonials */}
      {reviewFeed.reviews.length > 0 && (
        <section className="py-16 px-6 bg-stone-900/70">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-stone-100">Reviews & Testimonials</h2>
              <p className="text-stone-300 mt-3 max-w-xl mx-auto">
                What clients and guests are saying about {chef.display_name}
              </p>
            </div>

            <ReviewShowcase reviews={reviewFeed.reviews} stats={reviewFeed.stats} />
          </div>
        </section>
      )}

      {/* Available Dates (public availability signals) */}
      {availabilitySignals.length > 0 && (
        <section className="py-12 px-6 bg-stone-900/70">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-100">Available Dates</h2>
              <p className="text-stone-300 mt-2 text-sm">
                {chef.display_name} is actively seeking bookings for these dates.
              </p>
            </div>
            <div className="space-y-3">
              {availabilitySignals.map((signal) => {
                const dateLabel = new Date(signal.start_date + 'T00:00:00').toLocaleDateString(
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
                    <a
                      href={`/chef/${params.slug}/inquire?date=${signal.start_date}`}
                      className="flex-shrink-0 ml-4 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Inquire →
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 px-6 bg-stone-900/75">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-stone-100">Ready to Book?</h2>
          <p className="text-stone-300 mt-3">
            {partners.length > 0
              ? `Choose a venue above and hire ${chef.display_name} for an unforgettable dining experience, or submit a custom inquiry below.`
              : `Tell us about your event and ${chef.display_name} will be in touch.`}
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex w-full max-w-md gap-3">
              {(!preferWebsite || !hasWebsiteLink) && (
                <a
                  href={`/chef/${params.slug}/inquire`}
                  className="inline-block flex-1 px-6 py-3 text-white rounded-lg font-medium text-center transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Start your booking
                </a>
              )}
              <a
                href={`/chef/${params.slug}/gift-cards`}
                className="inline-block flex-1 px-6 py-3 rounded-lg font-medium text-center border transition-colors"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              >
                Give the gift of a private chef
              </a>
            </div>
            {hasWebsiteLink && (
              <a
                href={chef.website_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full max-w-md px-8 py-3 rounded-lg font-medium border transition-colors text-center"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              >
                Visit Official Website
              </a>
            )}
            {preferWebsite && hasWebsiteLink && !preferChefFlow && (
              <p className="text-xs text-stone-500">
                Prefer ChefFlow?{' '}
                <a
                  href={`/chef/${params.slug}/inquire`}
                  className="font-medium underline"
                  style={{ color: primaryColor }}
                >
                  Submit an inquiry here
                </a>
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <a
              href="/auth/client-signup"
              className="font-medium hover:opacity-80"
              style={{ color: primaryColor }}
            >
              Create client account
            </a>
            <span className="text-stone-300">&middot;</span>
            <a
              href={`/chef/${params.slug}/partner-signup`}
              className="font-medium hover:opacity-80"
              style={{ color: primaryColor }}
            >
              Become a partner
            </a>
          </div>
        </div>
      </section>

      {/* Remy Public Chat Widget */}
      <RemyPublicWidget tenantId={chef.id} chefName={chef.display_name} />
    </div>
  )
}
