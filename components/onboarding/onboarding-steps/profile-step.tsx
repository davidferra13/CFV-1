'use client'

import { useState, useRef, useTransition } from 'react'
import { US_STATES } from '@/lib/onboarding/onboarding-constants'
import { uploadChefProfileImage } from '@/lib/network/actions'
import { uploadChefLogo } from '@/lib/chef/profile-actions'

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

const MAX_PROFILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

type ExistingProfileData = {
  businessName: string
  cuisines: string[]
  city: string
  state: string
  bio: string
  websiteUrl: string
  phone: string
  socialLinks: Record<string, string>
  profileImageUrl: string | null
  logoUrl: string | null
  isPublic: boolean
  serviceRadius: number | null
}

type ProfileStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
  existingData?: ExistingProfileData
}

export function ProfileStep({ onComplete, onSkip, existingData }: ProfileStepProps) {
  const [businessName, setBusinessName] = useState(existingData?.businessName ?? '')
  const [cuisines, setCuisines] = useState<string[]>(existingData?.cuisines ?? [])
  const [customCuisines, setCustomCuisines] = useState('')
  const [city, setCity] = useState(existingData?.city ?? '')
  const [state, setState] = useState(existingData?.state ?? '')
  const [serviceArea, setServiceArea] = useState('')
  const [serviceRadius, setServiceRadius] = useState(
    existingData?.serviceRadius ? String(existingData.serviceRadius) : ''
  )
  const [internationalLocation, setInternationalLocation] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState(existingData?.websiteUrl ?? '')
  const [phone, setPhone] = useState(existingData?.phone ?? '')
  const [instagram, setInstagram] = useState(existingData?.socialLinks?.instagram ?? '')
  const [facebook, setFacebook] = useState(existingData?.socialLinks?.facebook ?? '')
  const [tiktok, setTiktok] = useState(existingData?.socialLinks?.tiktok ?? '')
  const [bio, setBio] = useState(existingData?.bio ?? '')
  const [isPublic, setIsPublic] = useState(existingData?.isPublic ?? true)
  const [showSocial, setShowSocial] = useState(
    !!(
      existingData?.socialLinks?.instagram ||
      existingData?.socialLinks?.facebook ||
      existingData?.socialLinks?.tiktok
    )
  )
  const [validationError, setValidationError] = useState('')

  // Photo uploads
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    existingData?.profileImageUrl ?? null
  )
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(
    existingData?.profileImageUrl ?? null
  )
  const [logoPreview, setLogoPreview] = useState<string | null>(existingData?.logoUrl ?? null)
  const [logoUrl, setLogoUrl] = useState<string | null>(existingData?.logoUrl ?? null)
  const [photoError, setPhotoError] = useState('')
  const [logoError, setLogoError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [, startUploadTransition] = useTransition()

  async function handleProfilePhoto(file: File) {
    setPhotoError('')
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError('Use JPEG, PNG, WebP, or HEIC')
      return
    }
    if (file.size > MAX_PROFILE_SIZE) {
      setPhotoError('Photo must be under 5MB')
      return
    }
    setProfilePhotoPreview(URL.createObjectURL(file))
    setUploadingPhoto(true)

    startUploadTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('image', file)
        const result = await uploadChefProfileImage(formData)
        setProfilePhotoUrl(result.url)
      } catch (err) {
        setPhotoError('Upload failed. You can add this later from Settings.')
        setProfilePhotoPreview(null)
      } finally {
        setUploadingPhoto(false)
      }
    })
  }

  async function handleLogoFile(file: File) {
    setLogoError('')
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Use JPEG, PNG, WebP, or SVG')
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('Logo must be under 2MB')
      return
    }
    setLogoPreview(URL.createObjectURL(file))
    setUploadingLogo(true)

    startUploadTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('logo', file)
        const result = await uploadChefLogo(formData)
        setLogoUrl(result.url)
      } catch (err) {
        setLogoError('Upload failed. You can add this later from Settings.')
        setLogoPreview(null)
      } finally {
        setUploadingLogo(false)
      }
    })
  }

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
      state: state === 'Other (International)' ? internationalLocation.trim() : state,
      serviceArea: serviceArea.trim(),
      serviceRadius: serviceRadius ? parseInt(serviceRadius, 10) : undefined,
      websiteUrl: websiteUrl.trim(),
      phone: phone.trim(),
      socialLinks,
      bio: bio.trim(),
      isPublic,
      profileImageUrl: profilePhotoUrl,
      logoUrl: logoUrl,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Tell us about your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This powers your public profile, quote templates, and how Remy introduces you to clients.
        </p>
      </div>

      {/* Profile Photo + Logo */}
      <div className="flex items-start gap-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => profileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative h-24 w-24 rounded-full border-2 border-dashed border-border hover:border-orange-400 overflow-hidden flex items-center justify-center bg-muted transition-colors group"
          >
            {profilePhotoPreview ? (
              <>
                <img
                  src={profilePhotoPreview}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground group-hover:text-orange-600 transition-colors">
                <svg
                  className="h-8 w-8 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
          </button>
          <span className="text-xs text-muted-foreground">Your photo</span>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            aria-label="Upload profile photo"
            onChange={(e) => e.target.files?.[0] && handleProfilePhoto(e.target.files[0])}
          />
          {photoError && (
            <p className="text-xs text-red-500 max-w-[120px] text-center">{photoError}</p>
          )}
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="relative h-24 w-32 rounded-lg border-2 border-dashed border-border hover:border-orange-400 overflow-hidden flex items-center justify-center bg-muted transition-colors group"
          >
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-2" />
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground group-hover:text-orange-600 transition-colors">
                <svg
                  className="h-6 w-6 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-[10px] mt-1 block">Logo</span>
              </div>
            )}
          </button>
          <span className="text-xs text-muted-foreground">No logo? No problem.</span>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            aria-label="Upload business logo"
            onChange={(e) => e.target.files?.[0] && handleLogoFile(e.target.files[0])}
          />
          {logoError && (
            <p className="text-xs text-red-500 max-w-[140px] text-center">{logoError}</p>
          )}
        </div>
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
        <div className="grid grid-cols-3 gap-3">
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
          <div className="relative">
            <input
              type="number"
              min="0"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(e.target.value)}
              placeholder="Radius"
              aria-label="Service radius in miles"
              className="block w-full rounded-md border border-border bg-background px-3 py-2 pr-14 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground">
              miles
            </span>
          </div>
        </div>
        {state === 'Other (International)' && (
          <input
            type="text"
            value={internationalLocation}
            onChange={(e) => setInternationalLocation(e.target.value)}
            placeholder="Country or region (e.g. London, UK)"
            className="mt-3 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        )}
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
          placeholder="e.g. Greater Boston area, North Shore"
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
      <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
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
            aria-checked={isPublic}
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

        {/* Completeness meter (shown when public is on) */}
        {isPublic &&
          (() => {
            const filled = [
              businessName.trim(),
              cuisines.length > 0,
              city.trim() || state,
              profilePhotoPreview,
              bio.trim(),
            ].filter(Boolean).length
            const total = 5
            const pct = Math.round((filled / total) * 100)
            const missing: string[] = []
            if (!businessName.trim()) missing.push('Business name')
            if (cuisines.length === 0) missing.push('Cuisines')
            if (!city.trim() && !state) missing.push('Location')
            if (!profilePhotoPreview) missing.push('Profile photo')
            if (!bio.trim()) missing.push('Bio')

            return (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{pct}%</span>
                </div>
                {missing.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add {missing.join(', ')} to strengthen your public profile.
                  </p>
                ) : (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Your profile will be submitted for review. You'll be notified when it's live.
                  </p>
                )}
              </div>
            )
          })()}
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
