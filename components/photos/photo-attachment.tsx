'use client'

import { useState, useTransition } from 'react'
import {
  addPhoto,
  deletePhoto,
  reorderPhotos,
  type EntityPhoto,
  type EntityType,
  type PhotoTag,
} from '@/lib/photos/photo-actions'
import { PhotoLightbox } from './photo-lightbox'

const ALL_TAGS: PhotoTag[] = [
  'plating',
  'setup',
  'damage',
  'inspection',
  'design',
  'before',
  'after',
]

type Props = {
  entityType: EntityType
  entityId: string
  initialPhotos: EntityPhoto[]
  editable?: boolean
  maxPhotos?: number
}

export function PhotoAttachment({
  entityType,
  entityId,
  initialPhotos,
  editable = true,
  maxPhotos,
}: Props) {
  const [photos, setPhotos] = useState<EntityPhoto[]>(initialPhotos)
  const [showAddForm, setShowAddForm] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canAddMore = !maxPhotos || photos.length < maxPhotos

  function handleAddPhoto() {
    if (!url.trim()) return
    setError(null)

    const previousPhotos = [...photos]

    startTransition(async () => {
      try {
        const result = await addPhoto(
          entityType,
          entityId,
          url.trim(),
          caption.trim() || undefined,
          selectedTags.length > 0 ? selectedTags : undefined
        )

        if (!result.success) {
          setPhotos(previousPhotos)
          setError(result.error || 'Failed to add photo')
          return
        }

        if (result.photo) {
          setPhotos((prev) => [...prev, result.photo!])
        }

        setUrl('')
        setCaption('')
        setSelectedTags([])
        setShowAddForm(false)
      } catch {
        setPhotos(previousPhotos)
        setError('Failed to add photo')
      }
    })
  }

  function handleDelete(photoId: string) {
    if (!confirm('Delete this photo?')) return
    setError(null)

    const previousPhotos = [...photos]
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))

    startTransition(async () => {
      try {
        const result = await deletePhoto(photoId)
        if (!result.success) {
          setPhotos(previousPhotos)
          setError(result.error || 'Failed to delete photo')
        }
      } catch {
        setPhotos(previousPhotos)
        setError('Failed to delete photo')
      }
    })
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const newPhotos = [...photos]
    const temp = newPhotos[index - 1]
    newPhotos[index - 1] = newPhotos[index]
    newPhotos[index] = temp
    setPhotos(newPhotos)

    startTransition(async () => {
      try {
        await reorderPhotos(
          entityType,
          entityId,
          newPhotos.map((p) => p.id)
        )
      } catch {
        // Best effort, already updated UI
      }
    })
  }

  function handleMoveDown(index: number) {
    if (index === photos.length - 1) return
    const newPhotos = [...photos]
    const temp = newPhotos[index + 1]
    newPhotos[index + 1] = newPhotos[index]
    newPhotos[index] = temp
    setPhotos(newPhotos)

    startTransition(async () => {
      try {
        await reorderPhotos(
          entityType,
          entityId,
          newPhotos.map((p) => p.id)
        )
      } catch {
        // Best effort
      }
    })
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800"
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt={photo.caption || 'Photo'}
                className="h-full w-full object-cover cursor-pointer"
                onClick={() => setLightboxIndex(index)}
              />

              {/* Caption overlay */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white truncate">
                  {photo.caption}
                </div>
              )}

              {/* Tags */}
              {photo.tags && photo.tags.length > 0 && (
                <div className="absolute top-1 left-1 flex flex-wrap gap-1">
                  {photo.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Edit controls */}
              {editable && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <button
                      onClick={() => handleMoveUp(index)}
                      className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                      title="Move up"
                    >
                      &uarr;
                    </button>
                  )}
                  {index < photos.length - 1 && (
                    <button
                      onClick={() => handleMoveDown(index)}
                      className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                      title="Move down"
                    >
                      &darr;
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="rounded bg-red-600/80 px-1.5 py-0.5 text-xs text-white hover:bg-red-600"
                    title="Delete"
                  >
                    x
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
          No photos attached
        </div>
      )}

      {/* Add Photo */}
      {editable && canAddMore && (
        <>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
            >
              + Add Photo
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Image URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe this photo..."
                  className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        selectedTags.includes(tag)
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddPhoto}
                  disabled={!url.trim() || isPending}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Photo'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setUrl('')
                    setCaption('')
                    setSelectedTags([])
                  }}
                  className="rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}
