// Public Chef Booking Page — /book/[chefSlug]
// No authentication required.
// Shows chef headline, availability calendar, then booking form on date select.
// Supports dual booking model: inquiry-first or instant-book.

import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { BookingPageClient } from './booking-page-client'

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
}

const getChefForBooking = unstable_cache(
  async (slug: string): Promise<ChefPublicProfile | null> => {
    const supabase = createServerClient({ admin: true })

    const { data } = await supabase
      .from('chefs')
      .select(
        `
        id, business_name, booking_slug, booking_enabled, booking_headline, booking_bio_short,
        booking_model, booking_base_price_cents, booking_pricing_type,
        booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents
      `
      )
      .eq('booking_slug', slug)
      .eq('booking_enabled', true)
      .single()

    return data ?? null
  },
  ['chef-booking-profile'],
  { revalidate: 300, tags: ['chef-booking-profile'] }
)

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

  return (
    <div className="min-h-screen bg-stone-800">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Chef Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-stone-100">
            {chef.business_name || 'Private Chef'}
          </h1>
          {chef.booking_headline && (
            <p className="text-lg text-stone-400">{chef.booking_headline}</p>
          )}
          {chef.booking_bio_short && (
            <p className="text-sm text-stone-500 max-w-md mx-auto">{chef.booking_bio_short}</p>
          )}
        </div>

        <div className="bg-stone-900 rounded-xl border border-stone-700 p-6 shadow-sm">
          <BookingPageClient chefSlug={params.chefSlug} bookingConfig={bookingConfig} />
        </div>
      </div>
    </div>
  )
}
