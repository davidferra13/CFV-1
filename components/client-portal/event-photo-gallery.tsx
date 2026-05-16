'use client'

// ClientEventPhotoGallery - Client-facing photo gallery for completed events.
// Shows photos marked client-visible or portfolio by the chef.
// Includes lightbox preview and download capability.

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export type ClientPhoto = {
  id: string
  signedUrl: string
  caption: string | null
  photo_type: string | null
  filename_original: string
}

type Props = {
  photos: ClientPhoto[]
  occasion?: string | null
}

export function ClientEventPhotoGallery({ photos, occasion }: Props) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (previewIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreviewIndex(null)
      if (e.key === 'ArrowLeft')
        setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1))
      if (e.key === 'ArrowRight')
        setPreviewIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewIndex, photos.length])

  if (photos.length === 0) return null

  async function handleDownloadAll() {
    // Download photos individually (no zip library needed)
    for (const photo of photos) {
      const link = document.createElement('a')
      link.href = photo.signedUrl
      link.download = photo.filename_original || `photo-${photo.id}.webp`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Small delay between downloads to avoid browser blocking
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Photos from ${occasion || 'my event'}`,
          text: `Check out the photos from ${occasion || 'my event'}!`,
          url: window.location.href,
        })
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      // Fallback: copy current URL
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <>
      <Card className="border-stone-700 bg-stone-950/70">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Event Photos
              </p>
              <h3 className="mt-1 text-lg font-semibold text-stone-100">
                Your {occasion || 'event'} in pictures
              </h3>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                Share
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownloadAll}>
                Download All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPreviewIndex(index)}
                className="relative aspect-square rounded-xl overflow-hidden border border-stone-700 bg-stone-800 group focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {photo.signedUrl ? (
                  <Image
                    src={photo.signedUrl}
                    alt={photo.caption || 'Event photo'}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover group-hover:brightness-90 transition"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-xs">
                    Loading...
                  </div>
                )}
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white/90 line-clamp-2">{photo.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-stone-500">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} from your chef. Click any photo to
            view full size.
          </p>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {previewIndex !== null && photos[previewIndex] && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
          onClick={() => setPreviewIndex(null)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 rounded-full p-2 transition"
            title="Close (Esc)"
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
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1))
              }}
              className="absolute left-4 text-white/80 hover:text-white bg-black/30 rounded-full p-3 transition"
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
            className="flex flex-col items-center max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[previewIndex].signedUrl}
              alt={photos[previewIndex].caption || 'Event photo'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {photos[previewIndex].caption && (
              <p className="mt-3 text-white/90 text-sm text-center max-w-xl px-4">
                {photos[previewIndex].caption}
              </p>
            )}
            <p className="mt-2 text-white/50 text-xs">
              {previewIndex + 1} / {photos.length}
            </p>

            {/* Download single photo */}
            <a
              href={photos[previewIndex].signedUrl}
              download={
                photos[previewIndex].filename_original || `photo-${photos[previewIndex].id}.webp`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs text-white/80 transition"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </a>
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0))
              }}
              className="absolute right-4 text-white/80 hover:text-white bg-black/30 rounded-full p-3 transition"
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
