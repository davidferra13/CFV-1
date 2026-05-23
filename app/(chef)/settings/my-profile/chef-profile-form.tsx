'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { updateChefFullProfile, type ChefSocialLinks } from '@/lib/chef/profile-actions'
import { uploadChefProfileImage } from '@/lib/network/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'
import { PUBLIC_BIO_LIMITS } from '@/lib/profile/fact-guardrails'

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
  social_links: ChefSocialLinks
  private_profile_memory: string | null
  date_of_birth: string | null
  birth_month: number | null
  birth_day: number | null
  public_bio_settings: {
    maxChars: number
    proofChipMaxChars: number
    maxProofChips: number
    cannabisDisclosureMode: 'hidden' | 'soft_mentioned' | 'credentialed_public' | 'full_public'
    externalLongFormLinks: string[]
  }
}

export function ChefProfileForm({ profile, chefId }: { profile: ChefProfile; chefId: string }) {
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
  const [privateProfileMemory, setPrivateProfileMemory] = useState(
    profile.private_profile_memory || ''
  )
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth || '')
  const [birthMonth, setBirthMonth] = useState(
    profile.birth_month ? String(profile.birth_month) : ''
  )
  const [birthDay, setBirthDay] = useState(profile.birth_day ? String(profile.birth_day) : '')
  const [cannabisDisclosureMode, setCannabisDisclosureMode] = useState<
    'hidden' | 'soft_mentioned' | 'credentialed_public' | 'full_public'
  >(profile.public_bio_settings?.cannabisDisclosureMode || 'hidden')
  const [socialInstagram, setSocialInstagram] = useState(profile.social_links?.instagram || '')
  const [socialTiktok, setSocialTiktok] = useState(profile.social_links?.tiktok || '')
  const [socialFacebook, setSocialFacebook] = useState(profile.social_links?.facebook || '')
  const [socialYoutube, setSocialYoutube] = useState(profile.social_links?.youtube || '')
  const [socialLinktree, setSocialLinktree] = useState(profile.social_links?.linktree || '')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [logoUrl] = useState(profile.logo_url || '')

  const defaultData = useMemo(
    () => ({
      businessName: profile.business_name || '',
      displayName: profile.display_name || '',
      bio: profile.bio || '',
      phone: profile.phone || '',
      tagline: profile.tagline || '',
      googleReviewUrl: profile.google_review_url || '',
      websiteUrl: profile.website_url || '',
      showWebsiteOnPublicProfile: profile.show_website_on_public_profile ?? true,
      preferredInquiryDestination: (profile.preferred_inquiry_destination || 'both') as string,
      privateProfileMemory: profile.private_profile_memory || '',
      dateOfBirth: profile.date_of_birth || '',
      birthMonth: profile.birth_month ? String(profile.birth_month) : '',
      birthDay: profile.birth_day ? String(profile.birth_day) : '',
      cannabisDisclosureMode: profile.public_bio_settings?.cannabisDisclosureMode || 'hidden',
      socialInstagram: profile.social_links?.instagram || '',
      socialTiktok: profile.social_links?.tiktok || '',
      socialFacebook: profile.social_links?.facebook || '',
      socialYoutube: profile.social_links?.youtube || '',
      socialLinktree: profile.social_links?.linktree || '',
    }),
    [profile]
  )

  const currentData = useMemo(
    () => ({
      businessName,
      displayName,
      bio,
      phone,
      tagline,
      googleReviewUrl,
      websiteUrl,
      showWebsiteOnPublicProfile,
      preferredInquiryDestination: preferredInquiryDestination as string,
      privateProfileMemory,
      dateOfBirth,
      birthMonth,
      birthDay,
      cannabisDisclosureMode,
      socialInstagram,
      socialTiktok,
      socialFacebook,
      socialYoutube,
      socialLinktree,
    }),
    [
      businessName,
      displayName,
      bio,
      phone,
      tagline,
      googleReviewUrl,
      websiteUrl,
      showWebsiteOnPublicProfile,
      preferredInquiryDestination,
      privateProfileMemory,
      dateOfBirth,
      birthMonth,
      birthDay,
      cannabisDisclosureMode,
      socialInstagram,
      socialTiktok,
      socialFacebook,
      socialYoutube,
      socialLinktree,
    ]
  )

  const protection = useProtectedForm({
    surfaceId: 'chef-profile',
    recordId: null,
    tenantId: chefId,
    defaultData,
    currentData,
    throttleMs: 10000,
  })

  const applyFormData = useCallback((d: typeof defaultData) => {
    setBusinessName(d.businessName)
    setDisplayName(d.displayName)
    setBio(d.bio)
    setPhone(d.phone)
    setTagline(d.tagline)
    setGoogleReviewUrl(d.googleReviewUrl)
    setWebsiteUrl(d.websiteUrl)
    setShowWebsiteOnPublicProfile(d.showWebsiteOnPublicProfile)
    setPreferredInquiryDestination(
      d.preferredInquiryDestination as 'website_only' | 'chefflow_only' | 'both'
    )
    setPrivateProfileMemory(d.privateProfileMemory)
    setDateOfBirth(d.dateOfBirth)
    setBirthMonth(d.birthMonth)
    setBirthDay(d.birthDay)
    setCannabisDisclosureMode(
      d.cannabisDisclosureMode as
        | 'hidden'
        | 'soft_mentioned'
        | 'credentialed_public'
        | 'full_public'
    )
    setSocialInstagram(d.socialInstagram)
    setSocialTiktok(d.socialTiktok)
    setSocialFacebook(d.socialFacebook)
    setSocialYoutube(d.socialYoutube)
    setSocialLinktree(d.socialLinktree)
  }, [])

  useEffect(() => {
    if (!selectedImageFile) {
      setImagePreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(selectedImageFile)
    setImagePreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedImageFile])

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

        const nextLogoUrl = logoUrl || null

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
          private_profile_memory: privateProfileMemory || null,
          date_of_birth: dateOfBirth || null,
          birth_month: birthMonth ? Number(birthMonth) : null,
          birth_day: birthDay ? Number(birthDay) : null,
          public_bio_settings: {
            maxChars: PUBLIC_BIO_LIMITS.bioMaxChars,
            proofChipMaxChars: PUBLIC_BIO_LIMITS.proofChipMaxChars,
            maxProofChips: PUBLIC_BIO_LIMITS.maxProofChips,
            cannabisDisclosureMode,
            externalLongFormLinks: [websiteUrl, socialLinktree].filter(Boolean),
          },
          social_links: {
            instagram: socialInstagram || undefined,
            tiktok: socialTiktok || undefined,
            facebook: socialFacebook || undefined,
            youtube: socialYoutube || undefined,
            linktree: socialLinktree || undefined,
          },
        })
        setSuccess(true)
        protection.markCommitted()
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to update profile')
      }
    })
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <div className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Profile updated successfully.</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>Public Client Profile Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Your Name or Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              helperText="How you'd like to be known - a personal name or brand name both work"
            />
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              helperText="Optional name for public/client profile surfaces. If blank, business name is used."
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
              maxLength={PUBLIC_BIO_LIMITS.bioMaxChars}
              helperText={`${bio.length}/${PUBLIC_BIO_LIMITS.bioMaxChars} characters. Use external links for long-form stories.`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Private Facts & Disclosure Guardrails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Private Chef Memory"
              value={privateProfileMemory}
              onChange={(e) => setPrivateProfileMemory(e.target.value)}
              rows={5}
              maxLength={4000}
              helperText={`${privateProfileMemory.length}/4000 characters. Stored privately for profile optimization, not copied to public bio.`}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Date of Birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                helperText="Full DOB stays private."
              />
              <Input
                label="Birth Month"
                type="number"
                min="1"
                max="12"
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                helperText="Internal reminders."
              />
              <Input
                label="Birth Day"
                type="number"
                min="1"
                max="31"
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                helperText="Internal reminders."
              />
            </div>
            <Select
              label="Cannabis Disclosure"
              value={cannabisDisclosureMode}
              onChange={(e) => {
                const value = e.target.value as
                  | 'hidden'
                  | 'soft_mentioned'
                  | 'credentialed_public'
                  | 'full_public'
                setCannabisDisclosureMode(value)
              }}
              options={[
                { value: 'hidden', label: 'Hidden' },
                { value: 'soft_mentioned', label: 'Soft mention allowed' },
                { value: 'credentialed_public', label: 'Credentialed public' },
                { value: 'full_public', label: 'Full public' },
              ]}
              helperText="Controls whether approved cannabis facts can appear in public profile composition."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social & External Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-400">
              Add your social profiles. These appear on your public chef page and directory listing.
            </p>
            <Input
              label="Instagram"
              type="url"
              value={socialInstagram}
              onChange={(e) => setSocialInstagram(e.target.value)}
              placeholder="https://instagram.com/yourname"
            />
            <Input
              label="TikTok"
              type="url"
              value={socialTiktok}
              onChange={(e) => setSocialTiktok(e.target.value)}
              placeholder="https://tiktok.com/@yourname"
            />
            <Input
              label="Facebook"
              type="url"
              value={socialFacebook}
              onChange={(e) => setSocialFacebook(e.target.value)}
              placeholder="https://facebook.com/yourpage"
            />
            <Input
              label="YouTube"
              type="url"
              value={socialYoutube}
              onChange={(e) => setSocialYoutube(e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
            />
            <Input
              label="Linktree / Link Hub"
              type="url"
              value={socialLinktree}
              onChange={(e) => setSocialLinktree(e.target.value)}
              placeholder="https://linktr.ee/yourname"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public Contact & Inquiry Settings</CardTitle>
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
            <div className="rounded-lg border border-stone-700 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
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
                const value = (e.target.value || 'both') as
                  | 'website_only'
                  | 'chefflow_only'
                  | 'both'
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
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Profile Photo
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                onChange={(e) => setSelectedImageFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 file:mr-3 file:rounded-md file:border-0 file:bg-brand-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-400"
              />
              <p className="mt-1.5 text-sm text-stone-500">
                Upload a JPEG, PNG, HEIC, or WebP image (max 10MB).
              </p>
              {profileImageUrl && !selectedImageFile && (
                <button
                  type="button"
                  className="mt-2 text-sm text-stone-400 underline hover:text-stone-200"
                  onClick={() => setProfileImageUrl('')}
                >
                  Remove current photo
                </button>
              )}
            </div>

            {(imagePreviewUrl || profileImageUrl) && (
              <div className="pt-2 border-t border-stone-800">
                <p className="text-sm text-stone-400 mb-2">Image Preview</p>
                <Image
                  src={imagePreviewUrl || profileImageUrl}
                  alt="Profile preview"
                  width={80}
                  height={80}
                  sizes="80px"
                  unoptimized
                  className="h-20 w-20 rounded-full object-cover border border-stone-700"
                />
              </div>
            )}

            <div className="w-full pt-2 border-t border-stone-800">
              <p className="text-sm text-stone-400">
                Manage your business logo in{' '}
                <a href="/settings" className="text-brand-400 hover:text-brand-300 underline">
                  Settings &gt; Profile &amp; Branding
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" size="lg" onClick={handleSave} loading={isPending}>
            {isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </FormShield>
  )
}
