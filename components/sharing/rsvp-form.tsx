// RSVP Form - Guest-facing form for submitting/updating RSVPs
// Two-mode design: Quick RSVP (status + name = done) or expand for dietary/allergy details
// Includes photo consent checkbox and plus-one detail capture
// Used on the public share page. No authentication required.

'use client'

import { useState } from 'react'
import { submitRSVP, updateRSVP } from '@/lib/sharing/actions'

type RSVPStatus = 'attending' | 'declined' | 'maybe'

interface RSVPFormProps {
  shareToken: string
  eventId: string
  chefProfileUrl?: string | null
  chefName?: string | null
  existingGuest?: {
    guest_token: string
    full_name: string
    email: string | null
    rsvp_status: string
    dietary_restrictions: string[] | null
    allergies: string[] | null
    notes: string | null
    plus_one: boolean
    photo_consent?: boolean
    data_processing_consent?: boolean
    marketing_opt_in?: boolean
    plus_one_name?: string | null
    plus_one_allergies?: string[] | null
    plus_one_dietary?: string[] | null
    [key: string]: unknown
  } | null
}

export function RSVPForm({
  shareToken,
  eventId,
  chefProfileUrl,
  chefName,
  existingGuest,
}: RSVPFormProps) {
  const isEditing = !!existingGuest
  const hasExistingDetails = !!(
    existingGuest?.dietary_restrictions?.length ||
    existingGuest?.allergies?.length ||
    existingGuest?.notes ||
    existingGuest?.plus_one
  )

  const [fullName, setFullName] = useState(existingGuest?.full_name || '')
  const [email, setEmail] = useState(existingGuest?.email || '')
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>(
    (existingGuest?.rsvp_status as RSVPStatus) || 'attending'
  )
  const [dietaryInput, setDietaryInput] = useState(
    existingGuest?.dietary_restrictions?.join(', ') || ''
  )
  const [allergyInput, setAllergyInput] = useState(existingGuest?.allergies?.join(', ') || '')
  const [notes, setNotes] = useState(existingGuest?.notes || '')
  const [plusOne, setPlusOne] = useState(existingGuest?.plus_one || false)
  const [plusOneName, setPlusOneName] = useState(existingGuest?.plus_one_name || '')
  const [plusOneAllergies, setPlusOneAllergies] = useState(
    existingGuest?.plus_one_allergies?.join(', ') || ''
  )
  const [plusOneDietary, setPlusOneDietary] = useState(
    existingGuest?.plus_one_dietary?.join(', ') || ''
  )
  const [photoConsent, setPhotoConsent] = useState(existingGuest?.photo_consent || false)
  const [dataProcessingConsent, setDataProcessingConsent] = useState(
    existingGuest?.data_processing_consent ?? true
  )
  const [marketingOptIn, setMarketingOptIn] = useState(existingGuest?.marketing_opt_in ?? false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [waitlisted, setWaitlisted] = useState(false)
  const [error, setError] = useState('')
  const [guestToken, setGuestToken] = useState(existingGuest?.guest_token || '')
  const [showDetails, setShowDetails] = useState(isEditing && hasExistingDetails)

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
    const poAllergies = plusOneAllergies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const poDietary = plusOneDietary
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!dataProcessingConsent) {
      setError('Data processing consent is required to submit RSVP.')
      setLoading(false)
      return
    }

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
          photo_consent: photoConsent,
          plus_one_name: plusOne ? plusOneName || undefined : undefined,
          plus_one_allergies: plusOne ? poAllergies : undefined,
          plus_one_dietary: plusOne ? poDietary : undefined,
          data_processing_consent: dataProcessingConsent,
          marketing_opt_in: marketingOptIn,
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
          photo_consent: photoConsent,
          plus_one_name: plusOne ? plusOneName || undefined : undefined,
          plus_one_allergies: plusOne ? poAllergies : undefined,
          plus_one_dietary: plusOne ? poDietary : undefined,
          data_processing_consent: dataProcessingConsent,
          marketing_opt_in: marketingOptIn,
        })

        if (result.guestToken) {
          setGuestToken(result.guestToken)
          document.cookie = `guest_token_${eventId}=${result.guestToken}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`
        }

        if (result.alreadyExists) {
          setError('You have already RSVPed with this email. Your previous response is on file.')
          setLoading(false)
          return
        }

        setWaitlisted(!!(result as any).waitlisted)
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    const guestPortalHref = guestToken ? `/event/${eventId}/guest/${guestToken}` : null

    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-stone-100 mb-2">
          {waitlisted
            ? "You're on the waitlist"
            : rsvpStatus === 'attending'
              ? 'See you there!'
              : rsvpStatus === 'maybe'
                ? 'Thanks for letting us know!'
                : 'Thanks for responding'}
        </h3>
        <p className="text-stone-400 mb-6">
          {waitlisted
            ? 'The event is currently at capacity. You have been added to the waitlist.'
            : isEditing
              ? 'Your RSVP has been updated.'
              : 'Your RSVP has been recorded.'}
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-brand-600 hover:text-brand-400 font-medium text-sm"
        >
          Update my response
        </button>

        {guestPortalHref && (
          <div className="mt-3">
            <a
              href={guestPortalHref}
              className="text-brand-600 hover:text-brand-400 text-sm underline"
            >
              Open my guest portal
            </a>
          </div>
        )}

        {chefProfileUrl && rsvpStatus === 'attending' && (
          <div className="mt-8 pt-6 border-t border-stone-700">
            <p className="text-sm text-stone-500 mb-3">
              Love private dining? Book your own event with {chefName || 'your chef'}.
            </p>
            <a
              href={chefProfileUrl}
              className="inline-block px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
            >
              Book Your Own Event
            </a>
          </div>
        )}
      </div>
    )
  }

  const statusOptions: { value: RSVPStatus; label: string; color: string }[] = [
    { value: 'attending', label: "I'll be there", color: 'emerald' },
    { value: 'maybe', label: 'Maybe', color: 'amber' },
    { value: 'declined', label: "Can't make it", color: 'red' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-950 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* RSVP Status Selection */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
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
                    ? 'border-emerald-500 bg-emerald-950 text-emerald-700'
                    : option.color === 'amber'
                      ? 'border-amber-500 bg-amber-950 text-amber-700'
                      : 'border-red-500 bg-red-950 text-red-700'
                  : 'border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-stone-300 mb-1">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-300 mb-1">
          Email <span className="text-stone-400 text-xs">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400"
        />
        <p className="text-xs text-stone-500 mt-1">So we can reach you if anything changes</p>
      </div>

      {/* Expandable details section */}
      {rsvpStatus !== 'declined' && (
        <>
          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="w-full py-3 rounded-lg border-2 border-dashed border-stone-600 text-sm font-medium text-stone-500 hover:border-stone-400 hover:text-stone-300 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add allergies, dietary needs, or a plus-one
            </button>
          ) : (
            <div className="space-y-4 bg-stone-800 rounded-lg p-4 border border-stone-700">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-stone-300">Additional Details</h4>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="text-xs text-stone-400 hover:text-stone-400"
                >
                  Hide
                </button>
              </div>

              {/* Plus One toggle + details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    id="plusOne"
                    type="checkbox"
                    checked={plusOne}
                    onChange={(e) => setPlusOne(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-stone-600 focus:ring-brand-500"
                  />
                  <label htmlFor="plusOne" className="text-sm text-stone-300">
                    I am bringing a plus-one
                  </label>
                </div>

                {plusOne && (
                  <div className="ml-7 space-y-3 pl-3 border-l-2 border-stone-700">
                    <div>
                      <label
                        htmlFor="plusOneName"
                        className="block text-sm font-medium text-stone-300 mb-1"
                      >
                        Plus-one&apos;s name
                      </label>
                      <input
                        id="plusOneName"
                        type="text"
                        value={plusOneName}
                        onChange={(e) => setPlusOneName(e.target.value)}
                        placeholder="Their full name"
                        className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 bg-stone-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="plusOneAllergies"
                        className="block text-sm font-medium text-stone-300 mb-1"
                      >
                        Their allergies
                      </label>
                      <input
                        id="plusOneAllergies"
                        type="text"
                        value={plusOneAllergies}
                        onChange={(e) => setPlusOneAllergies(e.target.value)}
                        placeholder="e.g., peanuts, shellfish"
                        className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 bg-stone-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="plusOneDietary"
                        className="block text-sm font-medium text-stone-300 mb-1"
                      >
                        Their dietary restrictions
                      </label>
                      <input
                        id="plusOneDietary"
                        type="text"
                        value={plusOneDietary}
                        onChange={(e) => setPlusOneDietary(e.target.value)}
                        placeholder="e.g., vegetarian, gluten-free"
                        className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 bg-stone-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dietary */}
              <div>
                <label htmlFor="dietary" className="block text-sm font-medium text-stone-300 mb-1">
                  Dietary Restrictions
                </label>
                <input
                  id="dietary"
                  type="text"
                  value={dietaryInput}
                  onChange={(e) => setDietaryInput(e.target.value)}
                  placeholder="e.g., vegetarian, kosher, gluten-free"
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 bg-stone-900"
                />
                <p className="text-xs text-stone-500 mt-1">Separate multiple with commas</p>
              </div>

              {/* Allergies */}
              <div>
                <label
                  htmlFor="allergies"
                  className="block text-sm font-medium text-stone-300 mb-1"
                >
                  Allergies
                </label>
                <input
                  id="allergies"
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder="e.g., peanuts, shellfish, dairy"
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 bg-stone-900"
                />
                <p className="text-xs text-stone-500 mt-1">Separate multiple with commas</p>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-stone-300 mb-1">
                  Notes or Questions
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything you'd like the host to know..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 resize-none bg-stone-900"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Declined - still allow a note */}
      {rsvpStatus === 'declined' && (
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-stone-300 mb-1">
            Send a note <span className="text-stone-400 text-xs">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sorry I can't make it! Have fun..."
            rows={2}
            className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 resize-none"
          />
        </div>
      )}

      {/* Photo consent - simple, friendly, not creepy */}
      {rsvpStatus !== 'declined' && (
        <div className="flex items-center gap-3">
          <input
            id="photoConsent"
            type="checkbox"
            checked={photoConsent}
            onChange={(e) => setPhotoConsent(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded border-stone-600 focus:ring-brand-500"
          />
          <label htmlFor="photoConsent" className="text-sm text-stone-400">
            Cool to share food pics from the event
          </label>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-stone-700 bg-stone-900/40 p-3">
        <div className="flex items-center gap-3">
          <input
            id="dataConsent"
            type="checkbox"
            checked={dataProcessingConsent}
            onChange={(e) => setDataProcessingConsent(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded border-stone-600 focus:ring-brand-500"
          />
          <label htmlFor="dataConsent" className="text-sm text-stone-300">
            I consent to processing RSVP details for event planning
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="marketingOptIn"
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded border-stone-600 focus:ring-brand-500"
          />
          <label htmlFor="marketingOptIn" className="text-sm text-stone-400">
            I&apos;m open to occasional private dining updates
          </label>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !fullName}
        className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : isEditing ? 'Update RSVP' : 'Submit RSVP'}
      </button>
    </form>
  )
}
