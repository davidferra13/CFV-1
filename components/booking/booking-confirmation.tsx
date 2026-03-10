'use client'

// BookingConfirmation - Step 5 of the booking flow.
// Shows booking summary + optional deposit payment via Stripe.
// Two modes: inquiry-first (submit request) or instant-book (pay and confirm).

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { submitPublicInquiry } from '@/lib/inquiries/public-actions'
import { createInstantBookingCheckout } from '@/lib/booking/instant-book-actions'
import { Button } from '@/components/ui/button'
import type { PublicEventType } from '@/lib/booking/event-types-actions'
import type { BookingConfig } from '@/app/book/[chefSlug]/booking-page-client'
import type { BookingFormData } from '@/components/booking/booking-flow'

type Props = {
  chefSlug: string
  chefName: string
  selectedDate: string
  selectedTime: string | null
  selectedEventType: PublicEventType | null
  formData: BookingFormData
  bookingConfig: BookingConfig
  onConfirmed: () => void
  onBack: () => void
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function BookingConfirmation({
  chefSlug,
  chefName,
  selectedDate,
  selectedTime,
  selectedEventType,
  formData,
  bookingConfig,
  onConfirmed,
  onBack,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isInstantBook = bookingConfig.bookingModel === 'instant_book'

  // Compute pricing for instant-book mode
  const pricing = useMemo(() => {
    if (!isInstantBook) return null

    const baseCents = selectedEventType?.price_cents ?? bookingConfig.basePriceCents
    if (!baseCents || baseCents <= 0) return null

    const totalCents =
      bookingConfig.pricingType === 'per_person' ? baseCents * formData.guestCount : baseCents

    let depositCents: number
    if (bookingConfig.depositType === 'fixed' && bookingConfig.depositFixedCents) {
      depositCents = Math.min(bookingConfig.depositFixedCents, totalCents)
    } else {
      const pct = bookingConfig.depositPercent ?? 30
      depositCents = Math.round(totalCents * (pct / 100))
    }

    return { totalCents, depositCents }
  }, [isInstantBook, selectedEventType, bookingConfig, formData.guestCount])

  async function handleConfirm() {
    setError(null)
    setLoading(true)

    try {
      const serveTime = selectedTime || '18:00'

      if (isInstantBook) {
        const result = await createInstantBookingCheckout({
          chef_slug: chefSlug,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
          occasion: formData.occasion,
          event_date: selectedDate,
          serve_time: serveTime,
          guest_count: formData.guestCount,
          address: formData.address,
          allergies_food_restrictions: formData.dietaryNotes || undefined,
          additional_notes: formData.message || undefined,
        })
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl
      } else {
        await submitPublicInquiry({
          chef_slug: chefSlug,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
          occasion: formData.occasion,
          event_date: selectedDate,
          serve_time: serveTime,
          guest_count: formData.guestCount,
          address: formData.address,
          allergies_food_restrictions: formData.dietaryNotes || undefined,
          additional_notes: formData.message || undefined,
        })
        onConfirmed()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Confirm your booking</h2>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          Back
        </button>
      </div>

      {/* Booking summary */}
      <div className="rounded-xl border border-stone-700 bg-stone-800 divide-y divide-stone-700">
        {/* Service */}
        {selectedEventType && (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-stone-400">Service</span>
            <span className="text-sm font-medium text-stone-200">{selectedEventType.name}</span>
          </div>
        )}

        {/* Date */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-stone-400">Date</span>
          <span className="text-sm font-medium text-stone-200">{formatDateLong(selectedDate)}</span>
        </div>

        {/* Time */}
        {selectedTime && (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-stone-400">Time</span>
            <span className="text-sm font-medium text-stone-200">{formatTime(selectedTime)}</span>
          </div>
        )}

        {/* Guest count */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-stone-400">Guests</span>
          <span className="text-sm font-medium text-stone-200">
            {formData.guestCount} {formData.guestCount === 1 ? 'guest' : 'guests'}
          </span>
        </div>

        {/* Occasion */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-stone-400">Occasion</span>
          <span className="text-sm font-medium text-stone-200">{formData.occasion}</span>
        </div>

        {/* Location */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-stone-400">Location</span>
          <span className="text-sm font-medium text-stone-200 text-right max-w-[200px] truncate">
            {formData.address}
          </span>
        </div>

        {/* Contact */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-stone-400">Contact</span>
          <div className="text-right">
            <p className="text-sm font-medium text-stone-200">{formData.fullName}</p>
            <p className="text-xs text-stone-400">{formData.email}</p>
          </div>
        </div>

        {/* Dietary notes */}
        {formData.dietaryNotes && (
          <div className="px-4 py-3">
            <span className="text-sm text-stone-400 block mb-1">Dietary notes</span>
            <p className="text-sm text-stone-300">{formData.dietaryNotes}</p>
          </div>
        )}

        {/* Additional message */}
        {formData.message && (
          <div className="px-4 py-3">
            <span className="text-sm text-stone-400 block mb-1">Message</span>
            <p className="text-sm text-stone-300">{formData.message}</p>
          </div>
        )}
      </div>

      {/* Pricing (instant-book only) */}
      {isInstantBook && pricing && (
        <div className="rounded-xl border border-green-800 bg-green-950 p-4 space-y-2">
          <p className="text-sm font-medium text-green-300">Pricing Summary</p>
          <div className="flex justify-between text-sm text-green-400">
            <span>
              {bookingConfig.pricingType === 'per_person' && bookingConfig.basePriceCents
                ? `${formatDollars(bookingConfig.basePriceCents)} x ${formData.guestCount} guests`
                : 'Event price'}
            </span>
            <span className="font-semibold">{formatDollars(pricing.totalCents)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-200 font-medium border-t border-green-800 pt-2">
            <span>Deposit due now</span>
            <span>{formatDollars(pricing.depositCents)}</span>
          </div>
          <p className="text-xs text-green-500">
            Remaining balance of {formatDollars(pricing.totalCents - pricing.depositCents)} due
            before event.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        loading={loading}
        disabled={loading}
        className="w-full"
        onClick={handleConfirm}
      >
        {loading
          ? isInstantBook
            ? 'Preparing checkout...'
            : 'Submitting...'
          : isInstantBook
            ? `Pay ${pricing ? formatDollars(pricing.depositCents) : ''} Deposit & Book`
            : 'Submit Booking Request'}
      </Button>

      <p className="text-xs text-center text-stone-500">
        {isInstantBook
          ? 'You will be redirected to Stripe to securely pay your deposit.'
          : `This is a booking request, not a confirmed reservation. ${chefName} will respond within 24 hours.`}
      </p>
    </div>
  )
}
