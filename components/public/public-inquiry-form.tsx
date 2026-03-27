'use client'

import { useState, FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { submitPublicInquiry } from '@/lib/inquiries/public-actions'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

interface Props {
  chefSlug: string
  chefName: string
  primaryColor: string
}

interface FormData {
  full_name: string
  address: string
  month: string
  day: string
  year: string
  serve_time: string
  email: string
  phone: string
  guest_count: string
  occasion: string
  budget: string
  allergy_flag: string
  favorite_ingredients_dislikes: string
  allergies_food_restrictions: string
  additional_notes: string
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
  guest_count?: string
  occasion?: string
  budget?: string
  allergy_flag?: string
  allergies_food_restrictions?: string
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

const ALLERGY_FLAG_OPTIONS = [
  { value: 'none', label: 'No known allergies or restrictions' },
  { value: 'yes', label: "Yes - I'll describe below" },
  { value: 'unknown', label: 'Not sure yet' },
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

function parseBudgetCents(text: string): number | null {
  const cleaned = text.replace(/[,$\s]/g, '')
  const num = Number(cleaned)
  if (Number.isFinite(num) && num > 0) return Math.round(num * 100)
  return null
}

export function PublicInquiryForm({ chefSlug, chefName, primaryColor }: Props) {
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    address: '',
    month: '',
    day: '',
    year: '',
    serve_time: '',
    email: '',
    phone: '',
    guest_count: '',
    occasion: '',
    budget: '',
    allergy_flag: '',
    favorite_ingredients_dislikes: '',
    allergies_food_restrictions: '',
    additional_notes: '',
    website_url: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [returningClient, setReturningClient] = useState(false)
  const [lookupDone, setLookupDone] = useState(false)

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

    if (!formData.address.trim()) {
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
    } else if (!/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(formData.serve_time.trim())) {
      newErrors.serve_time = 'Use format HH:MM AM or HH:MM PM'
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

    if (!formData.budget.trim()) {
      newErrors.budget = 'Budget is required'
    }

    if (!formData.allergy_flag) {
      newErrors.allergy_flag = 'Please indicate allergy status'
    }

    if (formData.allergy_flag === 'yes' && !formData.allergies_food_restrictions.trim()) {
      newErrors.allergies_food_restrictions = 'Please describe your allergies or restrictions'
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
      const budgetText = formData.budget.trim()
      const budgetCents = parseBudgetCents(budgetText)
      const budgetMode = budgetCents != null ? 'exact' : budgetText ? 'range' : 'unset'

      await submitPublicInquiry({
        chef_slug: chefSlug,
        full_name: formData.full_name.trim(),
        address: formData.address.trim(),
        event_date: eventDate,
        serve_time: formData.serve_time.trim().toUpperCase(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        guest_count: guestCount,
        occasion: formData.occasion.trim(),
        budget_cents: budgetCents,
        budget_range: budgetText || undefined,
        allergy_flag:
          (formData.allergy_flag as 'none' | 'yes' | 'unknown' | undefined) || undefined,
        favorite_ingredients_dislikes: formData.favorite_ingredients_dislikes.trim(),
        allergies_food_restrictions: formData.allergies_food_restrictions.trim(),
        additional_notes: formData.additional_notes.trim(),
        website_url: formData.website_url,
      })

      trackEvent(ANALYTICS_EVENTS.INQUIRY_SUBMITTED, {
        source: 'public_profile',
        budget_mode: budgetMode,
        budget_range: budgetText || null,
        budget_exact_entered: budgetCents != null,
        guest_count: guestCount,
      })

      setShowSuccess(true)
      setFormData({
        full_name: '',
        address: '',
        month: '',
        day: '',
        year: '',
        serve_time: '',
        email: '',
        phone: '',
        guest_count: '',
        occasion: '',
        budget: '',
        allergy_flag: '',
        favorite_ingredients_dislikes: '',
        allergies_food_restrictions: '',
        additional_notes: '',
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
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === 'email') {
      setLookupDone(false)
      setReturningClient(false)
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  if (showSuccess) {
    return (
      <Card className="bg-stone-900/90">
        <CardContent className="py-12 text-center">
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
            {chefName} will review your details and reply within 24 hours.
          </p>
          <button
            type="button"
            onClick={() => setShowSuccess(false)}
            className="font-medium hover:opacity-80"
            style={{ color: primaryColor }}
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
              Share the basics and we&apos;ll follow up.
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

          <AddressAutocomplete
            label="Address"
            required
            value={formData.address}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, address: val }))
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }))
            }}
            onPlaceSelect={(data) => {
              setFormData((prev) => ({ ...prev, address: data.formattedAddress }))
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }))
            }}
            placeholder="Street, City, State, ZIP"
            error={errors.address}
          />

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
                type="text"
                value={formData.serve_time}
                onChange={handleChange}
                error={errors.serve_time}
                placeholder="HH:MM AM"
              />
            </div>
            <p className="text-sm text-amber-700">Chef typically arrives 2 hours before service.</p>
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

          <Select
            label="Guest Count"
            name="guest_count"
            value={formData.guest_count}
            onChange={handleChange}
            error={errors.guest_count}
            options={GUEST_COUNT_OPTIONS}
          />

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
            label="Estimated Budget *"
            name="budget"
            type="text"
            value={formData.budget}
            onChange={handleChange}
            error={errors.budget}
            placeholder="e.g. $1,500 or 'flexible'"
          />

          <Textarea
            label="Any favorite ingredients or strong dislikes?"
            name="favorite_ingredients_dislikes"
            value={formData.favorite_ingredients_dislikes}
            onChange={handleChange}
            rows={4}
          />

          <Select
            label="Allergies or dietary restrictions? *"
            name="allergy_flag"
            value={formData.allergy_flag}
            onChange={handleChange}
            error={errors.allergy_flag}
            options={ALLERGY_FLAG_OPTIONS}
          />

          {formData.allergy_flag === 'yes' && (
            <Textarea
              label="Please describe your allergies or restrictions"
              name="allergies_food_restrictions"
              value={formData.allergies_food_restrictions}
              onChange={handleChange}
              error={errors.allergies_food_restrictions}
              rows={4}
            />
          )}

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
            By submitting, you agree to be contacted about your inquiry.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
