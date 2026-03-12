'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { submitMarketplaceInquiry } from '@/lib/marketplace/inquiry-actions'

type Props = {
  chefId: string
  chefName: string
  chefSlug: string
  cuisineTypes: string[]
}

const EVENT_TYPES = [
  'Dinner Party',
  'Birthday',
  'Anniversary',
  'Holiday',
  'Corporate Event',
  'Wedding',
  'Brunch',
  'Date Night',
  'Family Gathering',
  'Other',
]

export function MarketplaceInquiryForm({ chefId, chefName, chefSlug, cuisineTypes }: Props) {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [eventType, setEventType] = useState('')
  const [cuisinePreferences, setCuisinePreferences] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const guestCountNum = parseInt(guestCount, 10)
    if (isNaN(guestCountNum) || guestCountNum < 1) {
      setError('Please enter a valid guest count.')
      return
    }

    startTransition(async () => {
      try {
        const result = await submitMarketplaceInquiry({
          chefId,
          fullName,
          email,
          phone,
          eventDate,
          guestCount: guestCountNum,
          eventType,
          cuisinePreferences,
          dietaryRestrictions,
          message,
          websiteUrl: honeypot,
        })

        if (result.success) {
          setSubmitted(true)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Inquiry Sent</h2>
        <p className="mt-2 text-gray-600">
          Your inquiry has been sent to {chefName}. They will review your request and get back to
          you at {email}.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href={`/marketplace/${chefSlug}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Back to Profile
          </Link>
          <Link
            href="/marketplace"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700"
          >
            Browse More Chefs
          </Link>
        </div>
      </div>
    )
  }

  // Minimum date: today
  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Honeypot (hidden from humans) */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website_url">Website</label>
        <input
          type="text"
          id="website_url"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Contact Information */}
      <fieldset className="rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold text-gray-700">Contact Information</legend>

        <div className="mt-2 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Your full name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Event Details */}
      <fieldset className="rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold text-gray-700">Event Details</legend>

        <div className="mt-2 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="eventDate"
                required
                min={today}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700">
                Guest Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="guestCount"
                required
                min={1}
                max={500}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Number of guests"
              />
            </div>
          </div>

          <div>
            <label htmlFor="eventType" className="block text-sm font-medium text-gray-700">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              id="eventType"
              required
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Select an event type</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Preferences */}
      <fieldset className="rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold text-gray-700">Preferences</legend>

        <div className="mt-2 space-y-4">
          <div>
            <label htmlFor="cuisinePreferences" className="block text-sm font-medium text-gray-700">
              Cuisine Preferences
            </label>
            {cuisineTypes.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">
                {chefName} specializes in: {cuisineTypes.join(', ')}
              </p>
            )}
            <input
              type="text"
              id="cuisinePreferences"
              value={cuisinePreferences}
              onChange={(e) => setCuisinePreferences(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="e.g., Italian, Mediterranean, Asian fusion"
            />
          </div>

          <div>
            <label
              htmlFor="dietaryRestrictions"
              className="block text-sm font-medium text-gray-700"
            >
              Dietary Restrictions or Allergies
            </label>
            <input
              type="text"
              id="dietaryRestrictions"
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="e.g., Gluten-free, nut allergy, vegan guests"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Additional Details
            </label>
            <textarea
              id="message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Tell the chef more about your event, preferences, or any questions you have."
            />
          </div>
        </div>
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-orange-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Sending...' : 'Send Inquiry'}
      </button>

      <p className="text-center text-xs text-gray-400">
        By submitting this form, you agree to share your contact information with {chefName}.
      </p>
    </form>
  )
}
