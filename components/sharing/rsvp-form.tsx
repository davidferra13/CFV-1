// RSVP Form - Guest-facing form for submitting/updating RSVPs
// Used on the public share page. No authentication required.

'use client'

import { useState } from 'react'
import { submitRSVP, updateRSVP } from '@/lib/sharing/actions'

type RSVPStatus = 'attending' | 'declined' | 'maybe'

interface RSVPFormProps {
  shareToken: string
  eventId: string
  existingGuest?: {
    guest_token: string
    full_name: string
    email: string | null
    rsvp_status: string
    dietary_restrictions: string[] | null
    allergies: string[] | null
    notes: string | null
    plus_one: boolean
    [key: string]: unknown
  } | null
}

export function RSVPForm({ shareToken, eventId, existingGuest }: RSVPFormProps) {
  const isEditing = !!existingGuest

  const [fullName, setFullName] = useState(existingGuest?.full_name || '')
  const [email, setEmail] = useState(existingGuest?.email || '')
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>(
    (existingGuest?.rsvp_status as RSVPStatus) || 'attending'
  )
  const [dietaryInput, setDietaryInput] = useState(
    existingGuest?.dietary_restrictions?.join(', ') || ''
  )
  const [allergyInput, setAllergyInput] = useState(
    existingGuest?.allergies?.join(', ') || ''
  )
  const [notes, setNotes] = useState(existingGuest?.notes || '')
  const [plusOne, setPlusOne] = useState(existingGuest?.plus_one || false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [guestToken, setGuestToken] = useState(existingGuest?.guest_token || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const dietary = dietaryInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const allergies = allergyInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      if (isEditing && guestToken) {
        await updateRSVP({
          guestToken,
          full_name: fullName,
          rsvp_status: rsvpStatus,
          dietary_restrictions: dietary,
          allergies,
          notes: notes || undefined,
          plus_one: plusOne,
        })
      } else {
        const result = await submitRSVP({
          shareToken,
          full_name: fullName,
          email: email || undefined,
          rsvp_status: rsvpStatus,
          dietary_restrictions: dietary,
          allergies,
          notes: notes || undefined,
          plus_one: plusOne,
        })

        if (result.guestToken) {
          setGuestToken(result.guestToken)
          // Store guest token in cookie so returning guests see their RSVP
          document.cookie = `guest_token_${eventId}=${result.guestToken}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`
        }

        if (result.alreadyExists) {
          setError('You have already RSVPed with this email. Your previous response is on file.')
          setLoading(false)
          return
        }
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-stone-900 mb-2">
          {rsvpStatus === 'attending'
            ? 'See you there!'
            : rsvpStatus === 'maybe'
              ? 'Thanks for letting us know!'
              : 'Thanks for responding'}
        </h3>
        <p className="text-stone-600 mb-6">
          {isEditing ? 'Your RSVP has been updated.' : 'Your RSVP has been recorded.'}
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-brand-600 hover:text-brand-700 font-medium text-sm"
        >
          Update my response
        </button>
      </div>
    )
  }

  const statusOptions: { value: RSVPStatus; label: string; icon: string; color: string }[] = [
    { value: 'attending', label: "I'll be there", icon: 'check', color: 'emerald' },
    { value: 'maybe', label: 'Maybe', icon: 'help', color: 'amber' },
    { value: 'declined', label: "Can't make it", icon: 'x', color: 'red' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* RSVP Status Selection */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Will you be attending?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRsvpStatus(option.value)}
              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                rsvpStatus === option.value
                  ? option.color === 'emerald'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : option.color === 'amber'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-stone-700 mb-1">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-900 placeholder:text-stone-400"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
          Email <span className="text-stone-400 text-xs">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-900 placeholder:text-stone-400"
        />
        <p className="text-xs text-stone-500 mt-1">
          So we can reach you if anything changes
        </p>
      </div>

      {/* Only show detailed fields if attending or maybe */}
      {rsvpStatus !== 'declined' && (
        <>
          {/* Plus One */}
          <div className="flex items-center gap-3">
            <input
              id="plusOne"
              type="checkbox"
              checked={plusOne}
              onChange={(e) => setPlusOne(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-stone-300 focus:ring-brand-500"
            />
            <label htmlFor="plusOne" className="text-sm text-stone-700">
              I am bringing a plus-one
            </label>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label htmlFor="dietary" className="block text-sm font-medium text-stone-700 mb-1">
              Dietary Restrictions
            </label>
            <input
              id="dietary"
              type="text"
              value={dietaryInput}
              onChange={(e) => setDietaryInput(e.target.value)}
              placeholder="e.g., vegetarian, kosher, gluten-free"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-900 placeholder:text-stone-400"
            />
            <p className="text-xs text-stone-500 mt-1">
              Separate multiple with commas
            </p>
          </div>

          {/* Allergies */}
          <div>
            <label htmlFor="allergies" className="block text-sm font-medium text-stone-700 mb-1">
              Allergies
            </label>
            <input
              id="allergies"
              type="text"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              placeholder="e.g., peanuts, shellfish, dairy"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-900 placeholder:text-stone-400"
            />
            <p className="text-xs text-stone-500 mt-1">
              Separate multiple with commas
            </p>
          </div>
        </>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-stone-700 mb-1">
          Notes or Questions
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you'd like the host to know..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-900 placeholder:text-stone-400 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !fullName}
        className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? 'Submitting...'
          : isEditing
            ? 'Update RSVP'
            : 'Submit RSVP'}
      </button>
    </form>
  )
}
