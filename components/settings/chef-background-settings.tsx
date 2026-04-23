'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { updateChefPortalTheme, uploadChefPortalBackgroundImage } from '@/lib/profile/actions'

type ChefBackgroundSettingsProps = {
  currentBackgroundColor: string | null
  currentBackgroundImageUrl: string | null
}

export function ChefBackgroundSettings({
  currentBackgroundColor,
  currentBackgroundImageUrl,
}: ChefBackgroundSettingsProps) {
  const router = useRouter()
  const [backgroundColor, setBackgroundColor] = useState(currentBackgroundColor || '#f5f5f4')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(currentBackgroundImageUrl || '')
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedBackgroundFile) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedBackgroundFile)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedBackgroundFile])

  async function handleSave() {
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
        portal_background_color: backgroundColor,
        portal_background_image_url: nextBackgroundImageUrl,
      })

      setSuccess('Public profile background saved.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save background')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Profile Background</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <p className="text-sm text-stone-500">
          Applies to your public profile and client-facing preview. The internal chef workspace keeps
          a stable shell background.
        </p>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Background Color</label>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="h-10 w-full rounded-md border border-stone-600 bg-stone-900 px-2"
          />
          <p className="mt-1 text-xs text-stone-500">
            Used as the public page fallback when no image is set.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Background Image</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            onChange={(e) => setSelectedBackgroundFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 file:mr-3 file:rounded-md file:border-0 file:bg-brand-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-400"
          />
          <p className="mt-1 text-xs text-stone-500">Upload JPEG, PNG, HEIC, or WebP (max 10MB)</p>
          {backgroundImageUrl && !selectedBackgroundFile && (
            <button
              type="button"
              onClick={() => setBackgroundImageUrl('')}
              className="mt-2 text-sm text-stone-400 underline hover:text-stone-200"
            >
              Remove current background image
            </button>
          )}
        </div>

        <div>
          <p className="text-xs text-stone-500 mb-2">Public profile preview</p>
          <div
            className="h-28 w-full rounded-md border border-stone-700 bg-cover bg-center"
            style={{
              backgroundColor,
              backgroundImage:
                previewUrl || backgroundImageUrl
                  ? `url(${previewUrl || backgroundImageUrl})`
                  : undefined,
            }}
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Public Profile Background'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
