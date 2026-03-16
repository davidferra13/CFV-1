/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useRef, useState } from 'react'

type Props = {
  recipeId: string
  stepNumber: number
  onUpload: (file: File) => Promise<string> // Returns the uploaded photo URL
}

export function RecipePhotoUpload({ recipeId, stepNumber, onUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<{ file: File; url: string; caption: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newPreviews = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        url: URL.createObjectURL(file),
        caption: '',
      }))
    setPreviews((prev) => [...prev, ...newPreviews])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const updateCaption = (index: number, caption: string) => {
    setPreviews((prev) => prev.map((p, i) => (i === index ? { ...p, caption } : p)))
  }

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleUploadAll = async () => {
    if (previews.length === 0) return
    setUploading(true)
    try {
      for (const preview of previews) {
        await onUpload(preview.file)
      }
      // Clean up object URLs
      previews.forEach((p) => URL.revokeObjectURL(p.url))
      setPreviews([])
    } catch (err) {
      console.error('[recipe-photo-upload] Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center
          cursor-pointer transition-colors
          ${dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
        `}
      >
        <svg
          className="mb-2 h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 16v-8m0 0l-3 3m3-3l3 3M6.75 19.25h10.5a2 2 0 002-2V6.75a2 2 0 00-2-2H6.75a2 2 0 00-2 2v10.5a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-gray-600">
          Drop photos here or <span className="text-orange-600 font-medium">browse</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Step {stepNumber} photos</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview thumbnails */}
      {previews.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.map((preview, index) => (
              <div key={preview.url} className="relative rounded-lg border bg-white p-2">
                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="h-24 w-full rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePreview(index)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  x
                </button>
                <input
                  type="text"
                  value={preview.caption}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  placeholder="Caption (optional)"
                  className="mt-1.5 w-full rounded border px-2 py-1 text-xs"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleUploadAll}
            disabled={uploading}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {uploading
              ? 'Uploading...'
              : `Upload ${previews.length} photo${previews.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  )
}
