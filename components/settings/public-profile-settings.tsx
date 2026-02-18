// Public Profile Settings Client Component
// Handles slug editing, tagline, and showcase partner toggles
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { updateChefSlug, updateChefTagline } from '@/lib/profile/actions'
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
  currentSlug,
  currentTagline,
  partners,
}: {
  currentSlug: string | null
  currentTagline: string | null
  partners: PartnerInfo[]
}) {
  const router = useRouter()
  const [slug, setSlug] = useState(currentSlug || '')
  const [tagline, setTagline] = useState(currentTagline || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSaveProfile() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (slug && slug !== currentSlug) {
        await updateChefSlug(slug)
      }
      if (tagline !== currentTagline) {
        await updateChefTagline(tagline)
      }
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

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Profile URL */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Profile URL</h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Your public URL slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-400">/chef/</span>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="chef-david"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Lowercase letters, numbers, and hyphens only. This is your shareable public page.
          </p>
          {slug && (
            <p className="text-xs text-brand-600 mt-1">
              Preview: {typeof window !== 'undefined' ? window.location.origin : ''}/chef/{slug}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Tagline</label>
          <Textarea
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="Private chef creating unforgettable dining experiences in the mountains..."
            rows={2}
          />
          <p className="text-xs text-stone-400 mt-1">Shown below your name on the public profile</p>
        </div>

        <Button onClick={handleSaveProfile} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </Card>

      {/* Showcase Partners */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Partner Showcase</h2>
        <p className="text-sm text-stone-500">
          Toggle which partners appear on your public profile. Only active, visible partners will be shown.
        </p>

        {partners.length === 0 ? (
          <p className="text-sm text-stone-400 italic py-4">
            No partners yet. Add partners from the Partners page to showcase them here.
          </p>
        ) : (
          <div className="space-y-2">
            {partners.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border border-stone-200"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={p.is_showcase_visible}
                    onChange={e => handleToggleShowcase(p.id, e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-medium text-stone-900">{p.name}</span>
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
