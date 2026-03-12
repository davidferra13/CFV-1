'use client'

import { useCallback, useEffect } from 'react'
import type { EntityPhoto } from '@/lib/photos/photo-actions'

type Props = {
  photos: EntityPhoto[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }: Props) {
  const photo = photos[currentIndex] ?? null

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(currentIndex + 1)
    },
    [currentIndex, photos.length, onClose, onNavigate]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-zinc-300 text-sm"
        >
          Close (Esc)
        </button>

        {/* Image */}
        <img
          src={photo.url}
          alt={photo.caption || 'Photo'}
          className="max-h-[80vh] max-w-[85vw] rounded-lg object-contain"
        />

        {/* Caption */}
        {photo.caption && (
          <div className="mt-3 text-center text-white text-sm">{photo.caption}</div>
        )}

        {/* Tags */}
        {photo.tags && photo.tags.length > 0 && (
          <div className="mt-2 flex justify-center gap-1">
            {photo.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Navigation */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-[-50px] top-1/2 -translate-y-1/2 text-white hover:text-zinc-300 text-2xl"
          >
            &larr;
          </button>
        )}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-[-50px] top-1/2 -translate-y-1/2 text-white hover:text-zinc-300 text-2xl"
          >
            &rarr;
          </button>
        )}

        {/* Counter */}
        <div className="mt-2 text-center text-white/60 text-xs">
          {currentIndex + 1} of {photos.length}
        </div>
      </div>
    </div>
  )
}
