'use client'

import { useState, useCallback, useEffect } from 'react'
import { Images, X, ChevronLeft, ChevronRight } from 'lucide-react'

type GalleryPhoto = {
  url: string
  caption?: string | null
}

type ProposalGalleryProps = {
  title?: string
  photos: GalleryPhoto[]
}

export function ProposalGallery({ title, photos }: ProposalGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % photos.length : null))
  }, [photos.length])

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + photos.length) % photos.length : null))
  }, [photos.length])

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }

    document.addEventListener('keydown', handleKey)
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [lightboxIndex, closeLightbox, goNext, goPrev])

  if (!photos || photos.length === 0) {
    return null
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <Images className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-gray-900">{title || 'Gallery'}</h2>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <button
            key={index}
            type="button"
            onClick={() => openLightbox(index)}
            className="relative group aspect-square rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors p-2"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                className="absolute left-4 z-10 text-white/70 hover:text-white transition-colors p-2"
                aria-label="Previous"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                className="absolute right-4 z-10 text-white/70 hover:text-white transition-colors p-2"
                aria-label="Next"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption || `Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {photos[lightboxIndex].caption && (
              <p className="text-center text-sm text-white/80 mt-3">
                {photos[lightboxIndex].caption}
              </p>
            )}
            {/* Counter */}
            <p className="text-center text-xs text-white/50 mt-2">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
