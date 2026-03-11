// Public Chef Profile and Partner Showcase
// No authentication required. Shows chef bio, social proof, featured offer, and booking links.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FeaturedBookingMenuCard } from '@/components/public/featured-booking-menu-card'
import { PartnerShowcase } from '@/components/public/partner-showcase'
import { ReviewShowcase } from '@/components/public/review-showcase'
import { getPublicAvailabilitySignals } from '@/lib/calendar/entry-actions'
import { getOptimizedAvatar, getOptimizedImageUrl } from '@/lib/images/cloudinary'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const title = `${data.chef.display_name} - Private Chef | Book Now`
  const description =
    data.featured_menu_showcase.title ||
    data.chef.tagline ||
    data.chef.bio ||
    `Book ${data.chef.display_name}. View profile details, reviews, and availability on ChefFlow.`
  const profileUrl = `${baseUrl}/chef/${params.slug}`
  const imageUrl = data.chef.profile_image_url || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: data.chef.display_name || 'ChefFlow',
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

  const { chef, partners, featured_menu_showcase: featuredShowcase } = data
  const featuredMenu = data.featured_menu

  const [reviewFeed, availabilitySignals] = await Promise.all([
    getPublicChefReviewFeed(chef.id),
    chef.show_availability_signals ? getPublicAvailabilitySignals(chef.id) : Promise.resolve([]),
  ])

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const primaryColor = chef.portal_primary_color || '#1c1917'
  const backgroundColor = chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = chef.portal_background_image_url
  const optimizedBgUrl = backgroundImageUrl
    ? getOptimizedImageUrl(backgroundImageUrl, { width: 1920, quality: 'auto', format: 'auto' })
    : null
  const hasWebsiteLink = Boolean(chef.website_url && chef.show_website_on_public_profile)
  const preferWebsite = chef.preferred_inquiry_destination === 'website_only'
  const preferChefFlow = chef.preferred_inquiry_destination === 'chefflow_only'
  const featuredMenuHref = featuredMenu
    ? chef.booking_enabled && chef.booking_slug
      ? `/book/${chef.booking_slug}?menu=${featuredMenu.id}`
      : `/chef/${params.slug}/inquire?menu=${featuredMenu.id}`
    : null
  const featuredMenuLabel =
    chef.booking_enabled && chef.booking_model === 'instant_book'
      ? 'Book signature menu'
      : 'Request signature menu'
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
        profileUrl={`${baseUrl}/chef/${params.slug}`}
      />

      <section className="bg-stone-900/72 py-16 backdrop-blur-[1px] md:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          {chef.logo_url && (
            <div className="mb-6 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOptimizedImageUrl(chef.logo_url, {
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
              className="mx-auto mb-6 h-28 w-28 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-stone-700 ring-4 ring-white shadow-lg">
              <span className="text-3xl font-bold text-stone-500">
                {chef.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <h1 className="text-4xl font-bold text-stone-100 md:text-5xl">{chef.display_name}</h1>

          {chef.tagline && (
            <p className="mx-auto mt-3 max-w-2xl text-lg text-stone-300 md:text-xl">
              {chef.tagline}
            </p>
          )}

          {chef.bio && (
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-stone-400">{chef.bio}</p>
          )}

          {(featuredMenuHref || !preferWebsite || !hasWebsiteLink || hasWebsiteLink) && (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {featuredMenuHref && (
                <a
                  href={featuredMenuHref}
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {featuredMenuLabel}
                </a>
              )}
              {(!preferWebsite || !hasWebsiteLink) && (
                <a
                  href={`/chef/${params.slug}/inquire`}
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-stone-600 bg-white/95 px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-white"
                >
                  Start custom inquiry
                </a>
              )}
              {hasWebsiteLink && (
                <a
                  href={chef.website_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-stone-600 bg-stone-950/60 px-6 py-3 text-sm font-medium text-stone-100 transition-colors hover:bg-stone-900"
                >
                  Visit website
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {featuredMenu && featuredMenuHref && (
        <section className="bg-stone-900/76 px-6 py-14">
          <div className="mx-auto max-w-5xl space-y-5">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                Featured Offer
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-100">
                {featuredShowcase.title ||
                  `Start with a menu ${chef.display_name} is already ready to cook`}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
                {featuredShowcase.pitch ||
                  'This is the fastest way to move from interest to booked. Start from a menu the chef already wants to sell, then customize only if needed.'}
              </p>
            </div>

            <FeaturedBookingMenuCard
              menu={featuredMenu}
              primaryColor={primaryColor}
              eyebrow={featuredShowcase.badge || 'Signature Offer'}
              title={featuredShowcase.title || featuredMenu.name}
              description={
                featuredShowcase.pitch ||
                `This is a menu ${chef.display_name} is already excited to cook. If you want less back-and-forth and a faster path to booking, start here.`
              }
              primaryAction={{ href: featuredMenuHref, label: featuredMenuLabel }}
              secondaryAction={{ href: `/chef/${params.slug}/inquire`, label: 'Custom inquiry' }}
            />
          </div>
        </section>
      )}

      {partners.length > 0 && (
        <section className="bg-stone-900/70 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-stone-100">Where I Cook</h2>
              <p className="mx-auto mt-3 max-w-xl text-stone-300">
                Venues where {chef.display_name} is available for service.
              </p>
            </div>

            <PartnerShowcase partners={partners as any} chefName={chef.display_name} />
          </div>
        </section>
      )}

      {reviewFeed.reviews.length > 0 && (
        <section className="bg-stone-900/70 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold text-stone-100">Client Reviews</h2>
              <p className="mx-auto mt-3 max-w-xl text-stone-300">
                Feedback from recent clients and guests.
              </p>
            </div>

            <ReviewShowcase reviews={reviewFeed.reviews} stats={reviewFeed.stats} />
          </div>
        </section>
      )}

      {availabilitySignals.length > 0 && (
        <section className="bg-stone-900/70 px-6 py-12">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-stone-100">Available Dates</h2>
              <p className="mt-2 text-sm text-stone-300">
                Open dates currently available for booking.
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
                    className="flex items-center justify-between rounded-xl border border-green-200 bg-green-950 px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold text-stone-100">{dateLabel}</p>
                      {signal.public_note && (
                        <p className="mt-0.5 text-sm text-stone-300">{signal.public_note}</p>
                      )}
                    </div>
                    <a
                      href={`/chef/${params.slug}/inquire?date=${signal.start_date}`}
                      className="ml-4 flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Inquire
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="bg-stone-900/75 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-stone-100">Ready to book?</h2>
          <p className="mt-3 text-stone-300">
            {featuredMenu
              ? 'Want something custom instead of the featured menu? Start a conversation below.'
              : partners.length > 0
                ? 'Choose a venue above or send a custom inquiry below.'
                : `Tell us about your event and ${chef.display_name} will be in touch.`}
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex w-full max-w-md gap-3">
              {(!preferWebsite || !hasWebsiteLink) && (
                <a
                  href={`/chef/${params.slug}/inquire`}
                  className="inline-block flex-1 rounded-lg px-6 py-3 text-center font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Start inquiry
                </a>
              )}
              <a
                href={`/chef/${params.slug}/gift-cards`}
                className="inline-block flex-1 rounded-lg border px-6 py-3 text-center font-medium transition-colors"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              >
                Gift cards
              </a>
            </div>
            {hasWebsiteLink && (
              <a
                href={chef.website_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full max-w-md rounded-lg border px-8 py-3 text-center font-medium transition-colors"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              >
                Visit website
              </a>
            )}
            {preferWebsite && hasWebsiteLink && !preferChefFlow && (
              <p className="text-xs text-stone-500">
                Want to use ChefFlow instead?{' '}
                <a
                  href={`/chef/${params.slug}/inquire`}
                  className="font-medium underline"
                  style={{ color: primaryColor }}
                >
                  Send inquiry here
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
              Client account
            </a>
            <span className="text-stone-300">&middot;</span>
            <a
              href={`/chef/${params.slug}/partner-signup`}
              className="font-medium hover:opacity-80"
              style={{ color: primaryColor }}
            >
              Partner signup
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
