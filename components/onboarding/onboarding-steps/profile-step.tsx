'use client'

import { useState } from 'react'
import { US_STATES } from '@/lib/onboarding/onboarding-constants'

const CUISINE_OPTIONS = [
  'American',
  'French',
  'Italian',
  'Japanese',
  'Mexican',
  'Mediterranean',
  'Chinese',
  'Indian',
  'Thai',
  'Korean',
  'Spanish',
  'Middle Eastern',
  'Caribbean',
  'Southern',
  'Farm-to-Table',
  'Plant-Based',
  'Fusion',
  'Pastry & Baking',
  'Other',
]

type ProfileStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
}

export function ProfileStep({ onComplete, onSkip }: ProfileStepProps) {
  const [businessName, setBusinessName] = useState('')
  const [cuisines, setCuisines] = useState<string[]>([])
  const [customCuisines, setCustomCuisines] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [bio, setBio] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [showSocial, setShowSocial] = useState(false)
  const [validationError, setValidationError] = useState('')

  function toggleCuisine(c: string) {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessName.trim()) {
      setValidationError('Business name is required')
      return
    }
    setValidationError('')

    // Merge custom cuisines with selected ones
    let allCuisines = cuisines.filter((c) => c !== 'Other')
    if (cuisines.includes('Other') && customCuisines.trim()) {
      const custom = customCuisines
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      allCuisines = [...allCuisines, ...custom]
    }

    const socialLinks: Record<string, string> = {}
    if (instagram.trim()) socialLinks.instagram = instagram.trim()
    if (facebook.trim()) socialLinks.facebook = facebook.trim()
    if (tiktok.trim()) socialLinks.tiktok = tiktok.trim()

    onComplete({
      businessName: businessName.trim(),
      cuisines: allCuisines,
      city: city.trim(),
      state,
      serviceArea: serviceArea.trim(),
      websiteUrl: websiteUrl.trim(),
      phone: phone.trim(),
      socialLinks,
      bio: bio.trim(),
      isPublic,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Tell us about your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This helps clients find you and understand what you offer.
        </p>
      </div>

      {/* Business Name (required) */}
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-foreground">
          Business Name <span className="text-red-500">*</span>
        </label>
        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value)
            if (validationError) setValidationError('')
          }}
          placeholder="e.g. Chef Maria's Kitchen"
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        {validationError && <p className="mt-1 text-sm text-red-500">{validationError}</p>}
      </div>

      {/* Cuisine Specialties */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Cuisine Specialties
        </label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCuisine(c)}
              className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                cuisines.includes(c)
                  ? 'bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300'
                  : 'bg-background border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {cuisines.includes('Other') && (
          <input
            type="text"
            value={customCuisines}
            onChange={(e) => setCustomCuisines(e.target.value)}
            placeholder="e.g. Ethiopian, Peruvian, Molecular Gastronomy"
            className="mt-3 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Location</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            aria-label="State"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">State</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Service Area (freeform) */}
      <div>
        <label htmlFor="serviceArea" className="block text-sm font-medium text-foreground">
          Service Area
        </label>
        <input
          id="serviceArea"
          type="text"
          value={serviceArea}
          onChange={(e) => setServiceArea(e.target.value)}
          placeholder="e.g. Greater Boston area, North Shore, 30-mile radius"
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Website */}
      <div>
        <label htmlFor="websiteUrl" className="block text-sm font-medium text-foreground">
          Website
        </label>
        <input
          id="websiteUrl"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://yourwebsite.com"
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Social Media (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowSocial(!showSocial)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showSocial ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Social media links (optional)
        </button>
        {showSocial && (
          <div className="mt-3 space-y-3 pl-5">
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Instagram handle (e.g. @chefmaria)"
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="Facebook page URL"
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <input
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="TikTok handle (e.g. @chefmaria)"
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        )}
      </div>

      {/* Short Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-foreground">
          Short Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell potential clients about yourself, your background, and your approach to cooking..."
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Public/Private Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Make my profile visible to potential clients
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPublic
              ? 'Public: searchable and bookable by anyone. Subject to admin review.'
              : 'Private: invite-only, internal ops tool.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic ? 'true' : 'false'}
          aria-label="Make profile public"
          onClick={() => setIsPublic(!isPublic)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            isPublic ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
              isPublic ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          I'll do this later
        </button>
        <button
          type="submit"
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </form>
  )
}
