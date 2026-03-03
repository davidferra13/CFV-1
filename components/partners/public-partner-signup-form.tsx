'use client'

import { FormEvent, useState } from 'react'
import { createPublicPartnerProfile } from '@/lib/partners/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type PartnerType = 'airbnb_host' | 'business' | 'platform' | 'individual' | 'venue' | 'other'

const PARTNER_TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'airbnb_host', label: 'Airbnb Host' },
  { value: 'business', label: 'Business (Hotel, B&B, Restaurant)' },
  { value: 'venue', label: 'Venue' },
  { value: 'platform', label: 'Platform (TakeAChef, etc.)' },
  { value: 'individual', label: 'Individual Referrer' },
  { value: 'other', label: 'Other' },
]

type Props = {
  chefSlug: string
  chefName: string
  primaryColor: string
}

export function PublicPartnerSignupForm({ chefSlug, chefName, primaryColor }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [partnerType, setPartnerType] = useState<PartnerType>('individual')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      await createPublicPartnerProfile(chefSlug, {
        name: String(formData.get('name') || '').trim(),
        partner_type: partnerType,
        contact_name: String(formData.get('contact_name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        website: String(formData.get('website') || '').trim(),
        booking_url: String(formData.get('booking_url') || '').trim(),
        description: String(formData.get('description') || '').trim(),
        notes: String(formData.get('notes') || '').trim(),
        commission_notes: '',
        is_showcase_visible: true,
      })

      setShowSuccess(true)
      form.reset()
      setPartnerType('individual')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create partner profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showSuccess) {
    return (
      <Card className="bg-stone-900/90">
        <CardContent className="py-12 text-center">
          <h2 className="text-2xl font-bold text-stone-100 mb-2">Profile Submitted</h2>
          <p className="text-stone-400 mb-6">
            Thanks. Your partner profile was created for {chefName}.
          </p>
          <Button type="button" variant="secondary" onClick={() => setShowSuccess(false)}>
            Submit another profile
          </Button>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Partner Name"
            name="name"
            required
            placeholder="Business or referral name"
          />

          <div>
            <label
              htmlFor="partner-type"
              className="block text-sm font-medium text-stone-300 mb-1.5"
            >
              Partner Type <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="partner-type"
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value as PartnerType)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {PARTNER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Input label="Contact Name" name="contact_name" placeholder="Primary contact" />

          <Input label="Email" name="email" type="email" placeholder="name@example.com" />

          <Input label="Phone" name="phone" placeholder="(555) 123-4567" />

          <Input label="Website" name="website" placeholder="https://example.com" />

          <Input
            label="Booking URL"
            name="booking_url"
            placeholder="https://airbnb.com/rooms/..."
          />

          <Textarea
            label="Description"
            name="description"
            rows={4}
            placeholder="What should clients know about this partner?"
          />

          <Textarea
            label="Notes"
            name="notes"
            rows={3}
            placeholder="Any details to share with the chef"
          />

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? 'Creating Profile...' : 'Create Partner Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
