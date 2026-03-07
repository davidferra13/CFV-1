'use client'

// PortfolioGallery - Chef-facing portfolio view of all event photos.
// Grid display with event filter, lightbox preview, and caption display.
// Read-only (no upload/edit/delete - those happen on the event detail page).

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Image as ImageIcon, X, Camera } from '@/components/ui/icons'
import type { PortfolioPhoto } from '@/lib/events/photo-actions'

type Props = {
  photos: PortfolioPhoto[]
}

export function PortfolioGallery({ photos }: Props) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // Build event filter options from unique event IDs
  const eventOptions = useMemo(() => {
    const seen = new Map<string, { occasion: string | null; date: string | null; count: number }>()
    for (const p of photos) {
      const existing = seen.get(p.event_id)
      if (existing) {
        existing.count++
      } else {
        seen.set(p.event_id, {
          occasion: p.event_occasion,
          date: p.event_date,
          count: 1,
        })
      }
    }
    return Array.from(seen.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        // Sort by date descending, nulls last
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return b.date.localeCompare(a.date)
      })
  }, [photos])

  // Filtered photos based on selected event
  const filteredPhotos = useMemo(() => {
    if (!selectedEventId) return photos
    return photos.filter((p) => p.event_id === selectedEventId)
  }, [photos, selectedEventId])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (previewIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreviewIndex(null)
      if (e.key === 'ArrowLeft')
        setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : filteredPhotos.length - 1))
      if (e.key === 'ArrowRight')
        setPreviewIndex((i) => (i !== null && i < filteredPhotos.length - 1 ? i + 1 : 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewIndex, filteredPhotos.length])

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Camera className="w-12 h-12 text-stone-500 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No photos in your portfolio yet.</p>
          <p className="text-stone-500 text-xs mt-1">
            Upload photos from your event detail pages to build your portfolio.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Portfolio
            </CardTitle>
            <span className="text-sm text-stone-400 tabular-nums">
              {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
              {selectedEventId && ` (filtered)`}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Event filter bar */}
          {eventOptions.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant={selectedEventId === null ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedEventId(null)}
              >
                All Events ({photos.length})
              </Button>
              {eventOptions.map((ev) => (
                <Button
                  key={ev.id}
                  variant={selectedEventId === ev.id ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedEventId(selectedEventId === ev.id ? null : ev.id)}
                >
                  {ev.occasion || 'Untitled'} {ev.date ? `(${formatDate(ev.date)})` : ''} (
                  {ev.count})
                </Button>
              ))}
            </div>
          )}

          {/* Photo grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredPhotos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPreviewIndex(index)}
                className="group relative aspect-square bg-stone-800 rounded-lg overflow-hidden border border-stone-700 hover:border-brand-500 transition focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {photo.signedUrl ? (
                  <Image
                    src={photo.signedUrl}
                    alt={photo.caption || photo.filename_original || 'Event photo'}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover group-hover:brightness-90 transition"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-xs">
                    No preview
                  </div>
                )}

                {/* Overlay with caption on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2">
                  {photo.caption && (
                    <p className="text-white text-xs line-clamp-2">{photo.caption}</p>
                  )}
                  <p className="text-white/60 text-xs mt-0.5">
                    {photo.event_occasion || 'Event'}
                    {photo.event_date ? ` - ${formatDate(photo.event_date)}` : ''}
                  </p>
                </div>

                {/* Event badge - top-right */}
                {!selectedEventId && photo.event_occasion && (
                  <div className="absolute top-1.5 right-1.5">
                    <Badge variant="default" className="text-xs bg-black/50 border-0">
                      {photo.event_occasion}
                    </Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {previewIndex !== null && filteredPhotos[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setPreviewIndex(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-stone-900/10 hover:bg-stone-800/20 rounded-full p-2 transition z-10"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous */}
          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : filteredPhotos.length - 1))
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
            className="flex flex-col items-center max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={filteredPhotos[previewIndex].signedUrl}
              alt={
                filteredPhotos[previewIndex].caption ??
                filteredPhotos[previewIndex].filename_original ??
                'Event photo'
              }
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {filteredPhotos[previewIndex].caption && (
              <p className="mt-3 text-white/90 text-sm text-center max-w-xl px-4">
                {filteredPhotos[previewIndex].caption}
              </p>
            )}
            <p className="mt-2 text-white/50 text-xs">
              {previewIndex + 1} / {filteredPhotos.length}
              {filteredPhotos[previewIndex].event_occasion
                ? ` - ${filteredPhotos[previewIndex].event_occasion}`
                : ''}
              {filteredPhotos[previewIndex].event_date
                ? ` (${formatDate(filteredPhotos[previewIndex].event_date)})`
                : ''}
            </p>
          </div>

          {/* Next */}
          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i < filteredPhotos.length - 1 ? i + 1 : 0))
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
