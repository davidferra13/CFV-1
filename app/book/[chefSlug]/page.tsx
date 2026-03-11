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

  return (
    <div className="min-h-screen bg-stone-900">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Chef Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-stone-100">{chefName}</h1>
          {(selectedMenuShowcase?.title || chef.booking_headline) && (
            <p className="text-lg text-stone-400">
              {selectedMenuShowcase?.title || chef.booking_headline}
            </p>
          )}
          {(selectedMenuShowcase?.pitch || chef.booking_bio_short) && (
            <p className="text-sm text-stone-500 max-w-md mx-auto">
              {selectedMenuShowcase?.pitch || chef.booking_bio_short}
            </p>
          )}
        </div>

        <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 shadow-lg">
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

        {/* Powered by ChefFlow */}
        <p className="text-center text-xs text-stone-600">
          Powered by{' '}
          <a
            href="https://cheflowhq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-500 hover:text-stone-400 transition-colors"
          >
            ChefFlow
          </a>
        </p>
      </div>
    </div>
  )
}
