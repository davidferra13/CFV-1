'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import type {
  PublicOpenBookingPrefill,
  PublicSeasonalMarketPulseBookingContext,
} from '@/lib/public/public-seasonal-market-pulse'
import {
  buildPublicMarketScopeNote,
  resolvePublicMarketScope,
} from '@/lib/public/public-market-scope'
import {
  canonicalizeBookingServiceType,
  isPrivateDinnerServiceType,
} from '@/lib/booking/service-types'
import {
  NEUTRAL_BOOKING_REQUEST_EXAMPLE,
  NEUTRAL_LOCATION_PLACEHOLDER,
} from '@/lib/site/national-brand-copy'
import { LocationAutocomplete, type LocationData } from '@/components/ui/location-autocomplete'

const DRAFT_KEY = 'cf-book-form-draft'

function loadDraft(): Partial<FormState> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Partial<FormState>) : null
  } catch {
    return null
  }
}

function hasMeaningfulDraftValue(value: unknown) {
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') return value.trim().length > 0
  return false
}

function mergeDraftIntoForm(form: FormState, draft: Partial<FormState>): FormState {
  const next = { ...form }
  const mutableNext = next as Record<keyof FormState, string | number>

  for (const [field, value] of Object.entries(draft) as Array<[keyof FormState, unknown]>) {
    if (field === 'website_url') continue
    if (!hasMeaningfulDraftValue(value)) continue
    mutableNext[field] = value as string | number
  }

  return next
}

function applyPrefill(form: FormState, prefill?: PublicOpenBookingPrefill | null): FormState {
  if (!prefill) return form

  return {
    ...form,
    ...(prefill.location ? { location: prefill.location } : {}),
    ...(prefill.occasion ? { occasion: prefill.occasion } : {}),
    ...(prefill.service_type
      ? { service_type: canonicalizeBookingServiceType(prefill.service_type) }
      : {}),
    ...(prefill.additional_notes ? { additional_notes: prefill.additional_notes } : {}),
  }
}

function saveDraft(form: FormState) {
  try {
    // Never persist honeypot field
    const { website_url: _, ...safe } = form
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(safe))
  } catch {
    // Storage unavailable - non-fatal
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // non-fatal
  }
}

const SERVICE_OPTIONS = [
  { value: '', label: 'What type of service?' },
  { value: 'private_dinner', label: 'Dinner party (private dining for your guests)' },
  { value: 'meal_prep', label: 'Meal prep (weekly meals in your kitchen)' },
  { value: 'catering', label: 'Catering (buffet or stations for groups)' },
  { value: 'wedding', label: 'Wedding or celebration' },
  { value: 'cooking_class', label: 'Cooking class (learn from a pro)' },
  { value: 'other', label: 'Something else (tell us in the notes)' },
]

const GUEST_OPTIONS = [
  { value: 0, label: 'How many guests?' },
  { value: 1, label: '1-2 (intimate)' },
  { value: 4, label: '3-6 (small gathering)' },
  { value: 8, label: '7-12 (dinner party)' },
  { value: 18, label: '13-25 (large party)' },
  { value: 35, label: '26-50 (event)' },
  { value: 75, label: '50+ (large event)' },
]

const BUDGET_OPTIONS = [
  { value: '', label: 'What experience level?', hint: '' },
  { value: 'not-sure', label: 'Not sure yet (help me figure it out)', hint: '' },
  { value: 'casual', label: 'Casual home cooking', hint: 'Typically $25-50 / person' },
  { value: 'elevated', label: 'Elevated dining experience', hint: 'Typically $50-100 / person' },
  {
    value: 'fine-dining',
    label: 'Fine dining / restaurant quality',
    hint: 'Typically $100-200 / person',
  },
  { value: 'luxury', label: 'Luxury / fully custom', hint: 'Typically $200+ / person' },
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
  booking_token?: string
}

const _bdfN = new Date()
const todayStr = `${_bdfN.getFullYear()}-${String(_bdfN.getMonth() + 1).padStart(2, '0')}-${String(_bdfN.getDate()).padStart(2, '0')}`

const inputClass =
  'w-full rounded-xl border border-stone-600/80 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors'
const labelClass = 'block text-sm font-medium text-stone-200 mb-1.5'
const selectClass =
  'w-full rounded-xl border border-stone-600/80 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none cursor-pointer transition-colors'

const DEFAULT_FORM: FormState = {
  full_name: '',
  email: '',
  phone: '',
  location: '',
  event_date: '',
  serve_time: '',
  guest_count: 0,
  occasion: '',
  service_type: '',
  budget_range: '',
  dietary_restrictions: '',
  additional_notes: '',
  website_url: '',
}

type BookDinnerFormProps = {
  initialPrefill?: PublicOpenBookingPrefill
  seasonalContext?: PublicSeasonalMarketPulseBookingContext | null
  analyticsEntryContext?: string | null
  trackingParams?: {
    referral_source?: string
    referral_partner_id?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
  }
}

export function BookDinnerForm({
  initialPrefill,
  seasonalContext,
  analyticsEntryContext,
  trackingParams,
}: BookDinnerFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => applyPrefill(DEFAULT_FORM, initialPrefill))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const [nlText, setNlText] = useState('')
  const [nlParsing, setNlParsing] = useState(false)
  const [nlUsed, setNlUsed] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [dateFlexible, setDateFlexible] = useState(false)
  const liveScope = seasonalContext
    ? resolvePublicMarketScope({
        explicitLabel: form.location,
        source: 'request_location',
      })
    : null
  const effectiveScope =
    seasonalContext == null
      ? null
      : liveScope && !liveScope.isFallback
        ? liveScope
        : seasonalContext.scope
  const seasonalAnalytics =
    seasonalContext && effectiveScope
      ? {
          season: seasonalContext.season,
          source_mode: seasonalContext.sourceMode,
          market_scope: effectiveScope.label,
          market_scope_mode: effectiveScope.mode,
          lead_ingredients: seasonalContext.peakNow.join(' | '),
          fallback_reason:
            seasonalContext.intent.provenance.fallbackReason === 'none'
              ? null
              : seasonalContext.intent.provenance.fallbackReason,
          market_freshness_status: seasonalContext.intent.provenance.marketStatus,
        }
      : null
  const seasonalIntent = seasonalContext
    ? {
        ...seasonalContext.intent,
        ...(effectiveScope && effectiveScope.label !== seasonalContext.scope.label
          ? { requestScope: effectiveScope }
          : {}),
      }
    : null

  // Restore draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft && Object.values(draft).some((v) => v)) {
      setForm((prev) => mergeDraftIntoForm(prev, draft))
    }
  }, [])

  function updateField(field: keyof FormState, value: string | number) {
    if (!hasStarted && field !== 'website_url' && String(value).trim().length > 0) {
      setHasStarted(true)
      trackEvent(ANALYTICS_EVENTS.BOOKING_FORM_STARTED, {
        source: 'open_booking',
        entry_context: analyticsEntryContext ?? 'direct',
        first_field: field,
        ...(seasonalAnalytics ?? {}),
      })
    }

    setForm((prev) => {
      const next = { ...prev, [field]: value }
      saveDraft(next)
      return next
    })
  }

  async function handleNlParse() {
    if (!nlText.trim() || nlText.length < 10) return
    setNlParsing(true)
    try {
      const res = await fetch('/api/book/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nlText }),
      })
      if (!res.ok) return
      const fields = await res.json()
      setForm((prev) => {
        const next = { ...prev }
        if (fields.occasion) next.occasion = fields.occasion
        if (fields.service_type) {
          next.service_type = canonicalizeBookingServiceType(fields.service_type)
        }
        if (fields.guest_count) next.guest_count = fields.guest_count
        if (fields.event_date) next.event_date = fields.event_date
        if (fields.serve_time) next.serve_time = fields.serve_time
        if (fields.location) next.location = fields.location
        if (fields.budget_range) next.budget_range = fields.budget_range
        if (fields.dietary_restrictions) next.dietary_restrictions = fields.dietary_restrictions
        if (fields.additional_notes) next.additional_notes = fields.additional_notes
        saveDraft(next)
        return next
      })
      setNlUsed(true)
    } catch {
      // Non-fatal, user can fill manually
    } finally {
      setNlParsing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setEmailSuggestion(null)
    setResult(null)

    // Client-side: prevent past dates
    if (form.event_date && form.event_date < todayStr) {
      setError('Please select a future date for your event.')
      setSubmitting(false)
      return
    }

    // Client-side: require guest count selection
    if (!form.guest_count) {
      setError('Please select the number of guests.')
      setSubmitting(false)
      return
    }

    try {
      const additionalNotes = [
        dateFlexible ? 'Event date is flexible by a day or two.' : null,
        form.additional_notes.trim() || null,
      ]
        .filter(Boolean)
        .join('\n\n')

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          service_type: canonicalizeBookingServiceType(form.service_type),
          additional_notes: additionalNotes,
          seasonal_intent: seasonalIntent,
          referral_source: trackingParams?.referral_source || '',
          referral_partner_id: trackingParams?.referral_partner_id || '',
          utm_source: trackingParams?.utm_source || '',
          utm_medium: trackingParams?.utm_medium || '',
          utm_campaign: trackingParams?.utm_campaign || '',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        if (data.emailSuggestion) {
          setEmailSuggestion(data.emailSuggestion)
        }
        return
      }

      clearDraft()
      trackEvent(ANALYTICS_EVENTS.BOOKING_FORM_SUBMITTED, {
        source: 'open_booking',
        entry_context: analyticsEntryContext ?? 'direct',
        matched_count: data.matched_count ?? 0,
        has_matches: (data.matched_count ?? 0) > 0,
        ...(seasonalAnalytics ?? {}),
      })

      // Redirect to status page if we got a booking token
      if (data.booking_token) {
        router.push(`/book/status/${data.booking_token}`)
        return
      }

      // Fallback: show inline success (no booking record created)
      setResult(data)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Success state
  if (result?.success) {
    const hasMatches = (result.matched_count ?? 0) > 0
    const browseParams = new URLSearchParams()
    if (form.location.trim()) browseParams.set('location', form.location.trim())
    if (form.guest_count > 0) browseParams.set('partySize', String(form.guest_count))
    if (form.service_type === 'meal_prep') browseParams.set('intent', 'meal_prep')
    if (form.service_type === 'catering') browseParams.set('intent', 'team_dinner')
    if (isPrivateDinnerServiceType(form.service_type)) browseParams.set('intent', 'dinner_party')
    const browseHref = `/eat${browseParams.toString() ? `?${browseParams.toString()}` : ''}`
    const steps = [
      { label: 'Request received', note: 'Your details are with the chef.', done: true },
      {
        label: 'Chef reviews and responds',
        note: 'Usually within 24 hours. You will get an email.',
        done: false,
      },
      {
        label: 'Menu and quote sent to you',
        note: 'Review, ask questions, request changes.',
        done: false,
      },
      { label: 'Confirm and pay deposit', note: 'Locks in your date.', done: false },
      { label: 'Dinner', note: 'Chef arrives, cooks, cleans up. You enjoy.', done: false },
    ]

    return (
      <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-700/50 shrink-0">
            <svg
              className="h-6 w-6 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-stone-100">Request sent</h2>
            <p className="text-sm text-stone-400 mt-0.5">{result.message}</p>
          </div>
        </div>

        {/* What happens next */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            What happens next
          </p>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50'
                      : 'bg-stone-800 text-stone-500 border border-stone-700'
                  }`}
                >
                  {step.done ? 'OK' : i + 1}
                </span>
                <div>
                  <p
                    className={`text-sm font-medium ${step.done ? 'text-emerald-300' : 'text-stone-300'}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{step.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {!hasMatches && (
          <div className="rounded-xl border border-stone-700 bg-stone-950/70 p-4">
            <p className="text-sm text-stone-400">
              No chefs matched your area yet. Browse broader chef and food options while ChefFlow
              keeps the request available for follow-up.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={browseHref}
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Browse food options
              </a>
              <a
                href="/chefs"
                className="inline-flex rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600"
              >
                Browse chef directory
              </a>
            </div>
          </div>
        )}
        {hasMatches && (
          <div className="rounded-xl border border-stone-700 bg-stone-950/70 p-4">
            <p className="text-sm text-stone-400">
              A confirmation email is on its way. You can keep browsing chef profiles and food ideas
              while matched chefs review the request.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={browseHref}
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Browse while you wait
              </a>
              <a
                href="/chefs"
                className="inline-flex rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600"
              >
                Chef profiles
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {seasonalContext && (
        <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            {seasonalContext.summary.eyebrow}
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {seasonalContext.summary.headline}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-300">{seasonalContext.summary.body}</p>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            {seasonalContext.summary.sourceNote}
          </p>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            {effectiveScope
              ? buildPublicMarketScopeNote(effectiveScope)
              : seasonalContext.summary.scopeNote}
          </p>
        </div>
      )}

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

      {/* NL Quick Fill */}
      {!nlUsed && (
        <div className="rounded-2xl border border-stone-700/60 bg-stone-900/40 p-5 sm:p-6 space-y-3">
          <div>
            <p className="text-sm font-medium text-stone-200">Describe your event</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Tell us what you're looking for and we'll fill the form for you.
            </p>
          </div>
          <textarea
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            placeholder={NEUTRAL_BOOKING_REQUEST_EXAMPLE}
            rows={2}
            className={`${inputClass} resize-none`}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleNlParse}
              disabled={nlParsing || nlText.length < 10}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {nlParsing ? 'Reading...' : 'Fill form'}
            </button>
            <span className="text-xs text-stone-600">or fill out the fields below</span>
          </div>
        </div>
      )}

      {nlUsed && (
        <div className="flex items-center gap-2 px-1">
          <svg
            className="w-4 h-4 text-emerald-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs text-stone-400">
            Form filled from your description. Review and adjust below.
          </p>
        </div>
      )}

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
              min={todayStr}
              value={form.event_date}
              onChange={(e) => updateField('event_date', e.target.value)}
              className={inputClass}
            />
            <label className="mt-2 flex items-start gap-2 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={dateFlexible}
                onChange={(e) => setDateFlexible(e.target.checked)}
                className="mt-0.5 rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-600"
              />
              <span>Flexible by a day or two.</span>
            </label>
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
            <LocationAutocomplete
              id="book-location"
              required
              value={form.location}
              onSelect={(data: LocationData) => updateField('location', data.displayText)}
              onChange={(text) => updateField('location', text)}
              placeholder={NEUTRAL_LOCATION_PLACEHOLDER}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-stone-500">
              City, neighborhood, ZIP code, or venue is enough to start matching chefs.
            </p>
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
            <p className="mt-1.5 text-xs text-stone-500">
              Choose the closest range. Final guest count can be confirmed before the proposal.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="book-budget" className={labelClass}>
            Budget per person
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
          {form.budget_range && BUDGET_OPTIONS.find((o) => o.value === form.budget_range)?.hint && (
            <p className="mt-1.5 text-xs font-medium text-emerald-400/80">
              {BUDGET_OPTIONS.find((o) => o.value === form.budget_range)?.hint}
            </p>
          )}
          <p className="mt-1.5 text-xs text-stone-500">
            Per-person estimate to help chefs tailor their proposal. Final pricing is set by your
            chef.
          </p>
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
          {emailSuggestion && (
            <button
              type="button"
              className="mt-2 block text-brand-400 hover:text-brand-300 underline"
              onClick={() => {
                updateField('email', emailSuggestion)
                setError(null)
                setEmailSuggestion(null)
              }}
            >
              Did you mean {emailSuggestion}?
            </button>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] shadow-lg transition-all active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none touch-manipulation"
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

      <p className="text-center text-xs text-stone-400">
        Matched chefs typically respond within 24 hours. Free to submit, no obligation.
      </p>
      <p className="text-center text-xs text-stone-500">
        Your information is shared only with matched chefs. We never sell your data.
      </p>
    </form>
  )
}
