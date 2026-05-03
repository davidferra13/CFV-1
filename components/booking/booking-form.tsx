'use client'

// BookingForm - public booking form for the chef booking page.
// Dual-mode: inquiry-first (submit inquiry) or instant-book (pay deposit via Stripe Checkout).

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { submitPublicInquiry } from '@/lib/inquiries/public-actions'
import { createInstantBookingCheckout } from '@/lib/booking/instant-book-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import {
  DietaryIntakeFields,
  emptyDietaryIntake,
  type DietaryIntakeValue,
} from '@/components/forms/dietary-intake-fields'
import type { BookingConfig } from '@/app/book/[chefSlug]/booking-page-client'
import { NEUTRAL_ADDRESS_PLACEHOLDER } from '@/lib/site/national-brand-copy'

export type BookingPrefill = {
  fullName?: string
  email?: string
  phone?: string
  occasion?: string
  guestCount?: string
  address?: string
  notes?: string
  dietaryText?: string
}

type Props = {
  chefSlug: string
  selectedDate: string // YYYY-MM-DD pre-filled from calendar
  onBack: () => void
  bookingConfig?: BookingConfig
  prefill?: BookingPrefill
}

type MultiDayMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'late_snack' | 'dropoff' | 'other'
type MultiDayExecutionType = 'on_site' | 'drop_off' | 'prep_only' | 'hybrid'
type CalendarTruthMode = 'verified_external' | 'internal_only' | 'degraded'

type MultiDaySessionRow = {
  id: string
  service_date: string
  meal_slot: MultiDayMealSlot
  execution_type: MultiDayExecutionType
  start_time: string
  end_time: string
  guest_count: string
  notes: string
}

const SESSION_MEAL_OPTIONS: Array<{ value: MultiDayMealSlot; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'late_snack', label: 'Late Snack' },
  { value: 'dropoff', label: 'Drop-off' },
  { value: 'other', label: 'Other' },
]

const SESSION_EXECUTION_OPTIONS: Array<{ value: MultiDayExecutionType; label: string }> = [
  { value: 'on_site', label: 'On-site' },
  { value: 'drop_off', label: 'Drop-off' },
  { value: 'prep_only', label: 'Prep only' },
  { value: 'hybrid', label: 'Hybrid' },
]

function createSessionRow(defaultDate: string, defaultGuests = ''): MultiDaySessionRow {
  return {
    id: crypto.randomUUID(),
    service_date: defaultDate,
    meal_slot: 'dinner',
    execution_type: 'on_site',
    start_time: '',
    end_time: '',
    guest_count: defaultGuests,
    notes: '',
  }
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function createPublicAttemptId(): string {
  const randomUUID = globalThis.crypto?.randomUUID
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto)
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function BookingForm({ chefSlug, selectedDate, onBack, bookingConfig, prefill }: Props) {
  const router = useRouter()

  const isInstantBook = bookingConfig?.bookingModel === 'instant_book'
  const [instantAttemptId] = useState(createPublicAttemptId)

  const [fullName, setFullName] = useState(prefill?.fullName ?? '')
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [phone, setPhone] = useState(prefill?.phone ?? '')
  const [occasion, setOccasion] = useState(prefill?.occasion ?? '')
  const [serviceMode, setServiceMode] = useState<'one_off' | 'recurring' | 'multi_day'>('one_off')
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>(
    'weekly'
  )
  const [recurringDurationWeeks, setRecurringDurationWeeks] = useState('8')
  const [menuRecommendationLeadDays, setMenuRecommendationLeadDays] = useState('7')
  const [multiDayStartDate, setMultiDayStartDate] = useState(selectedDate)
  const [multiDayEndDate, setMultiDayEndDate] = useState(selectedDate)
  const [multiDayOutline, setMultiDayOutline] = useState('')
  const [multiDaySessions, setMultiDaySessions] = useState<MultiDaySessionRow[]>([
    createSessionRow(selectedDate),
  ])
  const [guestCount, setGuestCount] = useState(prefill?.guestCount ?? '')
  const [serveTime, setServeTime] = useState('')
  const [address, setAddress] = useState(prefill?.address ?? '')
  const [notes, setNotes] = useState(prefill?.notes ?? '')
  const [dietaryIntake, setDietaryIntake] = useState<DietaryIntakeValue>(emptyDietaryIntake())
  const [websiteUrl, setWebsiteUrl] = useState('')

  /** Serialize structured dietary intake to a string for server actions */
  const serializeDietary = useCallback(() => {
    if (dietaryIntake.accommodationFlag !== 'yes') return undefined
    const parts: string[] = []
    if (dietaryIntake.dietaryPatterns.length > 0) {
      parts.push(...dietaryIntake.dietaryPatterns)
    }
    for (const sel of dietaryIntake.allergySelections) {
      parts.push(`${sel.allergen} (${sel.severity})`)
    }
    if (dietaryIntake.additionalNotes.trim()) {
      parts.push(dietaryIntake.additionalNotes.trim())
    }
    return parts.length > 0 ? parts.join(', ') : undefined
  }, [dietaryIntake])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rangeAvailabilityLoading, setRangeAvailabilityLoading] = useState(false)
  const [rangeAvailabilitySummary, setRangeAvailabilitySummary] = useState<{
    blockedDates: string[]
    unavailableDates: string[]
    details: Record<string, string[]>
    calendarTruthMode: CalendarTruthMode
    calendarTruthMessage: string
  } | null>(null)

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

  const multiDaySchedulePayload = useMemo(() => {
    if (serviceMode !== 'multi_day') return undefined
    const sessions = multiDaySessions
      .filter((session) => session.service_date)
      .map((session) => ({
        ...(Number.isFinite(Number.parseInt(session.guest_count, 10))
          ? { guest_count: Number.parseInt(session.guest_count, 10) }
          : {}),
        service_date: session.service_date,
        meal_slot: session.meal_slot,
        execution_type: session.execution_type,
        start_time: session.start_time || undefined,
        end_time: session.end_time || undefined,
        notes: session.notes.trim() || undefined,
      }))
    return {
      start_date: multiDayStartDate || selectedDate,
      end_date: multiDayEndDate || multiDayStartDate || selectedDate,
      sessions: sessions.length > 0 ? sessions : undefined,
      outline: multiDayOutline.trim() || undefined,
    }
  }, [
    serviceMode,
    multiDaySessions,
    multiDayStartDate,
    multiDayEndDate,
    selectedDate,
    multiDayOutline,
  ])

  useEffect(() => {
    if (serviceMode !== 'multi_day') {
      setRangeAvailabilitySummary(null)
      return
    }
    if (!multiDayStartDate || !multiDayEndDate || multiDayEndDate < multiDayStartDate) {
      setRangeAvailabilitySummary(null)
      return
    }

    let cancelled = false
    setRangeAvailabilityLoading(true)
    fetch(
      `/book/${chefSlug}/availability?start_date=${encodeURIComponent(multiDayStartDate)}&end_date=${encodeURIComponent(multiDayEndDate)}`
    )
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error((data?.error as string) || 'Availability could not be loaded')
        }
        return data
      })
      .then((data) => {
        if (cancelled) return
        const availability = (data?.availability ?? {}) as Record<string, string>
        const details = (data?.conflict_details ?? {}) as Record<string, string[]>
        const calendarTruth = (data?.calendar_truth ?? {}) as {
          mode?: CalendarTruthMode
          message?: string
        }
        const blockedDates = Object.entries(availability)
          .filter(([, status]) => status === 'blocked')
          .map(([date]) => date)
        const unavailableDates = Object.entries(availability)
          .filter(([, status]) => status === 'unavailable')
          .map(([date]) => date)
        setRangeAvailabilitySummary({
          blockedDates,
          unavailableDates,
          details,
          calendarTruthMode: calendarTruth.mode ?? 'internal_only',
          calendarTruthMessage:
            calendarTruth.message ??
            'Availability reflects confirmed ChefFlow events and chef blocked dates.',
        })
      })
      .catch(() => {
        if (!cancelled) setRangeAvailabilitySummary(null)
      })
      .finally(() => {
        if (!cancelled) setRangeAvailabilityLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [serviceMode, chefSlug, multiDayStartDate, multiDayEndDate])

  function updateSessionRow(id: string, patch: Partial<MultiDaySessionRow>) {
    setMultiDaySessions((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeSessionRow(id: string) {
    setMultiDaySessions((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.id !== id)))
  }

  function addSessionRow(defaultDate?: string) {
    setMultiDaySessions((rows) => [
      ...rows,
      createSessionRow(defaultDate || multiDayStartDate || selectedDate, guestCount || ''),
    ])
  }

  function applyMultiDayTemplate(template: 'retreat' | 'vacation' | 'rotation') {
    const baseDate = multiDayStartDate || selectedDate
    if (!baseDate) return
    const day = (offset: number) => {
      const value = new Date(`${baseDate}T12:00:00Z`)
      value.setUTCDate(value.getUTCDate() + offset)
      return value.toISOString().slice(0, 10)
    }
    const defaultGuests = guestCount || ''

    if (template === 'retreat') {
      setMultiDayStartDate(day(0))
      setMultiDayEndDate(day(2))
      setMultiDayOutline('Retreat cadence: lunch and dinner service each day.')
      setMultiDaySessions([
        { ...createSessionRow(day(0), defaultGuests), meal_slot: 'lunch', start_time: '12:00' },
        { ...createSessionRow(day(0), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
        { ...createSessionRow(day(1), defaultGuests), meal_slot: 'lunch', start_time: '12:00' },
        { ...createSessionRow(day(1), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
        { ...createSessionRow(day(2), defaultGuests), meal_slot: 'lunch', start_time: '12:00' },
        { ...createSessionRow(day(2), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
      ])
      return
    }

    if (template === 'vacation') {
      setMultiDayStartDate(day(0))
      setMultiDayEndDate(day(4))
      setMultiDayOutline('Family vacation week: dinner service daily, breakfast prep drop-offs.')
      setMultiDaySessions([
        { ...createSessionRow(day(0), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
        { ...createSessionRow(day(1), defaultGuests), meal_slot: 'dropoff', start_time: '08:00' },
        { ...createSessionRow(day(1), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
        { ...createSessionRow(day(2), defaultGuests), meal_slot: 'dropoff', start_time: '08:00' },
        { ...createSessionRow(day(2), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
        { ...createSessionRow(day(3), defaultGuests), meal_slot: 'dropoff', start_time: '08:00' },
        { ...createSessionRow(day(3), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
        { ...createSessionRow(day(4), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
      ])
      return
    }

    setMultiDayStartDate(day(0))
    setMultiDayEndDate(day(3))
    setMultiDayOutline('Breakfast + dinner rotation with mid-day prep window.')
    setMultiDaySessions([
      { ...createSessionRow(day(0), defaultGuests), meal_slot: 'breakfast', start_time: '08:00' },
      { ...createSessionRow(day(0), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
      { ...createSessionRow(day(1), defaultGuests), meal_slot: 'breakfast', start_time: '08:00' },
      { ...createSessionRow(day(1), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
      { ...createSessionRow(day(2), defaultGuests), meal_slot: 'breakfast', start_time: '08:00' },
      { ...createSessionRow(day(2), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
      { ...createSessionRow(day(3), defaultGuests), meal_slot: 'breakfast', start_time: '08:00' },
      { ...createSessionRow(day(3), defaultGuests), meal_slot: 'dinner', start_time: '18:00' },
    ])
  }

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

    if (serviceMode === 'multi_day') {
      if (!multiDayStartDate || !multiDayEndDate) {
        setError('Please provide both start and end dates for the multi-day service.')
        return
      }
      if (multiDayEndDate < multiDayStartDate) {
        setError('Multi-day end date must be on or after the start date.')
        return
      }
      if (multiDaySessions.length === 0) {
        setError('Please add at least one service session for your itinerary.')
        return
      }
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
          allergies_food_restrictions: serializeDietary(),
          additional_notes: notes.trim() || undefined,
          service_mode: serviceMode,
          recurring_frequency: serviceMode === 'recurring' ? recurringFrequency : undefined,
          recurring_duration_weeks:
            serviceMode === 'recurring' && recurringDurationWeeks
              ? parseInt(recurringDurationWeeks)
              : undefined,
          menu_recommendation_lead_days:
            serviceMode === 'recurring' && menuRecommendationLeadDays
              ? parseInt(menuRecommendationLeadDays)
              : undefined,
          schedule_request_jsonb: multiDaySchedulePayload,
          website_url: websiteUrl,
          attempt_id: instantAttemptId,
        })
        if (!result.checkoutUrl) {
          setError('Could not create checkout session. Please try again.')
          return
        }
        if (result.dietarySaveFailed) {
          // Dietary info was submitted but failed to save; chef will see it in notes
          console.warn('[booking] Dietary records failed to save, included in notes fallback')
        }
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
          allergies_food_restrictions: serializeDietary(),
          additional_notes: notes.trim() || undefined,
          service_mode: serviceMode,
          recurring_frequency: serviceMode === 'recurring' ? recurringFrequency : undefined,
          recurring_duration_weeks:
            serviceMode === 'recurring' && recurringDurationWeeks
              ? parseInt(recurringDurationWeeks)
              : undefined,
          menu_recommendation_lead_days:
            serviceMode === 'recurring' && menuRecommendationLeadDays
              ? parseInt(menuRecommendationLeadDays)
              : undefined,
          schedule_request_jsonb: multiDaySchedulePayload,
          website_url: websiteUrl,
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
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </div>

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

      <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-3">
        <p className="text-sm font-medium text-stone-200">Service Type</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-start gap-2 rounded-md border border-stone-700 bg-stone-800 p-3">
            <input
              type="radio"
              name="service-mode"
              checked={serviceMode === 'one_off'}
              onChange={() => setServiceMode('one_off')}
              className="mt-1"
            />
            <span>
              <span className="block text-sm text-stone-100">One-off Event</span>
              <span className="block text-xs text-stone-500">Single date service request.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-md border border-stone-700 bg-stone-800 p-3">
            <input
              type="radio"
              name="service-mode"
              checked={serviceMode === 'recurring'}
              onChange={() => setServiceMode('recurring')}
              className="mt-1"
            />
            <span>
              <span className="block text-sm text-stone-100">Recurring Plan</span>
              <span className="block text-xs text-stone-500">
                Multi-week or standing service arrangement.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-md border border-stone-700 bg-stone-800 p-3">
            <input
              type="radio"
              name="service-mode"
              checked={serviceMode === 'multi_day'}
              onChange={() => setServiceMode('multi_day')}
              className="mt-1"
            />
            <span>
              <span className="block text-sm text-stone-100">Multi-day Service</span>
              <span className="block text-xs text-stone-500">
                Consecutive or mixed meal coverage across multiple days.
              </span>
            </span>
          </label>
        </div>

        {serviceMode === 'recurring' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Frequency</label>
              <select
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                value={recurringFrequency}
                onChange={(e) =>
                  setRecurringFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')
                }
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <Input
              label="Duration (weeks)"
              type="number"
              min="1"
              max="52"
              value={recurringDurationWeeks}
              onChange={(e) => setRecurringDurationWeeks(e.target.value)}
            />
            <Input
              label="Menu lead days"
              type="number"
              min="1"
              max="21"
              value={menuRecommendationLeadDays}
              onChange={(e) => setMenuRecommendationLeadDays(e.target.value)}
            />
          </div>
        )}

        {serviceMode === 'multi_day' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Start date"
                type="date"
                value={multiDayStartDate}
                onChange={(e) => setMultiDayStartDate(e.target.value)}
              />
              <Input
                label="End date"
                type="date"
                min={multiDayStartDate || undefined}
                value={multiDayEndDate}
                onChange={(e) => setMultiDayEndDate(e.target.value)}
              />
              <div className="sm:col-span-1 flex flex-col">
                <label className="block text-xs font-medium text-stone-400 mb-1">Templates</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-200 hover:bg-stone-700 text-left"
                    onClick={() => applyMultiDayTemplate('retreat')}
                  >
                    Retreat Weekend
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-200 hover:bg-stone-700 text-left"
                    onClick={() => applyMultiDayTemplate('vacation')}
                  >
                    Family Vacation Week
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-200 hover:bg-stone-700 text-left"
                    onClick={() => applyMultiDayTemplate('rotation')}
                  >
                    Breakfast + Dinner Rotation
                  </button>
                </div>
              </div>
            </div>

            <div className="sm:col-span-3">
              <Textarea
                label="Schedule outline"
                placeholder="Example: Day 1 lunch + dinner, Day 2 lunch/lunch/dinner, leave breakfast for Day 3."
                value={multiDayOutline}
                onChange={(e) => setMultiDayOutline(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-lg border border-stone-700 bg-stone-950 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-200">Itinerary Builder</p>
                <button
                  type="button"
                  onClick={() => addSessionRow()}
                  className="rounded-md border border-stone-700 bg-stone-800 px-2.5 py-1 text-xs text-stone-200 hover:bg-stone-700"
                >
                  + Add Session
                </button>
              </div>

              <div className="space-y-3">
                {multiDaySessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="rounded-md border border-stone-700 bg-stone-900 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-stone-400">Session {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeSessionRow(session.id)}
                        disabled={multiDaySessions.length <= 1}
                        className="text-xs text-red-300 disabled:text-stone-600 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        label="Service date"
                        type="date"
                        min={multiDayStartDate || undefined}
                        max={multiDayEndDate || undefined}
                        value={session.service_date}
                        onChange={(e) =>
                          updateSessionRow(session.id, { service_date: e.target.value })
                        }
                      />
                      <div>
                        <label className="block text-xs font-medium text-stone-400 mb-1">
                          Meal slot
                        </label>
                        <select
                          className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                          value={session.meal_slot}
                          onChange={(e) =>
                            updateSessionRow(session.id, {
                              meal_slot: e.target.value as MultiDayMealSlot,
                            })
                          }
                        >
                          {SESSION_MEAL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-400 mb-1">
                          Service type
                        </label>
                        <select
                          className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                          value={session.execution_type}
                          onChange={(e) =>
                            updateSessionRow(session.id, {
                              execution_type: e.target.value as MultiDayExecutionType,
                            })
                          }
                        >
                          {SESSION_EXECUTION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Start time (optional)"
                        type="time"
                        value={session.start_time}
                        onChange={(e) =>
                          updateSessionRow(session.id, { start_time: e.target.value })
                        }
                      />
                      <Input
                        label="End time (optional)"
                        type="time"
                        value={session.end_time}
                        onChange={(e) => updateSessionRow(session.id, { end_time: e.target.value })}
                      />
                      <Input
                        label="Guest count (optional)"
                        type="number"
                        min="1"
                        value={session.guest_count}
                        onChange={(e) =>
                          updateSessionRow(session.id, { guest_count: e.target.value })
                        }
                      />
                      <div className="sm:col-span-3">
                        <Textarea
                          label="Session notes (optional)"
                          rows={2}
                          value={session.notes}
                          onChange={(e) => updateSessionRow(session.id, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {rangeAvailabilityLoading && (
              <p className="text-xs text-stone-400">
                Checking availability across your selected range...
              </p>
            )}
            {rangeAvailabilitySummary && (
              <div
                className={`rounded-md border p-3 text-xs space-y-1 ${
                  rangeAvailabilitySummary.calendarTruthMode === 'verified_external'
                    ? 'border-emerald-800 bg-emerald-950/30 text-emerald-100'
                    : rangeAvailabilitySummary.calendarTruthMode === 'degraded'
                      ? 'border-amber-700 bg-amber-950/30 text-amber-100'
                      : 'border-stone-700 bg-stone-950 text-stone-300'
                }`}
              >
                <p>{rangeAvailabilitySummary.calendarTruthMessage}</p>
                <p>
                  Range check: {rangeAvailabilitySummary.blockedDates.length} blocked day(s),{' '}
                  {rangeAvailabilitySummary.unavailableDates.length} unavailable day(s).
                </p>
                {Object.entries(rangeAvailabilitySummary.details)
                  .slice(0, 4)
                  .map(([date, reasons]) => (
                    <p
                      key={date}
                      className={
                        rangeAvailabilitySummary.calendarTruthMode === 'verified_external'
                          ? 'text-emerald-200/80'
                          : rangeAvailabilitySummary.calendarTruthMode === 'degraded'
                            ? 'text-amber-200/80'
                            : 'text-stone-400'
                      }
                    >
                      {date}: {(reasons || []).join(', ')}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Guest Count"
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
        placeholder={NEUTRAL_ADDRESS_PLACEHOLDER}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-stone-300">
          Allergies / Dietary Restrictions
        </label>
        <DietaryIntakeFields value={dietaryIntake} onChange={setDietaryIntake} compact />
      </div>

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
