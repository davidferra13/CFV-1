'use client'

import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { IntakeLaneExpectations } from '@/components/public/intake-lane-expectations'
import { submitPublicInquiry, checkPublicDateAvailability } from '@/lib/inquiries/public-actions'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import {
  DietaryIntakeFields,
  emptyDietaryIntake,
  type DietaryIntakeValue,
} from '@/components/forms/dietary-intake-fields'
import {
  CHEF_LOCATION_RELATIONSHIP_LABELS,
  LOCATION_BEST_FOR_LABELS,
  LOCATION_SERVICE_TYPE_LABELS,
  type PublicChefLocationExperience,
} from '@/lib/partners/location-experiences'
import { PUBLIC_INTAKE_LANE_KEYS } from '@/lib/public/intake-lane-config'
import { ExternalLink, MapPin } from '@/components/ui/icons'
import type {
  ClientDefaultKnowledgeAppliedField,
  ClientDefaultKnowledgeRestatementContract,
} from '@/lib/clients/client-default-knowledge'

interface Props {
  chefSlug: string
  chefName: string
  primaryColor: string
  expectedResponseTime?: string | null
  referralPartnerId?: string | null
  partnerLocationId?: string | null
  selectedLocation?: PublicChefLocationExperience | null
  circleId?: string | null
  defaultEventDate?: string | null
  defaultValues?: {
    full_name?: string
    email?: string
    phone?: string
    address?: string
    dietary_notes?: string
    guest_count?: string
    budget?: string
    known_defaults?: string[]
  }
  defaultKnowledgeContract?: ClientDefaultKnowledgeRestatementContract
}

interface FormData {
  full_name: string
  address: string
  address_tbd: boolean
  month: string
  day: string
  year: string
  serve_time: string
  email: string
  phone: string
  client_birthday: string
  guest_count: string
  occasion: string
  budget: string
  favorite_ingredients_dislikes: string
  additional_notes: string
  referral_source: string
  website_url: string
}

interface FormErrors {
  full_name?: string
  address?: string
  month?: string
  day?: string
  year?: string
  serve_time?: string
  email?: string
  phone?: string
  client_birthday?: string
  guest_count?: string
  occasion?: string
  budget?: string
}

interface SuccessState {
  circleGroupToken: string | null
}

type KnownDefaultFormField = Extract<
  ClientDefaultKnowledgeAppliedField['formField'],
  'full_name' | 'email' | 'phone' | 'address' | 'dietary_notes' | 'guest_count' | 'budget'
>

type KnownDefaultHint = {
  label: string
  value: string
  status: Exclude<ClientDefaultKnowledgeRestatementContract['rows'][number]['status'], 'empty'>
  failureMessage: string | null
}

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const GUEST_COUNT_OPTIONS = [
  { value: '1', label: '1 Guest' },
  { value: '2', label: '2 Guests' },
  { value: '3', label: '3 Guests' },
  { value: '4', label: '4 Guests' },
  { value: '5', label: '5 Guests' },
  { value: '6', label: '6 Guests' },
  { value: '7', label: '7 Guests' },
  { value: '8', label: '8 Guests' },
  { value: '9', label: '9 Guests' },
  { value: '10', label: '10 Guests' },
  { value: '12', label: '12 Guests' },
  { value: '15', label: '15 Guests' },
  { value: '20', label: '20+ Guests' },
]

function serializeDietaryIntake(intake: DietaryIntakeValue): string {
  if (intake.accommodationFlag === 'no') return ''
  const parts: string[] = []
  if (intake.dietaryPatterns.length > 0) {
    parts.push(intake.dietaryPatterns.join(', '))
  }
  for (const sel of intake.allergySelections) {
    parts.push(`${sel.allergen} (${sel.severity})`)
  }
  if (intake.additionalNotes.trim()) {
    parts.push(intake.additionalNotes.trim())
  }
  return parts.join('; ')
}

function parseBudgetCents(text: string): number | null {
  const cleaned = text.replace(/[,$\s]/g, '')
  const num = Number(cleaned)
  if (Number.isFinite(num) && num > 0) return Math.round(num * 100)
  return null
}

// Draft persistence helpers
const DRAFT_KEY_PREFIX = 'cf-inquiry-draft-'
function saveDraft(slug: string, data: FormData) {
  try {
    sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${slug}`, JSON.stringify(data))
  } catch {
    /* storage full or unavailable */
  }
}
function loadDraft(slug: string): FormData | null {
  try {
    const raw = sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${slug}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function clearDraft(slug: string) {
  try {
    sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${slug}`)
  } catch {
    /* ignore */
  }
}

function hasPrefillValues(defaultValues: Props['defaultValues']): boolean {
  return Boolean(
    defaultValues &&
    [
      defaultValues.full_name,
      defaultValues.email,
      defaultValues.phone,
      defaultValues.address,
      defaultValues.dietary_notes,
      defaultValues.guest_count,
      defaultValues.budget,
    ].some((value) => typeof value === 'string' && value.trim().length > 0)
  )
}

function createInitialDietaryIntake(defaultValues: Props['defaultValues']): DietaryIntakeValue {
  const dietaryNotes = defaultValues?.dietary_notes?.trim()
  if (!dietaryNotes) return emptyDietaryIntake()

  return {
    ...emptyDietaryIntake(),
    accommodationFlag: 'yes',
    additionalNotes: dietaryNotes,
  }
}

function getEventDateParts(date?: string | null): Pick<FormData, 'month' | 'day' | 'year'> | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const [year, month, day] = date.split('-')
  return {
    month: String(Number(month)),
    day: String(Number(day)),
    year,
  }
}

function buildKnownDefaultHints(
  contract?: ClientDefaultKnowledgeRestatementContract
): Map<KnownDefaultFormField, KnownDefaultHint> {
  const hints = new Map<KnownDefaultFormField, KnownDefaultHint>()
  for (const row of contract?.rows ?? []) {
    const status = row.status
    if (!row.formField || !row.value || status === 'empty') continue
    if (!isKnownDefaultFormField(row.formField)) continue
    if (hints.has(row.formField)) continue
    hints.set(row.formField, {
      label: row.label,
      value: row.value,
      status,
      failureMessage: row.failureMessage,
    })
  }
  return hints
}

function isKnownDefaultFormField(
  formField: ClientDefaultKnowledgeAppliedField['formField']
): formField is KnownDefaultFormField {
  return [
    'full_name',
    'email',
    'phone',
    'address',
    'dietary_notes',
    'guest_count',
    'budget',
  ].includes(formField)
}

function KnownDefaultHintLine({ hint }: { hint?: KnownDefaultHint }) {
  if (!hint) return null

  return (
    <div className="-mt-4 rounded-lg border border-brand-900 bg-stone-950 px-3 py-2 text-xs text-stone-400">
      <p className="font-medium text-stone-200">
        {hint.status === 'confirm_instead' ? 'Confirm saved default' : 'Prefilled from defaults'}:{' '}
        {hint.label}
      </p>
      <p className="mt-1 text-stone-500">{hint.value}</p>
    </div>
  )
}

export function PublicInquiryForm({
  chefSlug,
  chefName,
  primaryColor,
  expectedResponseTime,
  referralPartnerId,
  partnerLocationId,
  selectedLocation,
  circleId,
  defaultEventDate,
  defaultValues,
  defaultKnowledgeContract,
}: Props) {
  const hasDefaultValues = hasPrefillValues(defaultValues)
  const initialEventDate = useMemo(() => getEventDateParts(defaultEventDate), [defaultEventDate])
  const knownDefaultHints = useMemo(
    () => buildKnownDefaultHints(defaultKnowledgeContract),
    [defaultKnowledgeContract]
  )
  const [formData, setFormData] = useState<FormData>({
    full_name: defaultValues?.full_name ?? '',
    address: defaultValues?.address ?? '',
    address_tbd: false,
    month: initialEventDate?.month ?? '',
    day: initialEventDate?.day ?? '',
    year: initialEventDate?.year ?? '',
    serve_time: '',
    email: defaultValues?.email ?? '',
    phone: defaultValues?.phone ?? '',
    client_birthday: '',
    guest_count: defaultValues?.guest_count ?? '',
    occasion: '',
    budget: defaultValues?.budget ?? '',
    favorite_ingredients_dislikes: '',
    additional_notes: '',
    referral_source: '',
    website_url: '',
  })

  const [dietaryIntake, setDietaryIntake] = useState<DietaryIntakeValue>(() =>
    createInitialDietaryIntake(defaultValues)
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successState, setSuccessState] = useState<SuccessState | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [returningClient, setReturningClient] = useState(false)
  const [lookupDone, setLookupDone] = useState(false)
  const [dateBusy, setDateBusy] = useState<boolean | null>(false)

  // Check date availability when date fields change
  useEffect(() => {
    const m = Number(formData.month)
    const d = Number(formData.day)
    const y = Number(formData.year)
    if (!m || !d || !y || y < 2020) {
      setDateBusy(false)
      return
    }
    const dateStr = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    let cancelled = false
    checkPublicDateAvailability(chefSlug, dateStr)
      .then((result) => {
        if (!cancelled) setDateBusy(result.busy)
      })
      .catch(() => {
        if (!cancelled) setDateBusy(null)
      })
    return () => {
      cancelled = true
    }
  }, [formData.month, formData.day, formData.year, chefSlug])

  // Restore draft from sessionStorage on mount
  useEffect(() => {
    if (hasDefaultValues || initialEventDate) return

    const draft = loadDraft(chefSlug)
    if (draft) setFormData(draft)
  }, [chefSlug, hasDefaultValues, initialEventDate])

  // Save draft on every form change
  const updateFormData = useCallback(
    (updater: (prev: FormData) => FormData) => {
      setFormData((prev) => {
        const next = updater(prev)
        saveDraft(chefSlug, next)
        return next
      })
    },
    [chefSlug]
  )

  // Returning-client lookup on email blur.
  // For privacy, this no longer pre-fills stored client details.
  const handleEmailBlur = async () => {
    const email = formData.email.trim()
    if (!email || lookupDone) return
    try {
      const res = await fetch('/api/public/client-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, chefSlug }),
      })
      const data = await res.json()
      if (data.found) {
        setReturningClient(true)
      }
      setLookupDone(true)
    } catch {
      // Non-critical, ignore
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full Name is required'
    }

    if (!formData.address_tbd && !formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    if (!formData.month) {
      newErrors.month = 'Month is required'
    }

    if (!formData.day.trim()) {
      newErrors.day = 'Day is required'
    }

    if (!formData.year.trim()) {
      newErrors.year = 'Year is required'
    }

    const monthNum = Number(formData.month)
    const dayNum = Number(formData.day)
    const yearNum = Number(formData.year)

    if (formData.day && (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31)) {
      newErrors.day = 'Day must be between 1 and 31'
    }

    if (formData.year && (!Number.isInteger(yearNum) || yearNum < 2025 || yearNum > 2100)) {
      newErrors.year = 'Enter a valid year'
    }

    if (!newErrors.month && !newErrors.day && !newErrors.year) {
      const candidate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum))
      const isValidDate =
        candidate.getUTCFullYear() === yearNum &&
        candidate.getUTCMonth() === monthNum - 1 &&
        candidate.getUTCDate() === dayNum

      if (!isValidDate) {
        newErrors.day = 'Date is invalid'
      }
    }

    if (!formData.serve_time.trim()) {
      newErrors.serve_time = 'Time is required'
    } else if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(formData.serve_time.trim()) &&
      !/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(formData.serve_time.trim())
    ) {
      newErrors.serve_time = 'Use a valid serving time'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.phone && !/^[0-9()+\-.\s]{7,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number'
    }

    if (!formData.guest_count) {
      newErrors.guest_count = 'Guest Count is required'
    }

    if (!formData.occasion.trim()) {
      newErrors.occasion = 'Occasion is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const month = Number(formData.month)
      const day = Number(formData.day)
      const year = Number(formData.year)
      const eventDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const guestCount = parseInt(formData.guest_count, 10)
      const budgetText = formData.budget.trim() || 'not_sure'
      const budgetCents = parseBudgetCents(budgetText)
      const budgetMode =
        budgetCents != null ? 'exact' : budgetText === 'not_sure' ? 'not_sure' : 'range'
      const addressValue = formData.address_tbd ? 'Address TBD' : formData.address.trim()

      const result = await submitPublicInquiry({
        chef_slug: chefSlug,
        full_name: formData.full_name.trim(),
        address: addressValue,
        address_tbd: formData.address_tbd,
        event_date: eventDate,
        serve_time: formData.serve_time.trim().toUpperCase(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        client_birthday: formData.client_birthday || undefined,
        guest_count: guestCount,
        occasion: formData.occasion.trim(),
        budget_cents: budgetCents,
        budget_range: budgetText,
        allergy_flag:
          dietaryIntake.accommodationFlag === 'yes'
            ? 'yes'
            : dietaryIntake.accommodationFlag === 'unsure'
              ? 'unknown'
              : 'none',
        favorite_ingredients_dislikes: formData.favorite_ingredients_dislikes.trim(),
        allergies_food_restrictions: serializeDietaryIntake(dietaryIntake),
        additional_notes: formData.additional_notes.trim(),
        referral_source: formData.referral_source.trim() || undefined,
        website_url: formData.website_url,
        referral_partner_id: referralPartnerId || undefined,
        partner_location_id: partnerLocationId || undefined,
        existing_circle_id: circleId || undefined,
      })

      trackEvent(ANALYTICS_EVENTS.INQUIRY_SUBMITTED, {
        source: 'public_profile',
        budget_mode: budgetMode,
        budget_range: budgetText || null,
        budget_exact_entered: budgetCents != null,
        guest_count: guestCount,
      })

      clearDraft(chefSlug)
      setSuccessState({ circleGroupToken: result.circleGroupToken ?? null })
      setDietaryIntake(emptyDietaryIntake())
      setFormData({
        full_name: '',
        address: '',
        address_tbd: false,
        month: '',
        day: '',
        year: '',
        serve_time: '',
        email: '',
        phone: '',
        client_birthday: '',
        guest_count: '',
        occasion: '',
        budget: '',
        favorite_ingredients_dislikes: '',
        additional_notes: '',
        referral_source: '',
        website_url: '',
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    updateFormData((prev) => ({ ...prev, [name]: value }))

    if (name === 'email') {
      setLookupDone(false)
      setReturningClient(false)
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  if (successState) {
    const successSteps = [
      {
        key: 'done',
        display: '✓',
        label: 'Request received',
        sub: 'Your details are with the chef.',
      },
      {
        key: '2',
        display: '2',
        label: 'Chef reviews fit and replies',
        sub: expectedResponseTime
          ? `Published response window: ${expectedResponseTime}.`
          : 'Response timing varies by chef and event load.',
      },
      {
        key: '3',
        display: '3',
        label: 'Menu, scope, and pricing clarified',
        sub: 'Use the reply to confirm fit, ask questions, and refine the plan.',
      },
      {
        key: '4',
        display: '4',
        label: 'Review written terms',
        sub: 'Check deposit, cancellation, travel, and what-is-included terms before paying.',
      },
      {
        key: '5',
        display: '5',
        label: 'Confirm the event if you want to move forward',
        sub: 'An inquiry alone does not confirm the date.',
      },
    ]
    return (
      <Card className="bg-stone-900/90">
        <CardContent className="py-10 text-center">
          <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-600"
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
          <h2 className="text-2xl font-bold text-stone-100 mb-2">Inquiry sent</h2>
          <p className="text-stone-400 mb-6">
            {expectedResponseTime
              ? `${chefName} publishes a response window of ${expectedResponseTime}.`
              : `${chefName} will review your details and reply when they can.`}
          </p>
          {successState.circleGroupToken && (
            <TrackedLink
              href={`/hub/g/${successState.circleGroupToken}`}
              analyticsName="public_inquiry_open_planning_space"
              analyticsProps={{
                chef_slug: chefSlug,
              }}
              className="mb-6 inline-flex items-center justify-center gap-2 rounded-md bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-white"
            >
              Open planning space
              <ExternalLink className="h-4 w-4" />
            </TrackedLink>
          )}
          <div className="text-left bg-stone-800 border border-stone-700 rounded-xl px-4 py-4 mb-6">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">
              What happens next
            </p>
            <div className="space-y-3">
              {successSteps.map((s) => (
                <div key={s.key} className="flex items-start gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${s.key === 'done' ? 'bg-green-900 text-emerald-400' : 'bg-stone-700 text-stone-400'}`}
                  >
                    {s.display}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold leading-tight ${s.key === 'done' ? 'text-emerald-400' : 'text-stone-200'}`}
                    >
                      {s.label}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessState(null)}
            className="text-sm font-medium text-stone-400 hover:text-stone-200"
          >
            Submit another inquiry
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-stone-900/90">
      <CardContent className="p-6 md:p-8">
        {submitError && (
          <div className="mb-6 p-4 bg-red-950 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative space-y-6">
          <div className="absolute opacity-0 -z-10 pointer-events-none" aria-hidden="true">
            <input
              type="text"
              name="website_url"
              tabIndex={-1}
              autoComplete="off"
              value={formData.website_url}
              onChange={handleChange}
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-stone-100">Send inquiry</h1>
            <p className="text-base text-stone-500 mt-2">
              Share the basics so {chefName} can review fit, timing, and pricing.
            </p>
          </div>

          {selectedLocation && (
            <div className="rounded-2xl border border-amber-700/40 bg-amber-500/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                Asking About A Specific Setting
              </p>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-100">{selectedLocation.name}</p>
                  <p className="mt-1 text-sm text-stone-300">{selectedLocation.partner.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-amber-700/60 px-3 py-1 text-xs font-medium text-amber-100">
                      {CHEF_LOCATION_RELATIONSHIP_LABELS[selectedLocation.relationship_type]}
                    </span>
                    {(selectedLocation.best_for || []).slice(0, 2).map((value) => (
                      <span
                        key={value}
                        className="rounded-full border border-stone-700 px-3 py-1 text-xs font-medium text-stone-200"
                      >
                        {LOCATION_BEST_FOR_LABELS[value]}
                      </span>
                    ))}
                    {(selectedLocation.service_types || []).slice(0, 2).map((value) => (
                      <span
                        key={value}
                        className="rounded-full border border-stone-700 px-3 py-1 text-xs font-medium text-stone-200"
                      >
                        {LOCATION_SERVICE_TYPE_LABELS[value]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-stone-300">
                  {selectedLocation.city || selectedLocation.state ? (
                    <p className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-stone-500" />
                      {[selectedLocation.city, selectedLocation.state].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {selectedLocation.booking_url ? (
                    <TrackedLink
                      href={`/chef/${chefSlug}/locations/${selectedLocation.id}/book`}
                      analyticsName="public_inquiry_selected_location_booking"
                      analyticsProps={{
                        chef_slug: chefSlug,
                        location_id: selectedLocation.id,
                        partner_id: selectedLocation.partner.id,
                      }}
                      prefetch={false}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-100 hover:bg-stone-900"
                    >
                      View Venue Booking
                      <ExternalLink className="h-3.5 w-3.5" />
                    </TrackedLink>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <IntakeLaneExpectations
              lane={PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry}
              layout="stack"
            />
            {defaultValues?.known_defaults && defaultValues.known_defaults.length > 0 && (
              <div className="rounded-xl border border-brand-800 bg-brand-950 px-4 py-3">
                <p className="text-sm font-medium text-stone-100">Using your saved defaults</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {defaultValues.known_defaults.slice(0, 6).map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-stone-900 px-2.5 py-1 text-xs text-stone-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="px-1 text-xs leading-relaxed text-stone-500">
              {expectedResponseTime
                ? `Published response window: ${expectedResponseTime}.`
                : 'Response timing is not published on this profile.'}
            </p>
          </div>

          <Input
            label="Full Name"
            name="full_name"
            type="text"
            value={formData.full_name}
            onChange={handleChange}
            error={errors.full_name}
            placeholder="Full Name"
          />
          <KnownDefaultHintLine hint={knownDefaultHints.get('full_name')} />

          <AddressAutocomplete
            label="Address"
            required={!formData.address_tbd}
            value={formData.address_tbd ? 'Address TBD' : formData.address}
            onChange={(val) => {
              updateFormData((prev) => ({ ...prev, address: val }))
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }))
            }}
            onPlaceSelect={(data) => {
              updateFormData((prev) => ({ ...prev, address: data.formattedAddress }))
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }))
            }}
            placeholder="Street, City, State, ZIP"
            error={errors.address}
          />
          <KnownDefaultHintLine hint={knownDefaultHints.get('address')} />
          <label className="-mt-4 flex items-start gap-2 rounded-xl border border-stone-800 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">
            <input
              type="checkbox"
              checked={formData.address_tbd}
              onChange={(e) => {
                updateFormData((prev) => ({ ...prev, address_tbd: e.target.checked }))
                if (e.target.checked && errors.address) {
                  setErrors((prev) => ({ ...prev, address: undefined }))
                }
              }}
              className="mt-0.5 rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-600"
            />
            <span>
              I do not know the exact address yet. City, venue, or neighborhood can come later.
            </span>
          </label>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-stone-200">Date and Serving Time</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select
                label="Month"
                name="month"
                value={formData.month}
                onChange={handleChange}
                error={errors.month}
                options={MONTH_OPTIONS}
              />
              <Input
                label="Day"
                name="day"
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={formData.day}
                onChange={handleChange}
                error={errors.day}
                placeholder="Day"
              />
              <Input
                label="Year"
                name="year"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={formData.year}
                onChange={handleChange}
                error={errors.year}
                placeholder="Year"
              />
              <Input
                label="Time"
                name="serve_time"
                type="time"
                value={formData.serve_time}
                onChange={handleChange}
                error={errors.serve_time}
                placeholder="Preferred time"
              />
            </div>
            <p className="text-sm text-amber-700">
              Share the serving time you want guests eating. Arrival and setup timing will be
              confirmed by the chef if the event is a fit.
            </p>
            {dateBusy && (
              <p className="text-sm text-amber-600 mt-1">
                {chefName} may already have an event on this date. You can still submit your
                inquiry; the chef will confirm availability.
              </p>
            )}
            {dateBusy === null && (
              <p className="text-sm text-stone-500 mt-1">
                Availability could not be checked right now. You can still submit your inquiry; the
                chef will confirm the date.
              </p>
            )}
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleEmailBlur}
            error={errors.email}
            required
            placeholder="Email"
          />
          <KnownDefaultHintLine hint={knownDefaultHints.get('email')} />
          {returningClient && (
            <p className="text-xs text-emerald-500 -mt-3">
              Welcome back. We recognized your email, but for privacy you will need to re-enter your
              details.
            </p>
          )}

          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="Phone"
          />
          <KnownDefaultHintLine hint={knownDefaultHints.get('phone')} />

          <Input
            label="Birthday"
            name="client_birthday"
            type="date"
            value={formData.client_birthday}
            onChange={handleChange}
            error={errors.client_birthday}
            helperText="Optional. Helps the chef remember birthdays for future celebrations."
          />

          <Select
            label="Guest Count"
            name="guest_count"
            value={formData.guest_count}
            onChange={handleChange}
            error={errors.guest_count}
            options={GUEST_COUNT_OPTIONS}
          />
          <KnownDefaultHintLine hint={knownDefaultHints.get('guest_count')} />

          <Input
            label="Occasion"
            name="occasion"
            type="text"
            value={formData.occasion}
            onChange={handleChange}
            error={errors.occasion}
            placeholder="e.g. Birthday, Anniversary, Date Night"
          />

          <Input
            label="Estimated Budget"
            name="budget"
            type="text"
            value={formData.budget}
            onChange={handleChange}
            error={errors.budget}
            placeholder="e.g. $1,500, flexible, or not sure"
            helperText="Optional. Blank submissions are marked as not sure."
          />
          <KnownDefaultHintLine hint={knownDefaultHints.get('budget')} />

          <Textarea
            label="Any favorite ingredients or strong dislikes?"
            name="favorite_ingredients_dislikes"
            value={formData.favorite_ingredients_dislikes}
            onChange={handleChange}
            rows={4}
          />

          <div>
            <h3 className="text-base font-medium text-stone-200 mb-2">
              Allergies or dietary restrictions
            </h3>
            <KnownDefaultHintLine hint={knownDefaultHints.get('dietary_notes')} />
            <DietaryIntakeFields value={dietaryIntake} onChange={setDietaryIntake} compact />
          </div>

          <Select
            label="How did you hear about this chef?"
            name="referral_source"
            value={formData.referral_source}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select one (optional)' },
              { value: 'friend_or_family', label: 'Friend or family referral' },
              { value: 'google_search', label: 'Google search' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'facebook', label: 'Facebook' },
              { value: 'chefflow_directory', label: 'ChefFlow directory' },
              { value: 'event_platform', label: 'Event planning platform' },
              { value: 'repeat_client', label: "I've worked with this chef before" },
              { value: 'other', label: 'Other' },
            ]}
          />

          <Input
            label="Additional Notes"
            name="additional_notes"
            type="text"
            value={formData.additional_notes}
            onChange={handleChange}
            placeholder="Additional Notes"
            helperText="* Optional: anything else to know?"
          />

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? 'Sending...' : 'Send inquiry'}
          </Button>

          <p className="text-xs text-stone-400 text-center">
            By submitting, you agree to be contacted about your inquiry.{' '}
            <a href="/trust" className="underline hover:text-stone-300 transition-colors">
              How ChefFlow protects your data.
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
