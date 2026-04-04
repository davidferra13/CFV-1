'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadChefLogo, removeChefLogo } from '@/lib/chef/profile-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogoFallback } from '@/components/ui/logo-fallback'
import { toast } from 'sonner'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/svg+xml'
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function BrandingCard({
  logoUrl,
  businessName,
  primaryColor,
}: {
  logoUrl: string | null
  businessName: string
  primaryColor?: string | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`File too large. Maximum ${MAX_SIZE_MB}MB.`)
      e.target.value = ''
      return
    }

    // Show local preview immediately
    const url = URL.createObjectURL(file)
    setPreview(url)

    const formData = new FormData()
    formData.append('logo', file)

    startTransition(async () => {
      try {
        const result = await uploadChefLogo(formData)
        toast.success('Logo updated')
        setPreview(null)
      } catch (err: any) {
        toast.error(err?.message || 'Failed to upload logo')
        setPreview(null)
      } finally {
        if (fileRef.current) fileRef.current.value = ''
      }
    })
  }

  function handleRemove() {
    const previousUrl = logoUrl
    startTransition(async () => {
      try {
        await removeChefLogo()
        toast.success('Logo removed')
        setPreview(null)
      } catch (err: any) {
        toast.error(err?.message || 'Failed to remove logo')
      }
    })
  }

  const displayUrl = preview || logoUrl

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand Logo</CardTitle>
        <p className="text-sm text-stone-400">
          Your business mark, shown on proposals, your public page, and client-facing documents.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-5">
          {/* Preview area */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center rounded-lg border border-stone-700 bg-stone-800 p-3">
              {displayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayUrl}
                  alt="Business logo"
                  className="max-h-16 max-w-[200px] object-contain"
                />
              ) : (
                <LogoFallback businessName={businessName} primaryColor={primaryColor} size="lg" />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileSelect}
                disabled={isPending}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 file:mr-3 file:rounded-md file:border-0 file:bg-brand-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-400 disabled:opacity-50"
              />
              <p className="mt-1.5 text-xs text-stone-500">
                JPEG, PNG, WebP, or SVG (max {MAX_SIZE_MB}MB). Transparent PNG or SVG works best.
              </p>
            </div>

            {logoUrl && !isPending && (
              <Button variant="ghost" size="sm" onClick={handleRemove}>
                Remove logo
              </Button>
            )}

            {isPending && <p className="text-sm text-stone-400">Uploading and optimizing...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
