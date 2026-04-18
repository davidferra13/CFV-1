'use client'

import { useState, useRef } from 'react'
import { uploadPortfolioPhotos } from '@/lib/onboarding/onboarding-actions'

const BATCH_SIZE = 10
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

type PhotoPreview = {
  file: File
  previewUrl: string
}

type PortfolioStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
}

export function PortfolioStep({ onComplete, onSkip }: PortfolioStepProps) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    setError('')

    const newPhotos: PhotoPreview[] = []
    const warnings: string[] = []

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        warnings.push(`${file.name}: unsupported format`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        warnings.push(`${file.name}: exceeds ${MAX_SIZE_MB}MB`)
        continue
      }
      newPhotos.push({ file, previewUrl: URL.createObjectURL(file) })
    }

    if (warnings.length > 0) {
      setError(
        `Skipped ${warnings.length} file(s): ${warnings.slice(0, 3).join(', ')}${warnings.length > 3 ? '...' : ''}`
      )
    }

    setPhotos((prev) => [...prev, ...newPhotos])
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
    setError('')
  }

  async function handleSubmit() {
    if (photos.length === 0) {
      onComplete({ portfolioPhotos: [] })
      return
    }

    setUploading(true)
    setError('')

    const allUrls: string[] = []
    const allSkipped: { name: string; reason: string }[] = []
    const totalBatches = Math.ceil(photos.length / BATCH_SIZE)

    try {
      for (let i = 0; i < photos.length; i += BATCH_SIZE) {
        const batch = photos.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1

        if (totalBatches > 1) {
          setUploadProgress(`Uploading batch ${batchNum} of ${totalBatches}...`)
        }

        const formData = new FormData()
        for (const p of batch) {
          formData.append('photos', p.file)
        }

        const result = await uploadPortfolioPhotos(formData)
        if (result.success) {
          allUrls.push(...result.urls)
          if (result.skipped && result.skipped.length > 0) {
            allSkipped.push(...result.skipped)
          }
        } else {
          // Batch failed entirely, but continue with remaining batches
          allSkipped.push(
            ...batch.map((p) => ({ name: p.file.name, reason: result.error || 'Upload failed' }))
          )
        }
      }

      if (allUrls.length > 0) {
        if (allSkipped.length > 0) {
          setError(
            `${allUrls.length} uploaded, ${allSkipped.length} skipped: ${allSkipped
              .slice(0, 3)
              .map((s) => s.reason)
              .join(', ')}`
          )
        }
        onComplete({ portfolioPhotos: allUrls })
      } else {
        setError('No photos could be uploaded. You can skip this step and try again later.')
      }
    } catch {
      if (allUrls.length > 0) {
        onComplete({ portfolioPhotos: allUrls })
      } else {
        setError('Upload failed. You can skip this step and try again later.')
      }
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Show off your best work</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These photos appear on your public profile and in quotes you send. Clients who see photos
          book 3x more often.
        </p>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="relative group aspect-square rounded-lg overflow-hidden border border-border"
          >
            <img
              src={photo.previewUrl}
              alt={`Portfolio photo ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove photo ${i + 1}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-orange-400 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-xs">Add photos</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        aria-label="Select portfolio photos"
        onChange={(e) => {
          handleFiles(e.target.files)
          // Reset input so re-selecting the same files triggers onChange
          if (e.target) e.target.value = ''
        }}
      />

      <p className="text-xs text-muted-foreground">
        {MAX_SIZE_MB}MB per photo. JPEG, PNG, WebP, or HEIC.
        {photos.length > 0 && ` ${photos.length} photo${photos.length === 1 ? '' : 's'} selected.`}
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onSkip}
          disabled={uploading}
          className="text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-40"
        >
          I'll do this later
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading}
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {uploading ? uploadProgress || 'Uploading...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
