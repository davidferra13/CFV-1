// Public Chef Booking Page - /book/[chefSlug]
// No authentication required.
// Supports dual booking model: inquiry-first or instant-book.

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/db/admin'
import { getOptimizedAvatar } from '@/lib/images/cloudinary'
import { findChefByPublicSlug, getPublicChefPathSlug, getPublicInquirySlug } from '@/lib/profile/public-chef'
import { formatCurrency } from '@/lib/utils/currency'
import { ArrowLeft, CreditCard, FileText, Sparkles } from '@/components/ui/icons'
import { BookingPageClient, type BookingPageChefSummary } from './booking-page-client'

type ChefPublicProfile = {
  id: string
  display_name: string | null
  business_name: string | null
  profile_image_url: string | null
  tagline: string | null
  slug: string | null
  booking_slug: string | null
  booking_enabled: boolean
  booking_headline: string | null
  booking_bio_short: string | null
  booking_model: string | null
  booking_base_price_cents: number | null
  booking_pricing_type: string | null
  booking_deposit_type: string | null
  booking_deposit_percent: number | null
  booking_deposit_fixed_cents: number | null
}

const getChefForBooking = unstable_cache(
  async (slug: string): Promise<ChefPublicProfile | null> => {
    const db: any = createAdminClient()

    const result = await findChefByPublicSlug<ChefPublicProfile>(
      db,
      slug,
      `
        id, display_name, business_name, profile_image_url, tagline, slug, booking_slug,
        booking_enabled, booking_headline, booking_bio_short, booking_model,
        booking_base_price_cents, booking_pricing_type, booking_deposit_type,
        booking_deposit_percent, booking_deposit_fixed_cents
      `
    )

    if (!result.data?.booking_enabled) {
      return null
    }

    return result.data
  },
  ['chef-booking-profile'],
  { revalidate: 300, tags: ['chef-booking-profile'] }
)

function getStartingPriceLabel(input: {
  bookingModel: 'inquiry_first' | 'instant_book'
  pricingType: 'flat_rate' | 'per_person'
  basePriceCents: number | null
}) {
  if (!input.basePriceCents) {
    return input.bookingModel === 'instant_book'
      ? 'Pricing shown after event details'
      : 'Custom quote after review'
  }

  if (input.pricingType === 'per_person') {
    return `From ${formatCurrency(input.basePriceCents)} per guest`
  }

  return `From ${formatCurrency(input.basePriceCents)} per event`
}

function getDepositLabel(input: {
  bookingModel: 'inquiry_first' | 'instant_book'
  depositType: 'percent' | 'fixed'
  depositPercent: number | null
  depositFixedCents: number | null
}) {
  if (input.bookingModel !== 'instant_book') {
    return 'No payment on request'
  }

  if (input.depositType === 'fixed' && (input.depositFixedCents ?? 0) > 0) {
    return `${formatCurrency(input.depositFixedCents ?? 0)} due today`
  }

  return `${input.depositPercent ?? 30}% deposit due today`
}

export default async function BookingPage({ params }: { params: { chefSlug: string } }) {
  const chef = await getChefForBooking(params.chefSlug)

  if (!chef) {
    notFound()
  }

  const bookingConfig = {
    bookingModel: (chef.booking_model ?? 'inquiry_first') as 'inquiry_first' | 'instant_book',
    basePriceCents: chef.booking_base_price_cents,
    pricingType: (chef.booking_pricing_type ?? 'flat_rate') as 'flat_rate' | 'per_person',
    depositType: (chef.booking_deposit_type ?? 'percent') as 'percent' | 'fixed',
    depositPercent: chef.booking_deposit_percent,
    depositFixedCents: chef.booking_deposit_fixed_cents,
  }

  const displayName = chef.display_name?.trim() || chef.business_name?.trim() || 'Private Chef'
  const profileSlug = getPublicChefPathSlug(chef)
  const inquirySlug = getPublicInquirySlug(chef)
  const normalizedBookingSlug = chef.booking_slug?.trim() || params.chefSlug
  const chefSummary: BookingPageChefSummary = {
    name: displayName,
    headline: chef.booking_headline || chef.tagline || null,
    bioShort: chef.booking_bio_short || null,
    profileHref: profileSlug ? `/chef/${profileSlug}` : null,
    inquiryHref: inquirySlug ? `/chef/${inquirySlug}/inquire` : null,
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <section className="border-b border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(232,143,71,0.18),_rgba(28,25,23,0.96)_42%,_rgba(12,10,9,1)_78%)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {chefSummary.profileHref ? (
            <Link
              href={chefSummary.profileHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-400 transition-colors hover:text-stone-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
          ) : null}

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">
                  <Sparkles className="h-3.5 w-3.5 text-brand-300" />
                  Direct chef booking
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  {bookingConfig.bookingModel === 'instant_book' ? 'Instant booking enabled' : 'Request review flow'}
                </span>
              </div>

              <div className="mt-6 flex items-start gap-4">
                {chef.profile_image_url ? (
                  <Image
                    src={getOptimizedAvatar(chef.profile_image_url, 128)}
                    alt={displayName}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-full object-cover ring-2 ring-stone-700"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-stone-800 ring-2 ring-stone-700">
                    <span className="text-2xl font-semibold text-stone-400">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="min-w-0">
                  <h1 className="text-4xl font-display tracking-tight text-stone-100 sm:text-5xl">
                    Book {displayName}
                  </h1>
                  {chefSummary.headline ? (
                    <p className="mt-3 max-w-3xl text-lg leading-relaxed text-stone-300">
                      {chefSummary.headline}
                    </p>
                  ) : null}
                  {chefSummary.bioShort ? (
                    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-400 sm:text-base">
                      {chefSummary.bioShort}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-stone-700 bg-stone-950/70 px-4 py-2 text-sm text-stone-300">
                  {getStartingPriceLabel(bookingConfig)}
                </div>
                <div className="rounded-full border border-stone-700 bg-stone-950/70 px-4 py-2 text-sm text-stone-300">
                  {getDepositLabel(bookingConfig)}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-700 bg-stone-950/70 p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Why this path converts cleanly
              </p>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-brand-300" />
                  <p className="text-sm leading-relaxed text-stone-300">
                    Clients start with a real calendar check against current availability before they choose a date.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  {bookingConfig.bookingModel === 'instant_book' ? (
                    <CreditCard className="mt-0.5 h-4 w-4 text-brand-300" />
                  ) : (
                    <FileText className="mt-0.5 h-4 w-4 text-brand-300" />
                  )}
                  <p className="text-sm leading-relaxed text-stone-300">
                    {bookingConfig.bookingModel === 'instant_book'
                      ? 'Published deposit logic is visible up front, so clients know exactly what happens at checkout.'
                      : 'The request path collects the essentials once, which reduces follow-up just to establish scope.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <BookingPageClient
          chefSlug={normalizedBookingSlug}
          bookingConfig={bookingConfig}
          chef={chefSummary}
        />
      </section>
    </div>
  )
}
