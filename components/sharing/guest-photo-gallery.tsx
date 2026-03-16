/* eslint-disable @next/next/no-img-element, react-hooks/exhaustive-deps */
'use client'

import { useState, useEffect, useRef } from 'react'
import { uploadGuestPhoto, getEventGuestPhotos } from '@/lib/guest-photos/actions'

type Photo = {
  id: string
  guest_name: string
  url: string | null
  caption: string | null
  created_at: string
}

type Props = {
  shareToken: string
  guestName?: string
  guestToken?: string
}

export function GuestPhotoGallery({ shareToken, guestName, guestToken }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [name, setName] = useState(guestName || '')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPhotos()
  }, [shareToken])

  async function loadPhotos() {
    try {
      const data = await getEventGuestPhotos(shareToken)
      setPhotos(data)
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !name.trim()) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('shareToken', shareToken)
      formData.append('guestName', name.trim())
      formData.append('caption', caption.trim())
      formData.append('photo', file)
      if (guestToken) formData.append('guestToken', guestToken)

      await uploadGuestPhoto(formData)
      setCaption('')
      setSuccess(true)
      setShowUpload(false)
      if (fileRef.current) fileRef.current.value = ''
      await loadPhotos()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-100">
          Photos{' '}
          {photos.length > 0 && (
            <span className="text-stone-400 font-normal text-sm ml-1">({photos.length})</span>
          )}
        </h3>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="text-sm font-medium text-brand-500 hover:text-brand-400"
          >
            Share a photo
          </button>
        )}
      </div>

      {success && (
        <div className="bg-emerald-950 text-emerald-700 px-4 py-2 rounded-lg text-sm">
          Photo uploaded!
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="bg-stone-900 rounded-xl border border-stone-700 p-4 space-y-3"
        >
          {!guestName && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400"
            />
          )}

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              required
              className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-950 file:text-brand-400 hover:file:bg-brand-900"
            />
            <p className="text-xs text-stone-400 mt-1">Max 10MB. JPG, PNG, HEIC supported.</p>
          </div>

          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !name.trim()}
              className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      {/* Photo grid */}
      {loading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-2 border-stone-600 border-t-brand-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-6 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <p className="text-stone-500 text-sm">No photos shared yet. Be the first!</p>
          {!showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-400"
            >
              Upload a photo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-xl overflow-hidden bg-stone-800 group"
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo by ${photo.guest_name}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{photo.guest_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-3xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm"
            >
              Close
            </button>
            {selectedPhoto.url && (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || ''}
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
            )}
            <div className="mt-3 text-center">
              <p className="text-white font-medium">{selectedPhoto.guest_name}</p>
              {selectedPhoto.caption && (
                <p className="text-white/70 text-sm mt-1">{selectedPhoto.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
