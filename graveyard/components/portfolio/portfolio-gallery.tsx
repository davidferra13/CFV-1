/* eslint-disable @next/next/no-img-element */
'use client'

// PortfolioGallery - Chef-facing portfolio management view.
// Shows all portfolio-flagged photos with filtering by type/event, bulk public toggle, reorder.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { updatePhotoDetails, togglePortfolio } from '@/lib/events/photo-actions'
import type { PortfolioPhoto, PhotoType } from '@/lib/events/photo-actions'

const PHOTO_TYPE_LABELS: Record<string, string> = {
  plating: 'Plating',
  setup: 'Setup',
  process: 'Process',
  ingredients: 'Ingredients',
  ambiance: 'Ambiance',
  team: 'Team',
  other: 'Other',
}

const PHOTO_TYPE_COLORS: Record<string, string> = {
  plating: 'bg-amber-600/80',
  setup: 'bg-brand-600/80',
  process: 'bg-purple-600/80',
  ingredients: 'bg-green-600/80',
  ambiance: 'bg-pink-600/80',
  team: 'bg-brand-600/80',
  other: 'bg-stone-600/80',
}

type Props = {
  initialPhotos: PortfolioPhoto[]
}

export function PortfolioGallery({ initialPhotos }: Props) {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>(initialPhotos)
  const [isPending, startTransition] = useTransition()
  const [filterType, setFilterType] = useState<PhotoType | 'all'>('all')
  const [filterEvent, setFilterEvent] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // Derive unique events for filter
  const uniqueEvents = Array.from(
    new Map(
      photos.map((p) => [
        p.event_id,
        { id: p.event_id, name: p.event_name ?? p.event_occasion ?? 'Untitled Event' },
      ])
    ).values()
  )

  // Derive unique photo types present
  const presentTypes = Array.from(
    new Set(photos.map((p) => p.photo_type).filter(Boolean))
  ) as PhotoType[]

  // Apply filters
  const filtered = photos.filter((p) => {
    if (filterType !== 'all' && p.photo_type !== filterType) return false
    if (filterEvent !== 'all' && p.event_id !== filterEvent) return false
    return true
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((p) => p.id)))
  }

  function selectNone() {
    setSelectedIds(new Set())
  }

  // Bulk toggle public/private
  function handleBulkPublicToggle(makePublic: boolean) {
    if (selectedIds.size === 0) return
    const previous = [...photos]
    setPhotos((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, is_public: makePublic } : p))
    )
    startTransition(async () => {
      try {
        const updates = Array.from(selectedIds).map((id) =>
          updatePhotoDetails(id, { is_public: makePublic })
        )
        const results = await Promise.all(updates)
        const failed = results.filter((r) => !r.success)
        if (failed.length > 0) {
          setPhotos(previous)
          toast.error(`Failed to update ${failed.length} photo(s)`)
        } else {
          toast.success(`${selectedIds.size} photo(s) set to ${makePublic ? 'public' : 'private'}`)
          setSelectedIds(new Set())
        }
      } catch {
        setPhotos(previous)
        toast.error('Failed to update photos')
      }
    })
  }

  // Remove from portfolio
  function handleRemoveFromPortfolio(photoId: string) {
    const previous = [...photos]
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    startTransition(async () => {
      try {
        const result = await togglePortfolio(photoId)
        if (!result.success) {
          setPhotos(previous)
          toast.error(result.error ?? 'Failed to remove from portfolio')
        } else {
          toast.success('Removed from portfolio')
        }
      } catch {
        setPhotos(previous)
        toast.error('Failed to remove from portfolio')
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Portfolio Photos</CardTitle>
            <span className="text-sm text-stone-400">{photos.length} photos</span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PhotoType | 'all')}
              aria-label="Filter by photo type"
              title="Filter by photo type"
              className="text-sm text-stone-300 bg-stone-800 border border-stone-700 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="all">All types</option>
              {presentTypes.map((t) => (
                <option key={t} value={t}>
                  {PHOTO_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>

            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              aria-label="Filter by event"
              title="Filter by event"
              className="text-sm text-stone-300 bg-stone-800 border border-stone-700 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="all">All events</option>
              {uniqueEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk actions */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Button variant="ghost" onClick={selectAll} className="text-xs">
                Select all ({filtered.length})
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <Button variant="ghost" onClick={selectNone} className="text-xs">
                    Clear selection
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleBulkPublicToggle(true)}
                    disabled={isPending}
                    className="text-xs"
                  >
                    Make public ({selectedIds.size})
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleBulkPublicToggle(false)}
                    disabled={isPending}
                    className="text-xs"
                  >
                    Make private ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-stone-400">
                {photos.length === 0
                  ? 'No portfolio photos yet. Star photos from your event galleries to add them here.'
                  : 'No photos match current filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`relative group flex flex-col border rounded-xl overflow-hidden bg-stone-900 transition ${
                    selectedIds.has(photo.id)
                      ? 'border-brand-500 ring-1 ring-brand-500'
                      : 'border-stone-700'
                  }`}
                >
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(idx)}
                    className="relative aspect-square bg-stone-800 focus:outline-none"
                    title="Preview full size"
                  >
                    {photo.signedUrl ? (
                      <img
                        src={photo.signedUrl}
                        alt={photo.caption ?? 'Portfolio photo'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs">
                        No preview
                      </div>
                    )}

                    {/* Checkbox overlay */}
                    <div
                      className="absolute top-1.5 left-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelect(photo.id)
                      }}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                          selectedIds.has(photo.id)
                            ? 'bg-brand-600 border-brand-600'
                            : 'border-white/50 bg-black/30 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {selectedIds.has(photo.id) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Type badge */}
                    {photo.photo_type && (
                      <span
                        className={`absolute top-1.5 right-1.5 text-xs text-white px-1.5 py-0.5 rounded ${
                          PHOTO_TYPE_COLORS[photo.photo_type] ?? 'bg-stone-600/80'
                        }`}
                      >
                        {PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type}
                      </span>
                    )}

                    {/* Public/private badge */}
                    <div className="absolute bottom-1.5 left-1.5">
                      <Badge variant={photo.is_public ? 'success' : 'default'}>
                        {photo.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </button>

                  {/* Info */}
                  <div className="p-2 flex flex-col gap-1">
                    {photo.caption && (
                      <p className="text-xs text-stone-300 line-clamp-2">{photo.caption}</p>
                    )}
                    <p className="text-xs text-stone-500 truncate">
                      {photo.event_name ?? photo.event_occasion ?? 'Event'}
                      {photo.event_date
                        ? ` - ${new Date(photo.event_date).toLocaleDateString()}`
                        : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromPortfolio(photo.id)}
                      className="text-xs text-stone-400 hover:text-red-500 transition self-start mt-1"
                      title="Remove from portfolio"
                    >
                      Remove from portfolio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {previewIndex !== null && filtered[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-stone-900/10 hover:bg-stone-800/20 rounded-full p-2 transition"
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

          {filtered.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : filtered.length - 1))
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

          <div
            className="flex flex-col items-center max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={filtered[previewIndex].signedUrl}
              alt={filtered[previewIndex].caption ?? 'Portfolio photo'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {filtered[previewIndex].caption && (
              <p className="mt-3 text-white/90 text-sm text-center max-w-xl px-4">
                {filtered[previewIndex].caption}
              </p>
            )}
            <p className="mt-2 text-white/50 text-xs">
              {previewIndex + 1} / {filtered.length}
              {(filtered[previewIndex].event_name ?? filtered[previewIndex].event_occasion)
                ? ` - ${filtered[previewIndex].event_name ?? filtered[previewIndex].event_occasion}`
                : ''}
            </p>
          </div>

          {filtered.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i < filtered.length - 1 ? i + 1 : 0))
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
