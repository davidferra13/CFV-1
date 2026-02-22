'use client'

import { useState, FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { submitPublicInquiry } from '@/lib/inquiries/public-actions'

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
  budget_range: string
  allergy_flag: string
  favorite_ingredients_dislikes: string
  allergies_food_restrictions: string
  additional_notes: string
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
  budget_range?: string
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

const BUDGET_RANGE_OPTIONS = [
  { value: 'under_500', label: 'Under $500' },
  { value: '500_1500', label: '$500 – $1,500' },
  { value: '1500_3000', label: '$1,500 – $3,000' },
  { value: '3000_5000', label: '$3,000 – $5,000' },
  { value: 'over_5000', label: '$5,000+' },
]

const ALLERGY_FLAG_OPTIONS = [
  { value: 'none', label: 'No known allergies or restrictions' },
  { value: 'yes', label: "Yes — I'll describe below" },
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
    budget_range: '',
    allergy_flag: '',
    favorite_ingredients_dislikes: '',
    allergies_food_restrictions: '',
    additional_notes: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

    if (!formData.budget_range) {
      newErrors.budget_range = 'Budget range is required'
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
        budget_range:
          (formData.budget_range as
            | 'under_500'
            | '500_1500'
            | '1500_3000'
            | '3000_5000'
            | 'over_5000'
            | undefined) || undefined,
        allergy_flag:
          (formData.allergy_flag as 'none' | 'yes' | 'unknown' | undefined) || undefined,
        favorite_ingredients_dislikes: formData.favorite_ingredients_dislikes.trim(),
        allergies_food_restrictions: formData.allergies_food_restrictions.trim(),
        additional_notes: formData.additional_notes.trim(),
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
        budget_range: '',
        allergy_flag: '',
        favorite_ingredients_dislikes: '',
        allergies_food_restrictions: '',
        additional_notes: '',
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

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  if (showSuccess) {
    return (
      <Card className="bg-white/90">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Inquiry Submitted!</h2>
          <p className="text-stone-600 mb-6">
            Thank you for your interest. {chefName} will review your inquiry and get back to you
            within 24 hours.
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
    <Card className="bg-white/90">
      <CardContent className="p-6 md:p-8">
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <h2 className="text-4xl font-semibold text-stone-900 underline underline-offset-4">
              Book Now
            </h2>
            <p className="text-3xl font-semibold text-stone-800 underline underline-offset-4 mt-6">
              Please fill out the following
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

          <Input
            label="Address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            error={errors.address}
            placeholder="Street, City, State, ZIP"
          />

          <div className="space-y-2">
            <h3 className="text-base font-medium text-stone-800">Date and Serving Time</h3>
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
            <p className="text-sm text-amber-700">Chef will arrive 2hr prior.</p>
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            placeholder="Email"
          />

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

          <Select
            label="Approximate Budget *"
            name="budget_range"
            value={formData.budget_range}
            onChange={handleChange}
            error={errors.budget_range}
            options={BUDGET_RANGE_OPTIONS}
          />

          <Textarea
            label="Any favorite ingredients or strong dislikes?"
            name="favorite_ingredients_dislikes"
            value={formData.favorite_ingredients_dislikes}
            onChange={handleChange}
            rows={4}
          />

          <Select
            label="Allergies or Dietary Restrictions? *"
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
            helperText="* Anything else you'd like to share?"
          />

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </Button>

          <p className="text-xs text-stone-400 text-center">
            By submitting, you agree to be contacted about your inquiry.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
