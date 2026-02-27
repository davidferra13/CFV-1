'use client'

import { useState, useRef } from 'react'
import {
  uploadClientPhoto,
  deleteClientPhoto,
  updateClientPhotoCaption,
  updateClientPhotoCategory,
} from '@/lib/clients/photo-actions'
import type { ClientPhoto } from '@/lib/clients/photo-actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'portrait', label: 'Portraits' },
  { value: 'house', label: 'House' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining', label: 'Dining' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other' },
]

const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c.value !== 'all')

export function ClientPhotoGallery({
  clientId,
  initialPhotos,
}: {
  clientId: string
  initialPhotos: ClientPhoto[]
}) {
  const [photos, setPhotos] = useState<ClientPhoto[]>(initialPhotos)
  const [filter, setFilter] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('other')
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionText, setCaptionText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = filter === 'all' ? photos : photos.filter((p) => p.category === filter)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.set('photo', file)
      formData.set('category', uploadCategory)

      const result = await uploadClientPhoto(clientId, formData)
      if (result.success) {
        setPhotos((prev) => [...prev, result.photo])
      } else {
        setError(result.error)
        break
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(photoId: string) {
    if (!confirm('Delete this photo?')) return
    const result = await deleteClientPhoto(photoId)
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      if (lightboxIndex !== null) setLightboxIndex(null)
    }
  }

  async function handleSaveCaption(photoId: string) {
    await updateClientPhotoCaption(photoId, captionText)
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption: captionText || null } : p))
    )
    setEditingCaption(null)
  }

  async function handleCategoryChange(photoId: string, newCategory: string) {
    await updateClientPhotoCategory(photoId, newCategory)
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, category: newCategory } : p)))
  }

  return (
    <div className="rounded-lg border border-stone-700 overflow-hidden">
      <div className="px-4 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
        <h3 className="font-medium text-stone-200">Photos</h3>
        <span className="text-xs text-stone-500">{photos.length} / 30</span>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto border-b border-stone-800">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFilter(cat.value)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              filter === cat.value
                ? 'bg-brand-500 text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {cat.label}
            {cat.value !== 'all' && (
              <span className="ml-1 opacity-60">
                ({photos.filter((p) => p.category === cat.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upload area */}
      <div className="px-4 py-3 border-b border-stone-800 flex items-center gap-3">
        <select
          value={uploadCategory}
          onChange={(e) => setUploadCategory(e.target.value)}
          className="text-sm border border-stone-600 rounded-lg px-2 py-1.5 bg-stone-900"
        >
          {UPLOAD_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Photos'}
        </Button>
      </div>

      {error && (
        <div className="px-4 py-2">
          <Alert variant="error" title="Upload Error">
            {error}
          </Alert>
        </div>
      )}

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center text-stone-300 text-sm">
          {photos.length === 0
            ? 'No photos yet. Upload photos of the client, their kitchen, house, dining area, or parking.'
            : `No ${filter} photos.`}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4">
          {filtered.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative rounded-lg overflow-hidden bg-stone-800 aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.signedUrl}
                alt={photo.caption || photo.filename_original}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxIndex(index)}
              />
              {/* Category badge */}
              <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                {photo.category}
              </span>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end opacity-0 group-hover:opacity-100">
                <div className="w-full p-2 flex items-center justify-between">
                  {photo.caption && (
                    <span className="text-xs text-white truncate flex-1">{photo.caption}</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(photo.id)
                    }}
                    className="text-white/80 hover:text-red-400 ml-auto p-1"
                    aria-label="Delete photo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={filtered[lightboxIndex].signedUrl}
              alt={filtered[lightboxIndex].caption || ''}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-3 flex items-center gap-3">
              {/* Caption editing */}
              {editingCaption === filtered[lightboxIndex].id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    className="flex-1 bg-stone-900/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    placeholder="Caption"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveCaption(filtered[lightboxIndex].id)}
                    className="text-sm text-green-400 hover:text-green-300"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCaption(null)}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCaption(filtered[lightboxIndex].id)
                    setCaptionText(filtered[lightboxIndex].caption || '')
                  }}
                  className="text-sm text-white/60 hover:text-white"
                >
                  {filtered[lightboxIndex].caption || 'Add caption...'}
                </button>
              )}
              {/* Category selector */}
              <select
                value={filtered[lightboxIndex].category}
                onChange={(e) => handleCategoryChange(filtered[lightboxIndex].id, e.target.value)}
                className="text-sm bg-stone-900/10 border border-white/20 rounded px-2 py-1 text-white"
              >
                {UPLOAD_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value} className="text-black">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Navigation */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white/60 hover:text-white p-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            {lightboxIndex < filtered.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white/60 hover:text-white p-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
            {/* Close */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-0 right-0 -translate-y-10 text-white/60 hover:text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
