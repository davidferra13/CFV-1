'use client'

// BookingPageClient — client wrapper that coordinates calendar + form state.
// Passes bookingConfig to BookingForm for dual-mode rendering.

import { useState } from 'react'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { BookingForm } from '@/components/booking/booking-form'
import { FeaturedBookingMenuCard } from '@/components/public/featured-booking-menu-card'
import type {
  FeaturedBookingMenuShowcase,
  PublicFeaturedBookingMenu,
} from '@/lib/booking/featured-menu-shared'

export type BookingConfig = {
  bookingModel: 'inquiry_first' | 'instant_book'
  basePriceCents: number | null
  pricingType: 'flat_rate' | 'per_person'
  depositType: 'percent' | 'fixed'
  depositPercent: number | null
  depositFixedCents: number | null
}

type Props = {
  chefSlug: string
  bookingConfig: BookingConfig
  selectedMenu?: PublicFeaturedBookingMenu | null
  selectedMenuShowcase?: FeaturedBookingMenuShowcase | null
}

export function BookingPageClient({
  chefSlug,
  bookingConfig,
  selectedMenu = null,
  selectedMenuShowcase = null,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const isInstantBook = bookingConfig.bookingModel === 'instant_book'

  return (
    <div className="space-y-6">
      {selectedMenu && (
        <FeaturedBookingMenuCard
          menu={selectedMenu}
          primaryColor="#57534e"
          compact
          eyebrow={selectedMenuShowcase?.badge || 'Featured Menu'}
          title={selectedMenuShowcase?.title || selectedMenu.name}
          description={
            selectedMenuShowcase?.pitch ||
            "You are booking the chef's featured menu. Pick a date and finish the details below."
          }
        />
      )}

      {!selectedDate ? (
        <>
          <div>
            <h2 className="mb-1 text-lg font-semibold text-stone-100">Choose a date</h2>
            <p className="text-sm text-stone-500">
              {selectedMenu
                ? isInstantBook
                  ? 'Highlighted dates are currently open. Pick one to reserve this menu.'
                  : 'Highlighted dates are currently open. Pick one to ask about this menu.'
                : isInstantBook
                  ? 'Highlighted dates are currently open. Pick one to move into the booking details.'
                  : 'Highlighted dates are currently open. Pick one to begin the conversation.'}
            </p>
          </div>
          <BookingCalendar chefSlug={chefSlug} onSelectDate={setSelectedDate} selectedDate={null} />
        </>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-stone-100 mb-1">
              {isInstantBook ? 'Confirm the booking details' : 'Tell us about the gathering'}
            </h2>
            <p className="text-sm text-stone-500">
              {isInstantBook
                ? 'Share the essentials and pay the deposit to hold the date.'
                : 'Share the essentials and the chef will follow up with next steps.'}
            </p>
          </div>
          <BookingForm
            chefSlug={chefSlug}
            selectedDate={selectedDate}
            onBack={() => setSelectedDate(null)}
            bookingConfig={bookingConfig}
            selectedMenu={selectedMenu}
            selectedMenuShowcase={selectedMenuShowcase}
          />
        </>
      )}
    </div>
  )
}
