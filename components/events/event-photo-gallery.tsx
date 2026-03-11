'use client'

// EventPhotoGallery — Chef-facing upload and management component.
// Renders a drag-and-drop upload zone plus an editable photo grid.
// All mutations call server actions; state updates optimistically.

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MOBILE_CAPTURE_IMAGE_ACCEPT } from '@/lib/uploads/mobile-capture-types'
import {
  uploadEventPhoto,
  deleteEventPhoto,
  updatePhotoCaption,
  reorderEventPhotos,
  sharePhotosWithClient,
} from '@/lib/events/photo-actions'
import type { EventPhoto } from '@/lib/events/photo-actions'

const MAX_PHOTOS = 50

// ─── Sub-component: single photo card ─────────────────────────────────────────

type PhotoCardProps = {
  photo: EventPhoto
  index: number
  total: number
  onDelete: () => void
  onCaptionSave: (caption: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onPreview: () => void
}

function PhotoCard({
  photo,
  index,
  total,
  onDelete,
  onCaptionSave,
  onMoveUp,
  onMoveDown,
  onPreview,
}: PhotoCardProps) {
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savingCaption, setSavingCaption] = useState(false)

  async function handleCaptionBlur() {
    const trimmed = caption.trim()
    if (trimmed === (photo.caption ?? '')) return
    setSavingCaption(true)
    await onCaptionSave(trimmed)
    setSavingCaption(false)
  }

  const fileSizeLabel =
    photo.size_bytes < 1024 * 1024
      ? `${Math.round(photo.size_bytes / 1024)} KB`
      : `${(photo.size_bytes / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="flex flex-col border border-stone-700 rounded-xl overflow-hidden bg-stone-900 shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail — click to preview full size */}
      <div className="relative aspect-square bg-stone-800">
        <button
          type="button"
          onClick={onPreview}
          className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 group"
          title="Preview full size"
        >
          {photo.signedUrl ? (
            <Image
              src={photo.signedUrl}
              alt={photo.caption || photo.filename_original || 'Dinner photo'}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:brightness-90 transition"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-300 text-xs">
              No preview
            </div>
          )}
          {/* "View" hint on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">View</span>
          </div>
        </button>
        {/* Reorder buttons — top-left overlay */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
            className="w-6 h-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
            className="w-6 h-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
        {/* File size badge — top-right */}
        <div className="absolute top-1.5 right-1.5">
          <span className="text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
            {fileSizeLabel}
          </span>
        </div>
      </div>

      {/* Caption & actions */}
      <div className="p-2.5 flex flex-col gap-2">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder={savingCaption ? 'Saving…' : 'Add a caption…'}
          maxLength={200}
          className="w-full text-xs text-stone-300 placeholder:text-stone-400 bg-stone-800 border border-stone-700 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs text-stone-400 truncate" title={photo.filename_original}>
            {photo.filename_original || 'photo'}
          </span>
          {confirmDelete ? (
            <div className="flex gap-1 ml-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-stone-500 hover:text-stone-300 px-1.5 py-0.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-xs text-red-600 hover:text-red-200 font-medium px-1.5 py-0.5"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Delete photo"
              className="flex-shrink-0 ml-auto text-stone-400 hover:text-red-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

type Props = {
  eventId: string
  initialPhotos: EventPhoto[]
}

export function EventPhotoGallery({ eventId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<EventPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'sent'>('idle')
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keyboard navigation for preview lightbox
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

  const canUploadMore = photos.length < MAX_PHOTOS

  // ── Upload handler (sequential to preserve display_order) ──

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setUploading(true)
      setError(null)

      const toUpload = files.slice(0, MAX_PHOTOS - photos.length)
      setUploadProgress({ current: 0, total: toUpload.length })

      for (let i = 0; i < toUpload.length; i++) {
        setUploadProgress({ current: i + 1, total: toUpload.length })
        const fd = new FormData()
        fd.append('photo', toUpload[i])
        const result = await uploadEventPhoto(eventId, fd)
        if (result.success) {
          setPhotos((prev) => [...prev, result.photo])
        } else {
          setError(result.error)
          break
        }
      }

      setUploading(false)
      setUploadProgress(null)
      // Reset file input so the same file can be re-selected if desired
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [eventId, photos.length]
  )

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      handleFiles(Array.from(e.target.files))
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'].includes(f.type)
    )
    if (files.length) handleFiles(files)
  }

  // ── Delete ──

  function handleDelete(photoId: string) {
    startTransition(async () => {
      try {
        const result = await deleteEventPhoto(photoId)
        if (result.success) {
          setPhotos((prev) => prev.filter((p) => p.id !== photoId))
          setError(null)
        } else {
          setError(result.error ?? 'Failed to delete photo')
        }
      } catch (err) {
        setError('Failed to delete photo')
        toast.error('Failed to delete photo')
      }
    })
  }

  // ── Caption save ──

  async function handleCaptionSave(photoId: string, caption: string) {
    const result = await updatePhotoCaption(photoId, caption)
    if (!result.success) {
      setError(result.error ?? 'Failed to save caption')
    }
  }

  // ── Reorder (swap adjacent) ──

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= photos.length) return

    const reordered = [...photos]
    ;[reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]]
    setPhotos(reordered)

    await reorderEventPhotos(
      eventId,
      reordered.map((p) => p.id)
    )
  }

  // ── Render ──

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-stone-100">Dinner Photos</h2>
          <div className="flex items-center gap-3">
            {photos.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                disabled={sharing}
                onClick={async () => {
                  setSharing(true)
                  try {
                    const result = await sharePhotosWithClient(eventId)
                    if (result.success) {
                      setShareStatus('sent')
                      toast.success('Photos shared with client')
                    } else {
                      toast.error(result.error ?? 'Failed to share photos')
                    }
                  } catch {
                    toast.error('Failed to share photos')
                  } finally {
                    setSharing(false)
                  }
                }}
              >
                {sharing ? 'Sending...' : shareStatus === 'sent' ? 'Shared' : 'Share with Client'}
              </Button>
            )}
            <span className="text-sm text-stone-500 tabular-nums">
              {photos.length} / {MAX_PHOTOS}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-200 text-sm text-red-200 flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              title="Dismiss error"
              className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Upload zone */}
        {canUploadMore && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer select-none ${
              isDragOver
                ? 'border-brand-500 bg-brand-950'
                : 'border-stone-600 hover:border-brand-400 hover:bg-stone-800'
            } ${uploading ? 'cursor-wait opacity-75' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={MOBILE_CAPTURE_IMAGE_ACCEPT}
              capture="environment"
              multiple
              aria-label="Upload dinner photos"
              className="sr-only"
              onChange={handleFileInputChange}
              disabled={uploading}
            />

            {uploading && uploadProgress ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-stone-300">
                  Uploading {uploadProgress.current} of {uploadProgress.total}…
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-10 h-10 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-stone-300">
                    Drag photos here, or{' '}
                    <span className="text-brand-600 underline underline-offset-2">
                      click to upload
                    </span>
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    JPEG · PNG · HEIC · WebP · up to 10 MB each · up to {MAX_PHOTOS - photos.length}{' '}
                    more
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gallery grid */}
        {photos.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-stone-400">
              No photos uploaded yet. Upload dish and dinner photos above.
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Photos will be visible to your client in their event portal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={index}
                total={photos.length}
                onDelete={() => handleDelete(photo.id)}
                onCaptionSave={(caption) => handleCaptionSave(photo.id, caption)}
                onMoveUp={() => handleMove(index, 'up')}
                onMoveDown={() => handleMove(index, 'down')}
                onPreview={() => setPreviewIndex(index)}
              />
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <p className="mt-4 text-xs text-stone-400">
            Caption changes are saved on blur. Reorder with the arrow buttons. Click any photo to
            preview.
          </p>
        )}
      </Card>

      {/* Chef preview lightbox */}
      {previewIndex !== null && photos[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setPreviewIndex(null)}
        >
          {/* Close */}
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

          {/* Previous */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1))
              }}
              className="absolute left-4 text-white/80 hover:text-white bg-stone-900/10 hover:bg-stone-800/20 rounded-full p-3 transition"
              title="Previous (←)"
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
              alt={
                photos[previewIndex].caption ??
                photos[previewIndex].filename_original ??
                'Dinner photo'
              }
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {photos[previewIndex].caption && (
              <p className="mt-3 text-white/90 text-sm text-center max-w-xl px-4">
                {photos[previewIndex].caption}
              </p>
            )}
            <p className="mt-2 text-white/50 text-xs">
              {previewIndex + 1} / {photos.length} · {photos[previewIndex].filename_original}
            </p>
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0))
              }}
              className="absolute right-4 text-white/80 hover:text-white bg-stone-900/10 hover:bg-stone-800/20 rounded-full p-3 transition"
              title="Next (→)"
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
