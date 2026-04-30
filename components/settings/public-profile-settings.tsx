// Public Profile Settings Client Component
// Handles tagline and showcase partner toggles
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, ExternalLink } from '@/components/ui/icons'
import { updateChefPortalTheme, uploadChefPortalBackgroundImage } from '@/lib/profile/actions'
import { updatePartner } from '@/lib/partners/actions'

type PartnerInfo = {
  id: string
  name: string
  partner_type: string
  is_showcase_visible: boolean
  showcase_order: number
}

const TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb',
  business: 'Business',
  platform: 'Platform',
  individual: 'Individual',
  venue: 'Venue',
  other: 'Other',
}

export function PublicProfileSettings({
  publicSlug,
  currentTagline,
  currentPrimaryColor,
  currentBackgroundColor,
  currentBackgroundImageUrl,
  partners,
}: {
  publicSlug: string | null
  currentTagline: string | null
  currentPrimaryColor: string | null
  currentBackgroundColor: string | null
  currentBackgroundImageUrl: string | null
  partners: PartnerInfo[]
}) {
  const router = useRouter()
  const [tagline, setTagline] = useState(currentTagline || '')
  const [primaryColor, setPrimaryColor] = useState(currentPrimaryColor || '#1c1917')
  const [backgroundColor, setBackgroundColor] = useState(currentBackgroundColor || '#fafaf9')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(currentBackgroundImageUrl || '')
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<File | null>(null)
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedHubLink, setCopiedHubLink] = useState(false)
  const [publicOrigin, setPublicOrigin] = useState('https://app.cheflowhq.com')
  const hubUrl = publicSlug ? `${publicOrigin}/chef/${publicSlug}?view=hub&source=bio` : null

  useEffect(() => {
    setPublicOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!selectedBackgroundFile) {
      setBackgroundPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedBackgroundFile)
    setBackgroundPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedBackgroundFile])

  async function handleSaveProfile() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      let nextBackgroundImageUrl = backgroundImageUrl || null

      if (selectedBackgroundFile) {
        const formData = new FormData()
        formData.set('image', selectedBackgroundFile)
        const uploaded = await uploadChefPortalBackgroundImage(formData)
        nextBackgroundImageUrl = uploaded.url
        setBackgroundImageUrl(uploaded.url)
        setSelectedBackgroundFile(null)
      }

      await updateChefPortalTheme({
        tagline: tagline || null,
        portal_primary_color: primaryColor,
        portal_background_color: backgroundColor,
        portal_background_image_url: nextBackgroundImageUrl,
      })

      setSuccess('Profile updated!')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleShowcase(partnerId: string, visible: boolean) {
    try {
      await updatePartner(partnerId, { is_showcase_visible: visible })
      router.refresh()
    } catch {
      setError('Failed to update showcase visibility')
    }
  }

  async function handleCopyHubLink() {
    if (!hubUrl) return

    try {
      await navigator.clipboard.writeText(hubUrl)
      setCopiedHubLink(true)
      setTimeout(() => setCopiedHubLink(false), 1800)
    } catch {
      setError('Failed to copy hub link')
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Profile */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Public Profile</h2>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Tagline</label>
          <Textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Private chef creating unforgettable dining experiences in the mountains..."
            rows={2}
          />
          <p className="text-xs text-stone-400 mt-1">Shown below your name on the public profile</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Primary Color</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-full rounded-md border border-stone-600 bg-stone-900 px-2"
            />
            <p className="text-xs text-stone-400 mt-1">Used for call-to-action buttons and links</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Background Color
            </label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="h-10 w-full rounded-md border border-stone-600 bg-stone-900 px-2"
            />
            <p className="text-xs text-stone-400 mt-1">Used as page background color fallback</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Background Image</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            onChange={(e) => setSelectedBackgroundFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 file:mr-3 file:rounded-md file:border-0 file:bg-brand-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-400"
          />
          <p className="mt-1 text-xs text-stone-400">Upload JPEG, PNG, HEIC, or WebP (max 10MB)</p>
          {backgroundImageUrl && !selectedBackgroundFile && (
            <button
              type="button"
              className="mt-2 text-sm text-stone-400 underline hover:text-stone-200"
              onClick={() => setBackgroundImageUrl('')}
            >
              Remove current background image
            </button>
          )}
          {(selectedBackgroundFile || backgroundImageUrl) && (
            <div className="mt-3">
              <p className="text-xs text-stone-500 mb-2">Background Preview</p>
              <div
                className="h-28 w-full rounded-md border border-stone-700 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${backgroundPreviewUrl || backgroundImageUrl})`,
                }}
              />
            </div>
          )}
        </div>

        <Button onClick={handleSaveProfile} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Link-in-Bio Hub</h2>
            <p className="mt-1 text-sm text-stone-500">
              Use this compact public view for social bios, QR codes, partner referrals, and direct
              client messages.
            </p>
          </div>
          {hubUrl && (
            <a
              href={hubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-300 underline underline-offset-4 hover:text-stone-100"
            >
              Preview <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {hubUrl ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-300">
              {hubUrl}
            </div>
            <Button variant="secondary" onClick={handleCopyHubLink}>
              {copiedHubLink ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Hub Link
                </>
              )}
            </Button>
          </div>
        ) : (
          <p className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-400">
            Set a public profile URL before sharing your link-in-bio hub.
          </p>
        )}
      </Card>

      {/* Showcase Partners */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Partner Showcase</h2>
        <p className="text-sm text-stone-500">
          Toggle which partners appear on your public profile. Only active, visible partners will be
          shown.
        </p>

        {partners.length === 0 ? (
          <p className="text-sm text-stone-400 italic py-4">
            No partners yet. Add partners from the Partners page to showcase them here.
          </p>
        ) : (
          <div className="space-y-2">
            {partners.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border border-stone-700"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={p.is_showcase_visible}
                    onChange={(e) => handleToggleShowcase(p.id, e.target.checked)}
                    className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-medium text-stone-100">{p.name}</span>
                    <Badge variant="default" className="ml-2">
                      {TYPE_LABELS[p.partner_type] || p.partner_type}
                    </Badge>
                  </div>
                </div>
                {p.is_showcase_visible && (
                  <span className="text-xs text-emerald-600 font-medium">Visible</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
