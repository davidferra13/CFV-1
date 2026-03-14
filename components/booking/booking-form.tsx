'use client'

// BookingForm — public booking form for the chef booking page.
// Dual-mode: inquiry-first (submit inquiry) or instant-book (pay deposit via Stripe Checkout).

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { submitPublicInquiry } from '@/lib/inquiries/public-actions'
import { createInstantBookingCheckout } from '@/lib/booking/instant-book-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import type { BookingConfig } from '@/app/book/[chefSlug]/booking-page-client'

type Props = {
  chefSlug: string
  selectedDate: string // YYYY-MM-DD pre-filled from calendar
  onBack: () => void
  bookingConfig?: BookingConfig
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function BookingForm({ chefSlug, selectedDate, onBack, bookingConfig }: Props) {
  const router = useRouter()

  const isInstantBook = bookingConfig?.bookingModel === 'instant_book'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [occasion, setOccasion] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [serveTime, setServeTime] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [allergies, setAllergies] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compute live pricing for instant-book mode
  const pricing = useMemo(() => {
    if (!isInstantBook || !bookingConfig?.basePriceCents) return null

    const guests = parseInt(guestCount) || 1
    const totalCents =
      bookingConfig.pricingType === 'per_person'
        ? bookingConfig.basePriceCents * guests
        : bookingConfig.basePriceCents

    let depositCents: number
    if (bookingConfig.depositType === 'fixed' && bookingConfig.depositFixedCents) {
      depositCents = Math.min(bookingConfig.depositFixedCents, totalCents)
    } else {
      const pct = bookingConfig.depositPercent ?? 30
      depositCents = Math.round(totalCents * (pct / 100))
    }

    return { totalCents, depositCents }
  }, [isInstantBook, bookingConfig, guestCount])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (
      !fullName.trim() ||
      !email.trim() ||
      !occasion.trim() ||
      !guestCount ||
      !serveTime ||
      !address.trim()
    ) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    try {
      if (isInstantBook) {
        // Instant-book: create checkout session and redirect to Stripe
        const result = await createInstantBookingCheckout({
          chef_slug: chefSlug,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          occasion: occasion.trim(),
          guest_count: parseInt(guestCount),
          event_date: selectedDate,
          serve_time: serveTime,
          address: address.trim(),
          allergies_food_restrictions: allergies.trim() || undefined,
          additional_notes: notes.trim() || undefined,
        })
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl
      } else {
        // Inquiry-first: submit inquiry and redirect to thank-you
        await submitPublicInquiry({
          chef_slug: chefSlug,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          occasion: occasion.trim(),
          guest_count: parseInt(guestCount),
          event_date: selectedDate,
          serve_time: serveTime,
          address: address.trim(),
          allergies_food_restrictions: allergies.trim() || undefined,
          additional_notes: notes.trim() || undefined,
        })
        router.push(`/book/${chefSlug}/thank-you`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-stone-800 border border-stone-700 px-4 py-2.5 flex items-center gap-3">
        <span className="text-sm font-medium text-stone-300">Date selected:</span>
        <span className="text-sm font-semibold text-stone-100">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        <button
          type="button"
          className="ml-auto text-xs text-stone-500 underline hover:text-stone-300"
          onClick={onBack}
        >
          Change
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Your Name"
          required
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="(415) 555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label="Occasion"
          required
          placeholder="Birthday dinner, date night…"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Number of Guests"
          type="number"
          min="1"
          required
          placeholder="e.g. 6"
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
        />
        <Input
          label="Desired Serve Time"
          type="time"
          required
          value={serveTime}
          onChange={(e) => setServeTime(e.target.value)}
        />
      </div>

      <Input
        label="Event Address"
        required
        placeholder="123 Main St, San Francisco CA"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <Textarea
        label="Allergies / Dietary Restrictions"
        placeholder="Gluten-free, nut allergy, vegan…"
        value={allergies}
        onChange={(e) => setAllergies(e.target.value)}
        rows={2}
      />

      <Textarea
        label="Additional Notes"
        placeholder="Anything else you'd like us to know?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />

      {/* Instant-book pricing summary */}
      {isInstantBook && pricing && (
        <div className="rounded-lg border border-green-200 bg-green-950 p-4 space-y-2">
          <p className="text-sm font-medium text-green-800">Pricing Summary</p>
          <div className="flex justify-between text-sm text-green-700">
            <span>
              {bookingConfig?.pricingType === 'per_person'
                ? `${formatDollars(bookingConfig.basePriceCents!)} x ${parseInt(guestCount) || 1} guests`
                : 'Event price'}
            </span>
            <span className="font-semibold">{formatDollars(pricing.totalCents)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-900 font-medium border-t border-green-200 pt-2">
            <span>Deposit due now</span>
            <span>{formatDollars(pricing.depositCents)}</span>
          </div>
          <p className="text-xs text-green-600">
            Remaining balance of {formatDollars(pricing.totalCents - pricing.depositCents)} due
            before event.
          </p>
        </div>
      )}

      {error && (
        <Alert variant="error" title="Oops">
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        disabled={loading}
        className="w-full"
      >
        {loading
          ? isInstantBook
            ? 'Preparing checkout…'
            : 'Sending…'
          : isInstantBook
            ? `Pay ${pricing ? formatDollars(pricing.depositCents) : ''} Deposit & Book`
            : 'Submit Request'}
      </Button>

      <p className="text-xs text-center text-stone-400">
        {isInstantBook
          ? 'You will be redirected to Stripe to securely pay your deposit.'
          : 'This is a booking request, not a confirmed reservation. You will hear back within 24 hours.'}
      </p>
    </form>
  )
}
