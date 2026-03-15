/* eslint-disable @next/next/no-img-element */
'use client'

// PortfolioShowcase - Public-facing masonry grid for chef website/marketing.
// Displays public portfolio photos with caption overlays and lightbox.
// No auth required. Uses signed URLs from server.

import { useState, useEffect, useCallback } from 'react'
import type { PublicPortfolioPhoto } from '@/lib/events/photo-actions'

const PHOTO_TYPE_LABELS: Record<string, string> = {
  plating: 'Plating',
  setup: 'Setup',
  process: 'Process',
  ingredients: 'Ingredients',
  ambiance: 'Ambiance',
  team: 'Team',
  other: 'Other',
}

type Props = {
  photos: PublicPortfolioPhoto[]
  chefName?: string
}

export function PortfolioShowcase({ photos, chefName }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft')
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1))
      if (e.key === 'ArrowRight')
        setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, photos.length])

  // Distribute photos into columns for masonry layout
  const getColumns = useCallback(
    (count: number) => {
      const cols: PublicPortfolioPhoto[][] = Array.from({ length: count }, () => [])
      photos.forEach((photo, i) => {
        cols[i % count].push(photo)
      })
      return cols
    },
    [photos]
  )

  // Get flat index from column/row position
  const getFlatIndex = useCallback(
    (photo: PublicPortfolioPhoto) => {
      return photos.findIndex((p) => p.id === photo.id)
    },
    [photos]
  )

  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-400 text-sm">No portfolio photos available yet.</p>
      </div>
    )
  }

  // Use 3 columns by default, 2 on smaller screens, 1 on mobile (handled by CSS)
  const columns = getColumns(3)

  return (
    <>
      {/* Masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className="break-inside-avoid group relative cursor-pointer overflow-hidden rounded-xl"
            onClick={() => setLightboxIndex(idx)}
          >
            <img
              src={photo.signedUrl}
              alt={photo.caption ?? 'Portfolio photo'}
              className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Caption overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              {photo.caption && (
                <p className="text-white text-sm font-medium mb-1">{photo.caption}</p>
              )}
              <div className="flex items-center gap-2 text-white/70 text-xs">
                {photo.event_occasion && <span>{photo.event_occasion}</span>}
                {photo.event_date && (
                  <span>
                    {new Date(photo.event_date).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {photo.photo_type && (
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-white/80">
                    {PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white rounded-full p-2 transition"
            title="Close (Esc)"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Previous */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1))
              }}
              className="absolute left-4 text-white/80 hover:text-white rounded-full p-3 transition"
              title="Previous"
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

          {/* Image + info */}
          <div
            className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].signedUrl}
              alt={photos[lightboxIndex].caption ?? 'Portfolio photo'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            <div className="mt-4 text-center max-w-xl">
              {photos[lightboxIndex].caption && (
                <p className="text-white text-base mb-2">{photos[lightboxIndex].caption}</p>
              )}
              <div className="flex items-center justify-center gap-3 text-white/50 text-sm">
                {photos[lightboxIndex].event_occasion && (
                  <span>{photos[lightboxIndex].event_occasion}</span>
                )}
                {photos[lightboxIndex].event_date && (
                  <span>
                    {new Date(photos[lightboxIndex].event_date!).toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {chefName && <span>by {chefName}</span>}
              </div>
              <p className="mt-2 text-white/30 text-xs">
                {lightboxIndex + 1} / {photos.length}
              </p>
            </div>
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0))
              }}
              className="absolute right-4 text-white/80 hover:text-white rounded-full p-3 transition"
              title="Next"
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
        </div>
      )}
    </>
  )
}
