// Public Chef Booking Page - /book/[chefSlug]
// No authentication required.
// Calendly-style multi-step flow: Service -> Date -> Time -> Details -> Confirm
// Falls back to legacy 2-step flow (Date -> Form) when no event types are configured.

import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingFlow } from '@/components/booking/booking-flow'
import { BookingPageClient } from './booking-page-client'
import type { PublicEventType } from '@/lib/booking/event-types-actions'
import { getPublicFeaturedBookingMenu } from '@/lib/booking/featured-menu'
import {
  resolveRequestedFeaturedMenuId,
  type FeaturedBookingMenuShowcase,
} from '@/lib/booking/featured-menu-shared'

type ChefPublicProfile = {
  id: string
  business_name: string | null
  booking_slug: string
  booking_enabled: boolean
  booking_headline: string | null
  booking_bio_short: string | null
  booking_model: string | null
  booking_base_price_cents: number | null
  booking_pricing_type: string | null
  booking_deposit_type: string | null
  booking_deposit_percent: number | null
  booking_deposit_fixed_cents: number | null
  featured_booking_menu_id: string | null
  featured_booking_badge: string | null
  featured_booking_title: string | null
  featured_booking_pitch: string | null
}

const getChefForBooking = unstable_cache(
  async (slug: string): Promise<ChefPublicProfile | null> => {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('chefs')
      .select(
        `
        id, business_name, booking_slug, booking_enabled, booking_headline, booking_bio_short,
        booking_model, booking_base_price_cents, booking_pricing_type,
        booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents,
        featured_booking_menu_id, featured_booking_badge, featured_booking_title, featured_booking_pitch
      `
      )
      .eq('booking_slug', slug)
      .eq('booking_enabled', true)
      .single()

    return (data as ChefPublicProfile) ?? null
  },
  ['chef-booking-profile'],
  { revalidate: 300, tags: ['chef-booking-profile'] }
)

const getEventTypes = unstable_cache(
  async (chefId: string): Promise<PublicEventType[]> => {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('booking_event_types')
      .select(
        'id, name, description, duration_minutes, price_cents, guest_count_min, guest_count_max'
      )
      .eq('chef_id', chefId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    return (data as PublicEventType[]) ?? []
  },
  ['chef-booking-event-types'],
  { revalidate: 300, tags: ['chef-booking-profile'] }
)

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: { chefSlug: string }
  searchParams?: { menu?: string }
}) {
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

  const selectedMenuId = resolveRequestedFeaturedMenuId(
    chef.featured_booking_menu_id,
    typeof searchParams?.menu === 'string' ? searchParams.menu : null
  )
  const selectedMenu = selectedMenuId
    ? await getPublicFeaturedBookingMenu(chef.id, selectedMenuId)
    : null
  const selectedMenuShowcase: FeaturedBookingMenuShowcase | null = selectedMenu
    ? {
        badge: chef.featured_booking_badge ?? null,
        title: chef.featured_booking_title ?? null,
        pitch: chef.featured_booking_pitch ?? null,
      }
    : null

  // Load event types (may be empty for chefs who haven't configured them)
  const eventTypes = await getEventTypes(chef.id)
  const hasEventTypes = eventTypes.length > 0 && !selectedMenu
  const chefName = chef.business_name || 'Private Chef'
  const isInstantBook = bookingConfig.bookingModel === 'instant_book'
  const introTitle =
    selectedMenuShowcase?.title ||
    chef.booking_headline ||
    (isInstantBook ? 'Reserve a date directly.' : 'Plan your gathering.')
  const introCopy =
    selectedMenuShowcase?.pitch ||
    chef.booking_bio_short ||
    (isInstantBook
      ? 'Choose a date, share the event details, and pay the deposit to hold the booking.'
      : 'Choose a date, share the essentials, and the chef will follow up with next steps.')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fffdf9_0%,_#fff4e8_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="mb-8 text-center">
          <p className="inline-flex rounded-full border border-brand-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 shadow-sm">
            Private chef booking
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-900 md:text-5xl">
            {chefName}
          </h1>
          <p className="mt-4 text-lg text-stone-700">{introTitle}</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-600">{introCopy}</p>
        </div>

        <div className="rounded-[28px] border border-stone-700 bg-stone-900/95 p-5 shadow-[0_24px_80px_rgba(28,25,23,0.24)] md:p-6">
          {hasEventTypes ? (
            <BookingFlow
              chefSlug={params.chefSlug}
              chefName={chefName}
              eventTypes={eventTypes}
              bookingConfig={bookingConfig}
            />
          ) : (
            <BookingPageClient
              chefSlug={params.chefSlug}
              bookingConfig={bookingConfig}
              selectedMenu={selectedMenu}
              selectedMenuShowcase={selectedMenuShowcase}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          Booking experience powered by{' '}
          <a
            href="https://cheflowhq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-700 transition-colors hover:text-stone-900"
          >
            ChefFlow
          </a>
        </p>
      </div>
    </div>
  )
}
