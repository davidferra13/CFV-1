'use client'

// First Booking Step - Setup Wizard
// Simple inline event creation: name, date, guest count, location.
// Creates a real draft event so the chef sees the system working immediately.

import { useState, useTransition } from 'react'
import { createOnboardingEvent } from '@/lib/onboarding/actions'
import { todayLocalDateString } from '@/lib/utils/format'
import type { StepCopy } from '@/lib/onboarding/archetype-copy'

interface FirstBookingStepProps {
  onComplete: (data?: Record<string, unknown>) => void
  onSkip: () => void
  copy?: StepCopy
}

export function FirstBookingStep({ onComplete, onSkip, copy }: FirstBookingStepProps) {
  const [eventDate, setEventDate] = useState('')
  const [serveTime, setServeTime] = useState('18:00')
  const [guestCount, setGuestCount] = useState(4)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [occasion, setOccasion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!eventDate) {
      setError('Pick a date for your event')
      return
    }
    if (!address.trim() || !city.trim() || !zip.trim()) {
      setError('Fill in the location details')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const result = await createOnboardingEvent({
          event_date: eventDate,
          serve_time: serveTime,
          guest_count: guestCount,
          location_address: address.trim(),
          location_city: city.trim(),
          location_zip: zip.trim(),
          occasion: occasion.trim() || undefined,
        })

        if (result?.success && result.eventId) {
          onComplete({ eventId: result.eventId })
        } else {
          setError(result?.error || 'Failed to create event. Try again.')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create event'
        setError(msg)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {copy?.title || 'Your first booking'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy?.description ||
            'Add an upcoming event or booking. This creates a draft you can flesh out later with menus, pricing, and client details.'}
        </p>
      </div>

      {/* Date and time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="event-date" className="block text-sm font-medium text-foreground mb-1">
            Event date
          </label>
          <input
            id="event-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={todayLocalDateString()}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="serve-time" className="block text-sm font-medium text-foreground mb-1">
            Serve time
          </label>
          <input
            id="serve-time"
            type="time"
            value={serveTime}
            onChange={(e) => setServeTime(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Guest count and occasion */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="guest-count" className="block text-sm font-medium text-foreground mb-1">
            Guest count
          </label>
          <input
            id="guest-count"
            type="number"
            min={1}
            max={500}
            value={guestCount}
            onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="occasion" className="block text-sm font-medium text-foreground mb-1">
            Occasion <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="occasion"
            type="text"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="e.g. Birthday, Date Night, Wedding"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Location</label>
        <div className="space-y-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP code"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-500 disabled:opacity-60"
        >
          {isPending ? 'Creating...' : 'Create Booking'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Skip for now
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        You can add clients, menus, and pricing to this event later from the Events page.
      </p>
    </div>
  )
}
