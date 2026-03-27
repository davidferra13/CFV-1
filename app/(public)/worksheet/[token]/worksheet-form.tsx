'use client'

import { useState } from 'react'
import { submitClientWorksheet } from '@/lib/marketplace/worksheet-actions'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'

type Props = {
  token: string
  prefillName: string | null
  prefillEmail: string | null
  prefillPhone: string | null
}

export function ClientWorksheetForm({ token, prefillName, prefillEmail, prefillPhone }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(prefillName ?? '')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [phone, setPhone] = useState(prefillPhone ?? '')
  const [guestCount, setGuestCount] = useState('')
  const [address, setAddress] = useState('')
  const [dietary, setDietary] = useState('')
  const [allergies, setAllergies] = useState('')
  const [preferences, setPreferences] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await submitClientWorksheet({
        token,
        clientName: name.trim(),
        clientEmail: email.trim() || undefined,
        clientPhone: phone.trim() || undefined,
        guestCount: guestCount ? parseInt(guestCount) : undefined,
        locationAddress: address.trim() || undefined,
        dietaryRestrictions: dietary
          ? dietary
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        allergies: allergies
          ? allergies
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        preferences: preferences.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
      })

      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-800">Thank you!</p>
        <p className="mt-2 text-sm text-emerald-700">
          Your details have been submitted. Your chef will use this to prepare for your dinner.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wider">Your Info</h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wider">
          Event Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Guest Count</label>
            <input
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="How many guests?"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
            <AddressAutocomplete
              value={address}
              onChange={(val) => setAddress(val)}
              onPlaceSelect={(data) => setAddress(data.formattedAddress)}
              placeholder="Event address"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wider">
          Dietary & Preferences
        </h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Dietary Restrictions
          </label>
          <input
            type="text"
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            placeholder="e.g., vegetarian, gluten-free, kosher"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
          <p className="mt-1 text-xs text-stone-400">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Allergies</label>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g., nuts, shellfish, dairy"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
          <p className="mt-1 text-xs text-stone-400">
            Comma-separated. This is critical for your safety.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Food Preferences</label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Tell us about your food preferences. What do you love? What do you dislike? Any cuisines you're excited about?"
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Special Requests</label>
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Anything else your chef should know? Surprise birthday? Wine pairing requests? Kitchen access notes?"
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Submit Details'}
      </button>
    </form>
  )
}
