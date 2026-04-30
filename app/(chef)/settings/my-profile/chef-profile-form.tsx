'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefFullProfile } from '@/lib/chef/profile-actions'
import type { ChefCustomLink, ChefSocialLinks } from '@/lib/chef/profile-types'
import { uploadChefProfileImage } from '@/lib/network/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

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
  const [socialInstagram, setSocialInstagram] = useState(profile.social_links?.instagram || '')
  const [socialTiktok, setSocialTiktok] = useState(profile.social_links?.tiktok || '')
  const [socialFacebook, setSocialFacebook] = useState(profile.social_links?.facebook || '')
  const [socialYoutube, setSocialYoutube] = useState(profile.social_links?.youtube || '')
  const [socialLinkedin, setSocialLinkedin] = useState(profile.social_links?.linkedin || '')
  const [socialX, setSocialX] = useState(profile.social_links?.x || '')
  const [socialPinterest, setSocialPinterest] = useState(profile.social_links?.pinterest || '')
  const [socialThreads, setSocialThreads] = useState(profile.social_links?.threads || '')
  const [socialSubstack, setSocialSubstack] = useState(profile.social_links?.substack || '')
  const [socialPress, setSocialPress] = useState(profile.social_links?.press || '')
  const [socialBookingPlatform, setSocialBookingPlatform] = useState(
    profile.social_links?.bookingPlatform || ''
  )
  const [socialLinktree, setSocialLinktree] = useState(profile.social_links?.linktree || '')
  const [customLinks, setCustomLinks] = useState<ChefCustomLink[]>(
    profile.social_links?.custom?.length ? profile.social_links.custom : [{ label: '', url: '' }]
  )
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
      socialInstagram: profile.social_links?.instagram || '',
      socialTiktok: profile.social_links?.tiktok || '',
      socialFacebook: profile.social_links?.facebook || '',
      socialYoutube: profile.social_links?.youtube || '',
      socialLinkedin: profile.social_links?.linkedin || '',
      socialX: profile.social_links?.x || '',
      socialPinterest: profile.social_links?.pinterest || '',
      socialThreads: profile.social_links?.threads || '',
      socialSubstack: profile.social_links?.substack || '',
      socialPress: profile.social_links?.press || '',
      socialBookingPlatform: profile.social_links?.bookingPlatform || '',
      socialLinktree: profile.social_links?.linktree || '',
      customLinks: profile.social_links?.custom?.length
        ? profile.social_links.custom
        : [{ label: '', url: '' }],
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
      socialInstagram,
      socialTiktok,
      socialFacebook,
      socialYoutube,
      socialLinkedin,
      socialX,
      socialPinterest,
      socialThreads,
      socialSubstack,
      socialPress,
      socialBookingPlatform,
      socialLinktree,
      customLinks,
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
      socialInstagram,
      socialTiktok,
      socialFacebook,
      socialYoutube,
      socialLinkedin,
      socialX,
      socialPinterest,
      socialThreads,
      socialSubstack,
      socialPress,
      socialBookingPlatform,
      socialLinktree,
      customLinks,
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
    setSocialInstagram(d.socialInstagram)
    setSocialTiktok(d.socialTiktok)
    setSocialFacebook(d.socialFacebook)
    setSocialYoutube(d.socialYoutube)
    setSocialLinkedin(d.socialLinkedin)
    setSocialX(d.socialX)
    setSocialPinterest(d.socialPinterest)
    setSocialThreads(d.socialThreads)
    setSocialSubstack(d.socialSubstack)
    setSocialPress(d.socialPress)
    setSocialBookingPlatform(d.socialBookingPlatform)
    setSocialLinktree(d.socialLinktree)
    setCustomLinks(d.customLinks)
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

  const publicDisplayName = displayName.trim() || businessName.trim() || profile.business_name
  const previewImageUrl = imagePreviewUrl || profileImageUrl
  const visibleSocialCount =
    [
      socialInstagram,
      socialTiktok,
      socialFacebook,
      socialYoutube,
      socialLinkedin,
      socialX,
      socialPinterest,
      socialThreads,
      socialSubstack,
      socialPress,
      socialBookingPlatform,
      socialLinktree,
    ].filter((value) => value.trim().length > 0).length +
    customLinks.filter((link) => link.label.trim() && link.url.trim()).length
  const hasPrimaryAction = Boolean(
    preferredInquiryDestination === 'chefflow_only' ||
    preferredInquiryDestination === 'both' ||
    (preferredInquiryDestination === 'website_only' &&
      websiteUrl.trim().length > 0 &&
      showWebsiteOnPublicProfile)
  )
  const readinessItems = [
    {
      label: 'Identity',
      complete: Boolean(publicDisplayName.trim() && tagline.trim()),
      detail: 'Name and headline are ready for the hero.',
    },
    {
      label: 'Story',
      complete: bio.trim().length >= 80,
      detail: 'Bio has enough context for buyers to understand fit.',
    },
    {
      label: 'Visual',
      complete: Boolean(previewImageUrl),
      detail: 'Profile photo gives the page a human anchor.',
    },
    {
      label: 'Social proof',
      complete: Boolean(googleReviewUrl.trim() || visibleSocialCount > 0),
      detail: 'Reviews or social links give clients a path to verify.',
    },
    {
      label: 'Lead path',
      complete: hasPrimaryAction,
      detail: 'A client can clearly choose where to inquire.',
    },
  ]
  const completedReadinessItems = readinessItems.filter((item) => item.complete).length
  const readinessPercent = Math.round((completedReadinessItems / readinessItems.length) * 100)

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
          social_links: {
            instagram: socialInstagram || undefined,
            tiktok: socialTiktok || undefined,
            facebook: socialFacebook || undefined,
            youtube: socialYoutube || undefined,
            linkedin: socialLinkedin || undefined,
            x: socialX || undefined,
            pinterest: socialPinterest || undefined,
            threads: socialThreads || undefined,
            substack: socialSubstack || undefined,
            press: socialPress || undefined,
            bookingPlatform: socialBookingPlatform || undefined,
            linktree: socialLinktree || undefined,
            custom: customLinks
              .map((link) => ({
                label: link.label.trim(),
                url: link.url.trim(),
              }))
              .filter((link) => link.label && link.url),
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

  function updateCustomLink(index: number, field: keyof ChefCustomLink, value: string) {
    setCustomLinks((links) =>
      links.map((link, linkIndex) =>
        linkIndex === index
          ? {
              ...link,
              [field]: value,
            }
          : link
      )
    )
  }

  function addCustomLink() {
    setCustomLinks((links) => [...links, { label: '', url: '' }].slice(0, 6))
  }

  function removeCustomLink(index: number) {
    setCustomLinks((links) => {
      const nextLinks = links.filter((_, linkIndex) => linkIndex !== index)
      return nextLinks.length ? nextLinks : [{ label: '', url: '' }]
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chef Profile</CardTitle>
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
                <CardTitle>Social & External Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-stone-400">
                  Add every place clients can verify or follow your work. ChefFlow keeps your own
                  sites and channels visible, then routes high-intent visitors toward booking.
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
                  label="LinkedIn"
                  type="url"
                  value={socialLinkedin}
                  onChange={(e) => setSocialLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/yourname"
                />
                <Input
                  label="X"
                  type="url"
                  value={socialX}
                  onChange={(e) => setSocialX(e.target.value)}
                  placeholder="https://x.com/yourname"
                />
                <Input
                  label="Pinterest"
                  type="url"
                  value={socialPinterest}
                  onChange={(e) => setSocialPinterest(e.target.value)}
                  placeholder="https://pinterest.com/yourname"
                />
                <Input
                  label="Threads"
                  type="url"
                  value={socialThreads}
                  onChange={(e) => setSocialThreads(e.target.value)}
                  placeholder="https://threads.net/@yourname"
                />
                <Input
                  label="Substack / Newsletter"
                  type="url"
                  value={socialSubstack}
                  onChange={(e) => setSocialSubstack(e.target.value)}
                  placeholder="https://yourname.substack.com"
                />
                <Input
                  label="Press / Media"
                  type="url"
                  value={socialPress}
                  onChange={(e) => setSocialPress(e.target.value)}
                  placeholder="https://publication.com/feature"
                />
                <Input
                  label="External Booking Platform"
                  type="url"
                  value={socialBookingPlatform}
                  onChange={(e) => setSocialBookingPlatform(e.target.value)}
                  placeholder="https://takeachef.com/..."
                />
                <Input
                  label="Linktree / Link Hub"
                  type="url"
                  value={socialLinktree}
                  onChange={(e) => setSocialLinktree(e.target.value)}
                  placeholder="https://linktr.ee/yourname"
                />
                <div className="space-y-3 rounded-lg border border-stone-700 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-stone-300">Custom Links</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Add press kits, podcasts, classes, venues, partner pages, or any other
                        public link clients should see.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addCustomLink}
                      disabled={customLinks.length >= 6}
                    >
                      Add Link
                    </Button>
                  </div>

                  {customLinks.map((link, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg bg-stone-950 p-3 md:grid-cols-2"
                    >
                      <Input
                        label={`Label ${index + 1}`}
                        value={link.label}
                        onChange={(e) => updateCustomLink(index, 'label', e.target.value)}
                        placeholder="Podcast interview"
                      />
                      <Input
                        label={`URL ${index + 1}`}
                        type="url"
                        value={link.url}
                        onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                      <div className="md:col-span-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomLink(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl || profileImageUrl}
                      alt="Profile preview"
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

          <aside className="space-y-6 lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle>Public Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-stone-700 bg-stone-950 p-4">
                  <div className="flex items-center gap-3">
                    {previewImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImageUrl}
                        alt="Profile preview"
                        className="h-16 w-16 rounded-2xl border border-stone-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-stone-700 bg-stone-900 text-xl font-semibold text-stone-400">
                        {publicDisplayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-stone-100">
                        {publicDisplayName}
                      </p>
                      {tagline.trim() ? (
                        <p className="mt-1 line-clamp-2 text-sm text-stone-400">{tagline}</p>
                      ) : (
                        <p className="mt-1 text-sm text-stone-500">Headline appears here.</p>
                      )}
                    </div>
                  </div>

                  {bio.trim() && (
                    <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-stone-300">
                      {bio.trim()}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {websiteUrl.trim() && showWebsiteOnPublicProfile && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-300">
                        Website
                      </span>
                    )}
                    {googleReviewUrl.trim() && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-300">
                        Google reviews
                      </span>
                    )}
                    {visibleSocialCount > 0 && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-300">
                        {visibleSocialCount} social link{visibleSocialCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-300">{readinessPercent}% ready</span>
                    <span className="text-stone-500">
                      {completedReadinessItems}/{readinessItems.length}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${readinessPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {readinessItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-stone-800 bg-stone-900/60 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={[
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            item.complete
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-stone-800 text-stone-500',
                          ].join(' ')}
                        >
                          {item.complete ? 'OK' : ''}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-stone-200">{item.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-stone-500">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </FormShield>
  )
}
