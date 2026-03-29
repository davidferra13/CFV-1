'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DISCOVERY_CUISINE_OPTIONS,
  DISCOVERY_PRICE_RANGE_OPTIONS,
  DISCOVERY_SERVICE_TYPE_OPTIONS,
} from '@/lib/discovery/constants'
import type { DiscoveryProfile } from '@/lib/discovery/profile'
import {
  updateMyDiscoveryProfile,
  uploadDiscoveryHeroImage,
  removeDiscoveryHeroImage,
} from '@/lib/discovery/actions'

function toggleValue(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}

function parseNullableInt(value: string) {
  if (!value.trim()) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const ALLOWED_HERO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_HERO_SIZE = 10 * 1024 * 1024 // 10MB

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

function OptionPills({
  label,
  options,
  selectedValues,
  onToggle,
}: {
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
  selectedValues: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-stone-300">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selected
                  ? 'border-brand-500 bg-brand-950 text-brand-300'
                  : 'border-stone-600 bg-stone-950 text-stone-300 hover:border-stone-500 hover:text-stone-100'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DiscoveryProfileSettings({ profile }: { profile: DiscoveryProfile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cuisineTypes, setCuisineTypes] = useState<string[]>(profile.cuisine_types)
  const [serviceTypes, setServiceTypes] = useState<string[]>(profile.service_types)
  const [priceRange, setPriceRange] = useState(profile.price_range || '')
  const [minGuests, setMinGuests] = useState(profile.min_guest_count?.toString() || '')
  const [maxGuests, setMaxGuests] = useState(profile.max_guest_count?.toString() || '')
  const [serviceAreaCity, setServiceAreaCity] = useState(profile.service_area_city || '')
  const [serviceAreaState, setServiceAreaState] = useState(profile.service_area_state || '')
  const [serviceAreaZip, setServiceAreaZip] = useState(profile.service_area_zip || '')
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(
    profile.service_area_radius_miles?.toString() || ''
  )
  const [acceptingInquiries, setAcceptingInquiries] = useState(profile.accepting_inquiries)
  const [nextAvailableDate, setNextAvailableDate] = useState(profile.next_available_date || '')
  const [leadTimeDays, setLeadTimeDays] = useState(profile.lead_time_days?.toString() || '')
  const [heroImageUrl, setHeroImageUrl] = useState(profile.hero_image_url || '')
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  const [heroUploading, setHeroUploading] = useState(false)
  const heroFileRef = useRef<HTMLInputElement>(null)
  const [highlightText, setHighlightText] = useState(profile.highlight_text || '')

  async function handleHeroUpload(file: File) {
    if (!ALLOWED_HERO_TYPES.includes(file.type)) {
      setError('Use JPEG, PNG, WebP, or HEIC.')
      return
    }
    if (file.size > MAX_HERO_SIZE) {
      setError('File too large. Maximum 10MB.')
      return
    }

    // Dimension check (skip for HEIC since browsers can't preview it)
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
    if (!isHeic) {
      try {
        const dims = await getImageDimensions(file)
        if (dims.width < 800 || dims.height < 600) {
          setError(null)
          setSuccess(
            'This image is smaller than recommended (at least 1200x900px) and may appear blurry on the directory.'
          )
        }
      } catch {
        // Could not read dimensions, proceed anyway
      }
    }

    // Show local preview (skip for HEIC)
    if (!isHeic) {
      setHeroPreview(URL.createObjectURL(file))
    }

    setHeroUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      const result = await uploadDiscoveryHeroImage(formData)
      setHeroImageUrl(result.url)
      setHeroPreview(null)
      setSuccess('Showcase image updated')
      router.refresh()
    } catch (uploadErr) {
      setHeroPreview(null)
      setError(uploadErr instanceof Error ? uploadErr.message : 'Failed to upload image')
    } finally {
      setHeroUploading(false)
      if (heroFileRef.current) heroFileRef.current.value = ''
    }
  }

  async function handleHeroRemove() {
    setHeroUploading(true)
    setError(null)

    try {
      await removeDiscoveryHeroImage()
      setHeroImageUrl('')
      setHeroPreview(null)
      setSuccess('Showcase image removed')
      router.refresh()
    } catch (removeErr) {
      setError(removeErr instanceof Error ? removeErr.message : 'Failed to remove image')
    } finally {
      setHeroUploading(false)
    }
  }

  function handleSave() {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        await updateMyDiscoveryProfile({
          cuisine_types: cuisineTypes,
          service_types: serviceTypes,
          price_range: priceRange || null,
          min_guest_count: parseNullableInt(minGuests),
          max_guest_count: parseNullableInt(maxGuests),
          service_area_city: serviceAreaCity.trim() || null,
          service_area_state: serviceAreaState.trim() || null,
          service_area_zip: serviceAreaZip.trim() || null,
          service_area_radius_miles: parseNullableInt(serviceRadiusMiles),
          accepting_inquiries: acceptingInquiries,
          next_available_date: nextAvailableDate || null,
          lead_time_days: parseNullableInt(leadTimeDays),
          hero_image_url: heroImageUrl.trim() || null,
          highlight_text: highlightText.trim() || null,
        })

        setSuccess('Discovery profile updated.')
        router.refresh()
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : 'Failed to save discovery profile'
        )
      }
    })
  }

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Discovery Profile</h2>
        <p className="mt-1 text-sm text-stone-400">
          This powers chef search, filters, and availability messaging across the public directory.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Select
        label="Price positioning"
        value={priceRange}
        onChange={(event) => setPriceRange(event.target.value)}
        options={DISCOVERY_PRICE_RANGE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-stone-300">Showcase image</p>
        <p className="mb-3 text-xs text-stone-500">
          This image appears on your public directory tile. Landscape recommended, at least
          1200x900px. Max 10MB. GPS and camera metadata are automatically removed for privacy.
        </p>

        {heroPreview || heroImageUrl ? (
          <div className="space-y-3">
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border border-stone-700 bg-stone-950">
              <Image
                src={heroPreview || heroImageUrl}
                alt="Showcase preview"
                fill
                className="object-cover"
                unoptimized
              />
              {heroUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-400 border-t-brand-500" />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={heroUploading}
                onClick={() => heroFileRef.current?.click()}
                className="text-sm font-medium text-brand-400 hover:text-brand-300 disabled:opacity-50"
              >
                Change image
              </button>
              <button
                type="button"
                disabled={heroUploading}
                onClick={handleHeroRemove}
                className="text-sm font-medium text-stone-400 hover:text-stone-300 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={heroUploading}
            onClick={() => heroFileRef.current?.click()}
            className="flex w-full max-w-md flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-700 bg-stone-950 p-8 text-center transition-colors hover:border-stone-600 disabled:opacity-50"
          >
            <svg
              className="mb-2 h-8 w-8 text-stone-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium text-stone-400">Upload a showcase image</span>
          </button>
        )}

        <input
          ref={heroFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          aria-label="Upload showcase image"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleHeroUpload(file)
          }}
        />
      </div>

      <Textarea
        label="Highlight text"
        value={highlightText}
        onChange={(event) => setHighlightText(event.target.value)}
        rows={3}
        maxLength={240}
        placeholder="Seasonal private dinners, multi-day retreats, and polished in-home hospitality."
        helperText="Short value statement used in search results and profile detail panels."
      />

      <OptionPills
        label="Cuisine focus"
        options={DISCOVERY_CUISINE_OPTIONS}
        selectedValues={cuisineTypes}
        onToggle={(value) => setCuisineTypes((current) => toggleValue(current, value))}
      />

      <OptionPills
        label="Service types"
        options={DISCOVERY_SERVICE_TYPE_OPTIONS}
        selectedValues={serviceTypes}
        onToggle={(value) => setServiceTypes((current) => toggleValue(current, value))}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Input
          label="Primary city"
          value={serviceAreaCity}
          onChange={(event) => setServiceAreaCity(event.target.value)}
          placeholder="Aspen"
        />
        <Input
          label="State"
          value={serviceAreaState}
          onChange={(event) => setServiceAreaState(event.target.value)}
          placeholder="Colorado"
        />
        <Input
          label="ZIP code"
          value={serviceAreaZip}
          onChange={(event) => setServiceAreaZip(event.target.value)}
          placeholder="81611"
          helperText="Used to anchor ZIP and near-me search."
        />
        <Input
          label="Service radius (miles)"
          type="number"
          min="0"
          max="500"
          value={serviceRadiusMiles}
          onChange={(event) => setServiceRadiusMiles(event.target.value)}
          placeholder="25"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Input
          label="Minimum guests"
          type="number"
          min="1"
          max="500"
          value={minGuests}
          onChange={(event) => setMinGuests(event.target.value)}
          placeholder="2"
        />
        <Input
          label="Maximum guests"
          type="number"
          min="1"
          max="500"
          value={maxGuests}
          onChange={(event) => setMaxGuests(event.target.value)}
          placeholder="20"
        />
        <Input
          label="Lead time (days)"
          type="number"
          min="0"
          max="365"
          value={leadTimeDays}
          onChange={(event) => setLeadTimeDays(event.target.value)}
          placeholder="7"
        />
        <Input
          label="Next available date"
          type="date"
          value={nextAvailableDate}
          onChange={(event) => setNextAvailableDate(event.target.value)}
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-stone-700 bg-stone-900/70 p-4">
        <input
          type="checkbox"
          checked={acceptingInquiries}
          onChange={(event) => setAcceptingInquiries(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-stone-600 bg-stone-950 text-brand-600 focus:ring-brand-500"
        />
        <div>
          <p className="text-sm font-medium text-stone-100">Accept new public inquiries</p>
          <p className="mt-1 text-sm text-stone-400">
            Turn this off to keep your profile discoverable while preventing new inquiry form
            submissions.
          </p>
        </div>
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={isPending}>
          Save discovery profile
        </Button>
        <p className="text-xs text-stone-500">
          Public directory filters update after save and cache revalidation.
        </p>
      </div>
    </Card>
  )
}
