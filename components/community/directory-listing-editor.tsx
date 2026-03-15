'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getMyListing,
  updateListing,
  togglePublished,
  type DirectoryListingInput,
} from '@/lib/community/directory-actions'
import { DirectoryListingCard } from './directory-listing-card'

const CUISINE_OPTIONS = [
  'American', 'Italian', 'French', 'Japanese', 'Mexican', 'Thai',
  'Indian', 'Mediterranean', 'Chinese', 'Korean', 'Caribbean',
  'Southern', 'BBQ', 'Seafood', 'Vegan', 'Farm-to-Table',
]

const DIETARY_OPTIONS = [
  'Gluten-Free', 'Vegan', 'Vegetarian', 'Keto', 'Paleo',
  'Halal', 'Kosher', 'Nut-Free', 'Dairy-Free', 'Low-Sodium',
]

const SERVICE_TYPE_OPTIONS = [
  'Private Dinner', 'Meal Prep', 'Catering', 'Cooking Class',
  'Event Chef', 'Personal Chef', 'Pop-Up', 'Corporate',
]

export function DirectoryListingEditor() {
  const [isPending, startTransition] = useTransition()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [tagline, setTagline] = useState('')
  const [cuisines, setCuisines] = useState<string[]>([])
  const [dietarySpecialties, setDietarySpecialties] = useState<string[]>([])
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [serviceRadius, setServiceRadius] = useState('')
  const [minPriceDollars, setMinPriceDollars] = useState('')
  const [maxPriceDollars, setMaxPriceDollars] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  useEffect(() => {
    loadListing()
  }, [])

  async function loadListing() {
    try {
      const data = await getMyListing()
      if (data) {
        setListing(data)
        setBusinessName(data.business_name || '')
        setTagline(data.tagline || '')
        setCuisines(data.cuisines || [])
        setDietarySpecialties(data.dietary_specialties || [])
        setServiceTypes(data.service_types || [])
        setCity(data.city || '')
        setState(data.state || '')
        setZipCode(data.zip_code || '')
        setServiceRadius(data.service_radius_miles?.toString() || '')
        setMinPriceDollars(data.min_price_cents ? (data.min_price_cents / 100).toString() : '')
        setMaxPriceDollars(data.max_price_cents ? (data.max_price_cents / 100).toString() : '')
        setProfilePhotoUrl(data.profile_photo_url || '')
        setWebsiteUrl(data.website_url || '')
      }
    } catch (err) {
      console.error('[directory-editor] Failed to load listing', err)
      setError('Could not load your listing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleArrayItem(arr: string[], item: string, setter: (v: string[]) => void) {
    if (arr.includes(item)) {
      setter(arr.filter((x) => x !== item))
    } else {
      setter([...arr, item])
    }
  }

  function buildPreviewData() {
    return {
      id: listing?.id || 'preview',
      business_name: businessName || 'Your Business',
      tagline: tagline || null,
      cuisines,
      city: city || null,
      state: state || null,
      min_price_cents: minPriceDollars ? Math.round(parseFloat(minPriceDollars) * 100) : null,
      max_price_cents: maxPriceDollars ? Math.round(parseFloat(maxPriceDollars) * 100) : null,
      profile_photo_url: profilePhotoUrl || null,
      rating_avg: listing?.rating_avg ?? null,
      review_count: listing?.review_count ?? 0,
      service_types: serviceTypes,
      featured: listing?.featured ?? false,
    }
  }

  function handleSave() {
    if (!businessName.trim()) {
      setError('Business name is required.')
      return
    }

    setError(null)
    setSuccess(false)

    const input: DirectoryListingInput = {
      business_name: businessName.trim(),
      tagline: tagline.trim() || null,
      cuisines,
      dietary_specialties: dietarySpecialties,
      service_types: serviceTypes,
      city: city.trim() || null,
      state: state.trim() || null,
      zip_code: zipCode.trim() || null,
      service_radius_miles: serviceRadius ? parseInt(serviceRadius, 10) : null,
      min_price_cents: minPriceDollars ? Math.round(parseFloat(minPriceDollars) * 100) : null,
      max_price_cents: maxPriceDollars ? Math.round(parseFloat(maxPriceDollars) * 100) : null,
      profile_photo_url: profilePhotoUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
    }

    startTransition(async () => {
      try {
        await updateListing(input)
        setSuccess(true)
        await loadListing()
      } catch (err: any) {
        setError(err.message || 'Failed to save listing.')
      }
    })
  }

  function handleTogglePublish() {
    if (!listing?.id) return
    setError(null)

    startTransition(async () => {
      try {
        await togglePublished(listing.id)
        await loadListing()
      } catch (err: any) {
        setError(err.message || 'Failed to toggle publish status.')
      }
    })
  }

  if (loading) {
    return <div className="animate-pulse rounded-lg border bg-card p-6 text-center text-muted-foreground">Loading your listing...</div>
  }

  return (
    <div className="space-y-6">
      {/* Status bar */}
      {listing && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${listing.is_published ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {listing.is_published ? 'Published - visible in directory' : 'Draft - not visible'}
            </span>
          </div>
          <button
            onClick={handleTogglePublish}
            disabled={isPending}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              listing.is_published
                ? 'border text-muted-foreground hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            } disabled:opacity-50`}
          >
            {listing.is_published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Listing saved successfully.
        </div>
      )}

      {/* Form */}
      <div className="rounded-lg border bg-card p-4 space-y-5">
        <h3 className="text-lg font-semibold">Your Directory Listing</h3>

        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Business Name *</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Your business name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g. Farm-to-table excellence"
              maxLength={120}
            />
          </div>
        </div>

        {/* Cuisines */}
        <div>
          <label className="text-sm font-medium">Cuisines</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleArrayItem(cuisines, c, setCuisines)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  cuisines.includes(c)
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-background text-muted-foreground hover:bg-accent'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary specialties */}
        <div>
          <label className="text-sm font-medium">Dietary Specialties</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleArrayItem(dietarySpecialties, d, setDietarySpecialties)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  dietarySpecialties.includes(d)
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-background text-muted-foreground hover:bg-accent'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Service types */}
        <div>
          <label className="text-sm font-medium">Service Types</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {SERVICE_TYPE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleArrayItem(serviceTypes, s, setServiceTypes)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  serviceTypes.includes(s)
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-background text-muted-foreground hover:bg-accent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-medium">Location</label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="City"
            />
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="State"
            />
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="ZIP Code"
            />
            <input
              type="number"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Radius (miles)"
              min="0"
            />
          </div>
        </div>

        {/* Pricing */}
        <div>
          <label className="text-sm font-medium">Price Range (per person)</label>
          <div className="mt-2 grid grid-cols-2 gap-3 max-w-xs">
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                value={minPriceDollars}
                onChange={(e) => setMinPriceDollars(e.target.value)}
                className="w-full rounded-md border bg-background pl-7 pr-3 py-2 text-sm"
                placeholder="Min"
                min="0"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                value={maxPriceDollars}
                onChange={(e) => setMaxPriceDollars(e.target.value)}
                className="w-full rounded-md border bg-background pl-7 pr-3 py-2 text-sm"
                placeholder="Max"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* URLs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Profile Photo URL</label>
            <input
              type="url"
              value={profilePhotoUrl}
              onChange={(e) => setProfilePhotoUrl(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Listing'}
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Preview (how others will see your listing)</h4>
          <div className="max-w-sm">
            <DirectoryListingCard listing={buildPreviewData()} />
          </div>
        </div>
      )}
    </div>
  )
}
