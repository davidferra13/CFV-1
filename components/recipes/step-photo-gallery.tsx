/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { showUndoToast } from '@/components/ui/undo-toast'
import { deleteRecipeStepPhoto, reorderStepPhotos } from '@/lib/recipes/recipe-photo-actions'
import type { RecipeStepPhoto } from '@/lib/recipes/recipe-photo-actions'

type Props = {
  recipeId: string
  stepNumber: number
  photos: RecipeStepPhoto[]
}

export function StepPhotoGallery({ recipeId, stepNumber, photos: initialPhotos }: Props) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = useCallback(
    (photoId: string) => {
      if (confirmDelete !== photoId) {
        setConfirmDelete(photoId)
        return
      }
      const previous = photos
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      setConfirmDelete(null)

      showUndoToast({
        message: 'Photo deleted',
        duration: 8000,
        onExecute: async () => {
          try {
            await deleteRecipeStepPhoto(photoId)
          } catch (err) {
            console.error('[step-photo-gallery] Delete failed:', err)
            setPhotos(previous)
            toast.error('Failed to delete photo')
          }
        },
        onUndo: () => {
          setPhotos(previous)
        },
      })
    },
    [confirmDelete, photos]
  )

  const movePhoto = useCallback(
    (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= photos.length) return

      const reordered = [...photos]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(targetIndex, 0, moved)
      const previous = photos
      setPhotos(reordered)

      startTransition(async () => {
        try {
          await reorderStepPhotos(
            recipeId,
            stepNumber,
            reordered.map((p) => p.id)
          )
        } catch (err) {
          console.error('[step-photo-gallery] Reorder failed:', err)
          setPhotos(previous)
        }
      })
    },
    [photos, recipeId, stepNumber]
  )

  if (photos.length === 0) {
    return <p className="text-sm text-gray-400 italic">No photos for this step yet.</p>
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="group relative overflow-hidden rounded-lg border bg-white">
            <button type="button" onClick={() => setSelectedIndex(index)} className="block w-full">
              <img
                src={photo.photo_url}
                alt={photo.caption || `Step ${stepNumber} photo ${index + 1}`}
                className="h-32 w-full object-cover"
              />
            </button>
            {photo.caption && (
              <p className="px-2 py-1 text-xs text-gray-600 truncate">{photo.caption}</p>
            )}
            {/* Controls overlay */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => movePhoto(index, -1)}
                  disabled={index === 0 || isPending}
                  className="rounded px-1.5 py-0.5 text-xs text-white hover:bg-white/20 disabled:opacity-30"
                  aria-label="Move left"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={() => movePhoto(index, 1)}
                  disabled={index === photos.length - 1 || isPending}
                  className="rounded px-1.5 py-0.5 text-xs text-white hover:bg-white/20 disabled:opacity-30"
                  aria-label="Move right"
                >
                  &rarr;
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                className={`rounded px-1.5 py-0.5 text-xs ${
                  confirmDelete === photo.id
                    ? 'bg-red-600 text-white'
                    : 'text-white hover:bg-white/20'
                }`}
                aria-label={confirmDelete === photo.id ? 'Confirm delete' : 'Delete photo'}
              >
                {confirmDelete === photo.id ? 'Confirm?' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox modal */}
      {selectedIndex !== null && photos[selectedIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedIndex(null)
            if (e.key === 'ArrowLeft' && selectedIndex > 0) setSelectedIndex(selectedIndex - 1)
            if (e.key === 'ArrowRight' && selectedIndex < photos.length - 1)
              setSelectedIndex(selectedIndex + 1)
          }}
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[selectedIndex].photo_url}
              alt={photos[selectedIndex].caption || `Step ${stepNumber} photo`}
              className="max-h-[85vh] rounded-lg object-contain"
            />
            {photos[selectedIndex].caption && (
              <p className="mt-2 text-center text-sm text-white">{photos[selectedIndex].caption}</p>
            )}
            {/* Nav buttons */}
            {selectedIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIndex(selectedIndex - 1)
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                aria-label="Previous photo"
              >
                &larr;
              </button>
            )}
            {selectedIndex < photos.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIndex(selectedIndex + 1)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                aria-label="Next photo"
              >
                &rarr;
              </button>
            )}
            {/* Close */}
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-800 shadow hover:bg-gray-100"
              aria-label="Close"
            >
              x
            </button>
          </div>
        </div>
      )}
    </>
  )
}
