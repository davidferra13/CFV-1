'use client'

// BookingPageClient — client wrapper that coordinates calendar + form state.
// Passes bookingConfig to BookingForm for dual-mode rendering.

import { useState } from 'react'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { BookingForm } from '@/components/booking/booking-form'

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
}

export function BookingPageClient({ chefSlug, bookingConfig }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const isInstantBook = bookingConfig.bookingModel === 'instant_book'

  return (
    <div className="space-y-6">
      {!selectedDate ? (
        <>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 mb-1">Select a date</h2>
            <p className="text-sm text-stone-500">
              {isInstantBook
                ? 'Green dates are available. Click a date to book instantly.'
                : 'Green dates are available. Click a date to begin your booking request.'}
            </p>
          </div>
          <BookingCalendar
            chefSlug={chefSlug}
            onSelectDate={setSelectedDate}
            selectedDate={null}
          />
        </>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 mb-1">
              {isInstantBook ? 'Book your event' : 'Your details'}
            </h2>
            <p className="text-sm text-stone-500">
              {isInstantBook
                ? 'Fill in your details and pay the deposit to confirm your booking.'
                : 'Tell us about the event and we will get back to you within 24 hours.'}
            </p>
          </div>
          <BookingForm
            chefSlug={chefSlug}
            selectedDate={selectedDate}
            onBack={() => setSelectedDate(null)}
            bookingConfig={bookingConfig}
          />
        </>
      )}
    </div>
  )
}
