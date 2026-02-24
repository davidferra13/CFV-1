'use client'

// ClientEventPhotoGallery — Read-only photo gallery for the client event portal.
// Shows dish/dinner photos uploaded by the chef.
// Returns null if there are no photos — the section disappears entirely.

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EventPhoto } from '@/lib/events/photo-actions'

type Props = {
  photos: EventPhoto[]
}

export function ClientEventPhotoGallery({ photos }: Props) {
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

  if (photos.length === 0) return null

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const prevPhoto = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1))
  const nextPhoto = () => setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0))

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dinner Photos</CardTitle>
            <span className="text-sm text-stone-500">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 mb-4">
            Photos from your dinner, shared by your chef.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(index)}
                className="group relative aspect-square rounded-lg overflow-hidden bg-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
                title={photo.caption ?? photo.filename_original ?? 'Dinner photo'}
              >
                {photo.signedUrl ? (
                  <Image
                    src={photo.signedUrl}
                    alt={photo.caption ?? photo.filename_original ?? 'Dinner photo'}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-300 text-xs">
                    Loading…
                  </div>
                )}
                {/* Caption overlay on hover */}
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-xs line-clamp-2">{photo.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-400">Tap any photo to view full size.</p>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-stone-900/10 hover:bg-stone-800/20 rounded-full p-2 transition"
            title="Close"
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

          {/* Previous */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevPhoto()
              }}
              className="absolute left-4 text-white/80 hover:text-white bg-stone-900/10 hover:bg-stone-800/20 rounded-full p-3 transition"
              title="Previous"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {photos[lightboxIndex]?.signedUrl && (
              <div className="relative w-full max-h-[80vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[lightboxIndex].signedUrl}
                  alt={
                    photos[lightboxIndex].caption ??
                    photos[lightboxIndex].filename_original ??
                    'Dinner photo'
                  }
                  className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg"
                />
              </div>
            )}
            {/* Caption */}
            {photos[lightboxIndex]?.caption && (
              <p className="mt-3 text-white/90 text-sm text-center max-w-xl px-4">
                {photos[lightboxIndex].caption}
              </p>
            )}
            {/* Counter */}
            <p className="mt-2 text-white/50 text-xs">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextPhoto()
              }}
              className="absolute right-4 text-white/80 hover:text-white bg-stone-900/10 hover:bg-stone-800/20 rounded-full p-3 transition"
              title="Next"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
