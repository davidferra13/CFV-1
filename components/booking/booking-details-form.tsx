'use client'

// BookingDetailsForm - Step 4 of the booking flow.
// Collects: name, email, phone, guest count, dietary notes, occasion, address, message.
// Mobile-first, zero-friction.

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { PublicEventType } from '@/lib/booking/event-types-actions'
import type { BookingFormData } from '@/components/booking/booking-flow'

type Props = {
  selectedDate: string
  selectedTime: string | null
  selectedEventType: PublicEventType | null
  initialData: BookingFormData | null
  onSubmit: (data: BookingFormData) => void
  onBack: () => void
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function BookingDetailsForm({
  selectedDate,
  selectedTime,
  selectedEventType,
  initialData,
  onSubmit,
  onBack,
}: Props) {
  const [fullName, setFullName] = useState(initialData?.fullName ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [phone, setPhone] = useState(initialData?.phone ?? '')
  const [guestCount, setGuestCount] = useState(initialData?.guestCount?.toString() ?? '')
  const [occasion, setOccasion] = useState(initialData?.occasion ?? '')
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [dietaryNotes, setDietaryNotes] = useState(initialData?.dietaryNotes ?? '')
  const [message, setMessage] = useState(initialData?.message ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim() || !email.trim() || !occasion.trim() || !guestCount || !address.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    const guests = parseInt(guestCount)
    if (isNaN(guests) || guests < 1) {
      setError('Guest count must be at least 1.')
      return
    }

    if (selectedEventType) {
      if (guests < selectedEventType.guest_count_min) {
        setError(`Minimum ${selectedEventType.guest_count_min} guests for this service.`)
        return
      }
      if (guests > selectedEventType.guest_count_max) {
        setError(`Maximum ${selectedEventType.guest_count_max} guests for this service.`)
        return
      }
    }

    onSubmit({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      guestCount: guests,
      occasion: occasion.trim(),
      address: address.trim(),
      dietaryNotes: dietaryNotes.trim(),
      message: message.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Your details</h2>
          <p className="text-sm text-stone-500 mt-0.5">Tell us about yourself and the event.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          Back
        </button>
      </div>

      {/* Summary strip */}
      <div className="rounded-lg bg-stone-800 border border-stone-700 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {selectedEventType && (
          <span className="text-stone-300 font-medium">{selectedEventType.name}</span>
        )}
        <span className="text-stone-400">{formatDateShort(selectedDate)}</span>
        {selectedTime && <span className="text-stone-400">{formatTime(selectedTime)}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Your Name"
          required
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          required
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="(415) 555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
        <Input
          label="Occasion"
          required
          placeholder="Birthday, date night, corporate event..."
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Number of Guests"
          type="number"
          min={selectedEventType?.guest_count_min ?? 1}
          max={selectedEventType?.guest_count_max ?? 500}
          required
          placeholder="e.g. 6"
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
        />
        <Input
          label="Event Address"
          required
          placeholder="123 Main St, San Francisco CA"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="street-address"
        />
      </div>

      <Textarea
        label="Allergies / Dietary Restrictions"
        placeholder="Gluten-free, nut allergy, vegan, etc."
        value={dietaryNotes}
        onChange={(e) => setDietaryNotes(e.target.value)}
        rows={2}
      />

      <Textarea
        label="Additional Notes (optional)"
        placeholder="Anything else you'd like us to know about the event?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" className="w-full">
        Review Booking
      </Button>
    </form>
  )
}
