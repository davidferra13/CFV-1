'use client'

import { useState } from 'react'

const SERVICE_OPTIONS = [
  { value: '', label: 'Select a service type' },
  { value: 'private_dinner', label: 'Private dinner' },
  { value: 'catering', label: 'Catering' },
  { value: 'meal_prep', label: 'Meal prep' },
  { value: 'wedding', label: 'Wedding or celebration' },
  { value: 'corporate', label: 'Corporate dining' },
  { value: 'cooking_class', label: 'Cooking class' },
  { value: 'event_chef', label: 'Event chef' },
  { value: 'personal_chef', label: 'Personal chef' },
  { value: 'retreat', label: 'Retreat or multi-day' },
  { value: 'popup', label: 'Pop-up' },
]

const GUEST_OPTIONS = [
  { value: 2, label: '2 guests' },
  { value: 4, label: '4 guests' },
  { value: 6, label: '6 guests' },
  { value: 8, label: '8 guests' },
  { value: 10, label: '10 guests' },
  { value: 15, label: '15 guests' },
  { value: 20, label: '20 guests' },
  { value: 30, label: '30 guests' },
  { value: 50, label: '50 guests' },
  { value: 75, label: '75+' },
]

const BUDGET_OPTIONS = [
  { value: '', label: 'Select your budget' },
  { value: 'flexible', label: 'Flexible (open to suggestions)' },
  { value: 'under-500', label: 'Under $500' },
  { value: '500-1000', label: '$500 - $1,000' },
  { value: '1000-2000', label: '$1,000 - $2,000' },
  { value: '2000-5000', label: '$2,000 - $5,000' },
  { value: '5000-plus', label: '$5,000+' },
]

type FormState = {
  full_name: string
  email: string
  phone: string
  location: string
  event_date: string
  serve_time: string
  guest_count: number
  occasion: string
  service_type: string
  budget_range: string
  dietary_restrictions: string
  additional_notes: string
  website_url: string // honeypot
}

type SubmitResult = {
  success: boolean
  matched_count?: number
  location?: string
  message?: string
  error?: string
}

const inputClass =
  'w-full rounded-xl border border-stone-600/80 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors'
const labelClass = 'block text-sm font-medium text-stone-200 mb-1.5'
const selectClass =
  'w-full rounded-xl border border-stone-600/80 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none cursor-pointer transition-colors'

export function BookDinnerForm() {
  const [form, setForm] = useState<FormState>({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    event_date: '',
    serve_time: '',
    guest_count: 6,
    occasion: '',
    service_type: '',
    budget_range: '',
    dietary_restrictions: '',
    additional_notes: '',
    website_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      setResult(data)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Success state
  if (result?.success) {
    return (
      <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-700/50">
          <svg
            className="h-8 w-8 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-semibold text-stone-100">Request submitted</h2>
        <p className="mt-3 text-sm text-stone-300 leading-relaxed max-w-md mx-auto">
          {result.message}
        </p>
        {result.matched_count === 0 && (
          <p className="mt-4 text-sm text-stone-400">
            In the meantime, you can{' '}
            <a href="/chefs" className="text-brand-400 hover:text-brand-300 underline">
              browse our chef directory
            </a>{' '}
            to find chefs in other areas.
          </p>
        )}
        {(result.matched_count ?? 0) > 0 && (
          <p className="mt-4 text-sm text-stone-400">
            Check your email for confirmation. You can also{' '}
            <a href="/chefs" className="text-brand-400 hover:text-brand-300 underline">
              browse chef profiles
            </a>{' '}
            while you wait.
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          value={form.website_url}
          onChange={(e) => updateField('website_url', e.target.value)}
        />
      </div>

      {/* Section 1: Your event */}
      <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-5 sm:p-6 space-y-5">
        <h2 className="text-base font-semibold text-stone-100">About your event</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="book-service" className={labelClass}>
              What do you need?
            </label>
            <select
              id="book-service"
              value={form.service_type}
              onChange={(e) => updateField('service_type', e.target.value)}
              className={selectClass}
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-stone-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="book-occasion" className={labelClass}>
              Occasion *
            </label>
            <input
              id="book-occasion"
              type="text"
              required
              placeholder="Birthday, anniversary, date night..."
              value={form.occasion}
              onChange={(e) => updateField('occasion', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="book-date" className={labelClass}>
              Event date *
            </label>
            <input
              id="book-date"
              type="date"
              required
              value={form.event_date}
              onChange={(e) => updateField('event_date', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="book-time" className={labelClass}>
              Preferred serve time
            </label>
            <input
              id="book-time"
              type="time"
              value={form.serve_time}
              onChange={(e) => updateField('serve_time', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="book-location" className={labelClass}>
              Event location *
            </label>
            <input
              id="book-location"
              type="text"
              required
              placeholder="City, state or ZIP code"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="book-guests" className={labelClass}>
              Number of guests *
            </label>
            <select
              id="book-guests"
              value={form.guest_count}
              onChange={(e) => updateField('guest_count', Number(e.target.value))}
              className={selectClass}
              required
            >
              {GUEST_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-stone-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="book-budget" className={labelClass}>
            Budget
          </label>
          <select
            id="book-budget"
            value={form.budget_range}
            onChange={(e) => updateField('budget_range', e.target.value)}
            className={selectClass}
          >
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-stone-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 2: Preferences */}
      <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-5 sm:p-6 space-y-5">
        <h2 className="text-base font-semibold text-stone-100">Preferences (optional)</h2>

        <div>
          <label htmlFor="book-dietary" className={labelClass}>
            Dietary restrictions or allergies
          </label>
          <textarea
            id="book-dietary"
            rows={2}
            placeholder="Gluten-free, nut allergy, vegetarian guests..."
            value={form.dietary_restrictions}
            onChange={(e) => updateField('dietary_restrictions', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="book-notes" className={labelClass}>
            Anything else we should know?
          </label>
          <textarea
            id="book-notes"
            rows={3}
            placeholder="Cuisine preferences, inspiration, special requests..."
            value={form.additional_notes}
            onChange={(e) => updateField('additional_notes', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Section 3: Your info */}
      <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-5 sm:p-6 space-y-5">
        <h2 className="text-base font-semibold text-stone-100">Your contact info</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="book-name" className={labelClass}>
              Full name *
            </label>
            <input
              id="book-name"
              type="text"
              required
              placeholder="Your name"
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="book-email" className={labelClass}>
              Email *
            </label>
            <input
              id="book-email"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="sm:w-1/2">
          <label htmlFor="book-phone" className={labelClass}>
            Phone (optional)
          </label>
          <input
            id="book-phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white glow-hover shadow-lg transition-all active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none touch-manipulation"
      >
        {submitting ? (
          <>
            <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Finding chefs near you...
          </>
        ) : (
          'Find chefs for my event'
        )}
      </button>

      <p className="text-center text-xs text-stone-500">
        Your information is shared only with matched chefs. We never sell your data.
      </p>
    </form>
  )
}
