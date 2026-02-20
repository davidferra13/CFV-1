'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefFullProfile, uploadChefLogo } from '@/lib/chef/profile-actions'
import { uploadChefProfileImage } from '@/lib/network/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'

type ChefProfile = {
  business_name: string
  display_name: string | null
  bio: string | null
  phone: string | null
  tagline: string | null
  google_review_url: string | null
  profile_image_url: string | null
  logo_url: string | null
  website_url: string | null
  show_website_on_public_profile: boolean
  preferred_inquiry_destination: 'website_only' | 'chefflow_only' | 'both'
}

export function ChefProfileForm({ profile }: { profile: ChefProfile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [businessName, setBusinessName] = useState(profile.business_name || '')
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [tagline, setTagline] = useState(profile.tagline || '')
  const [googleReviewUrl, setGoogleReviewUrl] = useState(profile.google_review_url || '')
  const [profileImageUrl, setProfileImageUrl] = useState(profile.profile_image_url || '')
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || '')
  const [showWebsiteOnPublicProfile, setShowWebsiteOnPublicProfile] = useState(
    profile.show_website_on_public_profile ?? true
  )
  const [preferredInquiryDestination, setPreferredInquiryDestination] = useState<
    'website_only' | 'chefflow_only' | 'both'
  >(profile.preferred_inquiry_destination || 'both')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || '')
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedImageFile) {
      setImagePreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(selectedImageFile)
    setImagePreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedImageFile])

  useEffect(() => {
    if (!selectedLogoFile) {
      setLogoPreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(selectedLogoFile)
    setLogoPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedLogoFile])

  function handleSave() {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        let nextProfileImageUrl = profileImageUrl || null

        if (selectedImageFile) {
          const formData = new FormData()
          formData.set('image', selectedImageFile)
          const uploaded = await uploadChefProfileImage(formData)
          nextProfileImageUrl = uploaded.url
          setProfileImageUrl(uploaded.url)
          setSelectedImageFile(null)
        }

        let nextLogoUrl = logoUrl || null
        if (selectedLogoFile) {
          const logoFormData = new FormData()
          logoFormData.set('logo', selectedLogoFile)
          const uploaded = await uploadChefLogo(logoFormData)
          nextLogoUrl = uploaded.url
          setLogoUrl(uploaded.url)
          setSelectedLogoFile(null)
        }

        await updateChefFullProfile({
          business_name: businessName,
          display_name: displayName || null,
          bio: bio || null,
          phone: phone || null,
          tagline: tagline || null,
          google_review_url: googleReviewUrl || null,
          profile_image_url: nextProfileImageUrl,
          logo_url: nextLogoUrl,
          website_url: websiteUrl || null,
          show_website_on_public_profile: showWebsiteOnPublicProfile,
          preferred_inquiry_destination: preferredInquiryDestination,
        })
        setSuccess(true)
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to update profile')
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Profile updated successfully.</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Chef Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Your Name or Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            helperText="How you'd like to be known — a personal name or brand name both work"
          />
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            helperText="Optional public-facing name. If blank, business name is used."
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            helperText="Short headline shown on your public chef page."
          />
          <Textarea
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            helperText={`${bio.length}/1200 characters`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Google Review URL"
            type="url"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            placeholder="https://g.page/r/..."
          />
          <Input
            label="Official Website URL"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://your-site.com"
            helperText="Optional. Your primary marketing website."
          />
          <div className="rounded-lg border border-stone-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                checked={showWebsiteOnPublicProfile}
                onChange={(e) => setShowWebsiteOnPublicProfile(e.target.checked)}
              />
              Show website on public profile
            </label>
            <p className="mt-1 text-xs text-stone-500">
              When enabled, clients can open your official website from your public chef page.
            </p>
          </div>
          <Select
            label="Preferred Inquiry Destination"
            value={preferredInquiryDestination}
            onChange={(e) => {
              const value = (e.target.value || 'both') as 'website_only' | 'chefflow_only' | 'both'
              setPreferredInquiryDestination(value)
            }}
            options={[
              { value: 'both', label: 'Both (ChefFlow + Website)' },
              { value: 'chefflow_only', label: 'ChefFlow only' },
              { value: 'website_only', label: 'Website only' },
            ]}
            helperText="Default routing preference for incoming leads."
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Profile Photo
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
              onChange={(e) => setSelectedImageFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
            />
            <p className="mt-1.5 text-sm text-stone-500">
              Upload a JPEG, PNG, HEIC, or WebP image (max 10MB).
            </p>
            {profileImageUrl && !selectedImageFile && (
              <button
                type="button"
                className="mt-2 text-sm text-stone-600 underline hover:text-stone-800"
                onClick={() => setProfileImageUrl('')}
              >
                Remove current photo
              </button>
            )}
          </div>

          {(imagePreviewUrl || profileImageUrl) && (
            <div className="pt-2 border-t border-stone-100">
              <p className="text-sm text-stone-600 mb-2">Image Preview</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl || profileImageUrl}
                alt="Profile preview"
                className="h-20 w-20 rounded-full object-cover border border-stone-200"
              />
            </div>
          )}

          <div className="w-full pt-2 border-t border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Business Logo
            </label>
            <p className="text-xs text-stone-500 mb-2">
              Your brand mark or logo, shown on your public chef page. Transparent PNG or SVG works best.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={(e) => setSelectedLogoFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
            />
            <p className="mt-1.5 text-xs text-stone-500">
              JPEG, PNG, WebP, or SVG (max 5MB). Recommended: landscape format, min 200px wide.
            </p>
            {logoUrl && !selectedLogoFile && (
              <button
                type="button"
                className="mt-2 text-sm text-stone-600 underline hover:text-stone-800"
                onClick={() => setLogoUrl('')}
              >
                Remove current logo
              </button>
            )}
          </div>

          {(logoPreviewUrl || logoUrl) && (
            <div className="pt-2 border-t border-stone-100">
              <p className="text-sm text-stone-600 mb-2">Logo Preview</p>
              <div className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreviewUrl || logoUrl}
                  alt="Logo preview"
                  className="max-h-16 max-w-[240px] object-contain"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  )
}
