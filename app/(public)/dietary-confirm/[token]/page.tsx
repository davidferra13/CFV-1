'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const COMMON_RESTRICTIONS = [
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'nut-free', label: 'Nut-free' },
  { id: 'shellfish-free', label: 'Shellfish-free' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'halal', label: 'Halal' },
]

const SEVERITY_OPTIONS = [
  { value: 'preference', label: 'Preference (I avoid it when possible)' },
  { value: 'intolerance', label: 'Intolerance (causes discomfort)' },
  { value: 'allergy', label: 'Allergy (causes a reaction)' },
  { value: 'life_threatening', label: 'Life-threatening (anaphylaxis risk)' },
]

const SPICE_OPTIONS = [
  { value: 'none', label: 'No spice' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
  { value: 'extra_hot', label: 'Extra hot' },
]

type PageState = 'loading' | 'form' | 'submitted' | 'already_done' | 'expired' | 'error'

export default function DietaryConfirmPage() {
  const params = useParams()
  const token = params.token as string

  const [state, setState] = useState<PageState>('loading')
  const [guestName, setGuestName] = useState('')
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [allergyText, setAllergyText] = useState('')
  const [severity, setSeverity] = useState<string>('')
  const [spice, setSpice] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dietary-confirm/${token}`)
        if (res.status === 410) {
          setState('expired')
          return
        }
        if (!res.ok) {
          setState('error')
          return
        }
        const data = await res.json()
        if (data.already_responded) {
          setState('already_done')
          return
        }
        setGuestName(data.guest_name || '')
        setRestrictions(data.dietary_restrictions || [])
        setAllergyText((data.allergies || []).join(', '))
        setSeverity(data.allergy_severity || '')
        setSpice(data.spice_tolerance || '')
        setState('form')
      } catch {
        setState('error')
      }
    }
    load()
  }, [token])

  function toggleRestriction(id: string) {
    setRestrictions((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    const allergies = allergyText
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const res = await fetch(`/api/dietary-confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietary_restrictions: restrictions,
          allergies,
          allergy_severity: severity || null,
          spice_tolerance: spice || null,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setState('submitted')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Link Expired</h1>
          <p className="text-stone-400">
            This dietary confirmation link is no longer valid. Please contact your host for a new
            one.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Something Went Wrong</h1>
          <p className="text-stone-400">
            We could not load this page. The link may be invalid or expired.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'already_done') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Already Confirmed</h1>
          <p className="text-stone-400">
            You have already submitted your dietary information. Thank you!
          </p>
        </div>
      </div>
    )
  }

  if (state === 'submitted') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Thank You!</h1>
          <p className="text-stone-400">
            Your dietary information has been saved. Your chef will prepare accordingly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">Dietary Confirmation</h1>
          {guestName && (
            <p className="text-stone-400 mt-2">
              Hi {guestName}, please confirm any dietary needs below.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dietary Restrictions */}
          <fieldset>
            <legend className="text-sm font-medium text-stone-300 mb-3">
              Dietary Restrictions
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_RESTRICTIONS.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    restrictions.includes(item.id)
                      ? 'border-amber-500 bg-amber-500/10 text-stone-100'
                      : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={restrictions.includes(item.id)}
                    onChange={() => toggleRestriction(item.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      restrictions.includes(item.id)
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-stone-500'
                    }`}
                  >
                    {restrictions.includes(item.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Allergies free text */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Allergies (separate with commas)
            </label>
            <input
              type="text"
              value={allergyText}
              onChange={(e) => setAllergyText(e.target.value)}
              placeholder="e.g. peanuts, shellfish, sesame"
              className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Severity Level</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">No specific severity</option>
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Spice Tolerance */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Spice Tolerance</label>
            <select
              value={spice}
              onChange={(e) => setSpice(e.target.value)}
              className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">No preference</option>
              {SPICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional notes */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything else your chef should know..."
              className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error message */}
          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-semibold rounded-lg transition-colors"
          >
            {submitting ? 'Saving...' : 'Confirm Dietary Needs'}
          </button>

          <p className="text-xs text-stone-500 text-center">
            No restrictions? Just hit confirm with nothing selected.
          </p>
        </form>
      </div>
    </div>
  )
}
