'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitDirectoryListing } from '@/lib/discover/actions'
import { BUSINESS_TYPES, CUISINE_CATEGORIES } from '@/lib/discover/constants'
import { NEUTRAL_CITY_PLACEHOLDER } from '@/lib/site/national-brand-copy'

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export function SubmitListingForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [businessType, setBusinessType] = useState('restaurant')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([])
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')

  function toggleCuisine(value: string) {
    setCuisineTypes((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const result = await submitDirectoryListing({
          name: name.trim(),
          businessType,
          city: city.trim(),
          state,
          cuisineTypes,
          websiteUrl: websiteUrl.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          description: description.trim() || undefined,
        })

        if (result.success) {
          if (result.mode === 'claimed_existing' && result.slug) {
            toast.success('We found your existing listing and claimed it. Add your public details now.')
            router.push(`/nearby/${result.slug}/enhance`)
            return
          }

          toast.success('Your business has been submitted! We will review it shortly.')
          router.push('/nearby')
        } else {
          if (result.mode === 'already_claimed' && result.slug) {
            toast.error(result.error || 'This business already has a Nearby listing.')
            router.push(`/nearby/${result.slug}`)
            return
          }
          toast.error(result.error || 'Failed to submit. Please try again.')
        }
      } catch {
        toast.error('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1.5">Business name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. The Golden Spatula"
          className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-1.5">Business type *</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-3 text-sm text-stone-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-1.5">City *</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            placeholder={NEUTRAL_CITY_PLACEHOLDER}
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-1.5">State *</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-3 text-sm text-stone-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Select state</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-200 mb-2">
          Cuisine types (select all that apply)
        </label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCuisine(c.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                cuisineTypes.includes(c.value)
                  ? 'bg-brand-600 text-white'
                  : 'border border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600 hover:text-stone-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-1.5">Contact email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@business.com"
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <p className="mt-1 text-xs-tight text-stone-500">
            Used for verification only. Not displayed publicly.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-1.5">
            Phone (optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1.5">Website URL</label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://yourbusiness.com"
          className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1.5">
          Short description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Tell potential customers what makes your business special..."
          className="w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
        />
        <p className="mt-1 text-xs-tight text-stone-500">{description.length}/500</p>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={isPending || !name.trim() || !email.trim() || !city.trim() || !state}
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : 'Submit your business'}
        </button>
        <p className="text-xs-tight text-stone-500">
          If your business is already listed, we will claim that listing instead of creating a duplicate.
        </p>
      </div>
    </form>
  )
}
