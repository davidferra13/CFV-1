'use client'

import { useState, FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { submitPublicInquiry } from '@/lib/inquiries/public-actions'

interface Props {
  chefSlug: string
  chefName: string
}

interface FormData {
  full_name: string
  email: string
  phone: string
  event_date: string
  city: string
  guest_count: string
  occasion: string
  budget: string
  message: string
}

interface FormErrors {
  full_name?: string
  email?: string
  event_date?: string
  city?: string
  guest_count?: string
  budget?: string
}

export function PublicInquiryForm({ chefSlug, chefName }: Props) {
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    phone: '',
    event_date: '',
    city: '',
    guest_count: '',
    occasion: '',
    budget: '',
    message: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (formData.guest_count && (!Number.isInteger(Number(formData.guest_count)) || Number(formData.guest_count) < 1)) {
      newErrors.guest_count = 'Guest count must be a positive number'
    }

    if (formData.budget && (isNaN(Number(formData.budget)) || Number(formData.budget) < 0)) {
      newErrors.budget = 'Budget must be a valid amount'
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
      const guestCount = formData.guest_count ? parseInt(formData.guest_count, 10) : null
      const budgetCents = formData.budget ? Math.round(parseFloat(formData.budget) * 100) : null

      await submitPublicInquiry({
        chef_slug: chefSlug,
        full_name: formData.full_name,
        email: formData.email,
        event_date: formData.event_date,
        city: formData.city,
        phone: formData.phone || '',
        guest_count: guestCount,
        occasion: formData.occasion || '',
        budget_cents: budgetCents,
        message: formData.message || '',
      })

      setShowSuccess(true)
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        event_date: '',
        city: '',
        guest_count: '',
        occasion: '',
        budget: '',
        message: '',
      })
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  if (showSuccess) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Inquiry Submitted!</h2>
          <p className="text-stone-600 mb-6">
            Thank you for your interest. {chefName} will review your inquiry and get back to you within 24 hours.
          </p>
          <button
            type="button"
            onClick={() => setShowSuccess(false)}
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            Submit another inquiry
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Your Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              Your Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                error={errors.full_name}
                required
                placeholder="Your full name"
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
                placeholder="your@email.com"
              />
            </div>

            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              helperText="Optional — helpful for quick follow-up"
            />
          </div>

          {/* Event Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              Event Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Event Date"
                name="event_date"
                type="date"
                value={formData.event_date}
                onChange={handleChange}
                error={errors.event_date}
                required
                helperText="Approximate date is fine"
              />

              <Input
                label="City / Location"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
                required
                placeholder="e.g. Austin, TX"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Guest Count"
                name="guest_count"
                type="number"
                min="1"
                value={formData.guest_count}
                onChange={handleChange}
                error={errors.guest_count}
                placeholder="e.g. 12"
              />

              <Input
                label="Occasion"
                name="occasion"
                type="text"
                value={formData.occasion}
                onChange={handleChange}
                placeholder="e.g. Birthday, Anniversary"
              />

              <Input
                label="Budget"
                name="budget"
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={handleChange}
                error={errors.budget}
                placeholder="e.g. 2000"
                helperText="Approximate budget in dollars"
              />
            </div>
          </div>

          {/* Message */}
          <div className="pt-2">
            <Textarea
              label="Additional Details"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us more about your event — dietary needs, special requests, vision for the evening..."
              rows={4}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full bg-stone-900 hover:bg-stone-800 focus-visible:ring-stone-900"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
          </Button>

          <p className="text-xs text-stone-400 text-center">
            By submitting, you agree to be contacted about your inquiry.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
