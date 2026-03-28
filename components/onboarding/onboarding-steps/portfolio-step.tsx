'use client'

import { useState, useRef } from 'react'

const MAX_PHOTOS = 5
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
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    setError('')

    const newPhotos: PhotoPreview[] = []
    for (const file of Array.from(files)) {
      if (photos.length + newPhotos.length >= MAX_PHOTOS) {
        setError(`Maximum ${MAX_PHOTOS} photos allowed`)
        break
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG, WebP, and HEIC images are allowed')
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`Each photo must be under ${MAX_SIZE_MB}MB`)
        continue
      }
      newPhotos.push({ file, previewUrl: URL.createObjectURL(file) })
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
    try {
      const formData = new FormData()
      for (const p of photos) {
        formData.append('photos', p.file)
      }
      onComplete({ portfolioPhotos: photos.map((p) => p.file.name), formData })
    } catch {
      setError('Failed to prepare photos. You can add them later from your profile.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Show off your best work</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload photos of your dishes, events, or plating. Clients love seeing what you do.
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

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-orange-400 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-orange-600 transition-colors"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-xs text-muted-foreground">
        Up to {MAX_PHOTOS} photos, {MAX_SIZE_MB}MB each. JPEG, PNG, or WebP.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          I'll do this later
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading}
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
