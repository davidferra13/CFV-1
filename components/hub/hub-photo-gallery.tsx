'use client'

import { useState, useRef, useTransition } from 'react'
import type { HubMedia } from '@/lib/hub/types'
import { createHubMedia, deleteHubMedia, getMediaUrl } from '@/lib/hub/media-actions'
import { createBrowserClient } from '@/lib/supabase/client'

interface HubPhotoGalleryProps {
  groupId: string
  media: HubMedia[]
  profileToken: string | null
  canPost: boolean
}

export function HubPhotoGallery({ groupId, media, profileToken, canPost }: HubPhotoGalleryProps) {
  const [items, setItems] = useState(media)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profileToken) return

    setUploading(true)
    try {
      const supabase = createBrowserClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${groupId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('hub-media')
        .upload(path, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const newMedia = await createHubMedia({
        groupId,
        profileToken,
        storagePath: path,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })

      setItems((prev) => [newMedia, ...prev])
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = (mediaId: string) => {
    if (!profileToken) return
    const previous = items
    setItems((prev) => prev.filter((m) => m.id !== mediaId))
    startTransition(async () => {
      try {
        await deleteHubMedia({ mediaId, profileToken })
      } catch {
        setItems(previous)
      }
    })
    setLightboxIdx(null)
    setLightboxUrl(null)
  }

  const openLightbox = async (idx: number) => {
    const item = items[idx]
    if (!item) return
    setLightboxIdx(idx)

    // Get signed URL if not cached
    if (signedUrls[item.id]) {
      setLightboxUrl(signedUrls[item.id])
    } else {
      const url = await getMediaUrl(item.storage_path)
      setSignedUrls((prev) => ({ ...prev, [item.id]: url }))
      setLightboxUrl(url)
    }
  }

  const closeLightbox = () => {
    setLightboxIdx(null)
    setLightboxUrl(null)
  }

  const getThumbnailUrl = async (item: HubMedia) => {
    if (signedUrls[item.id]) return signedUrls[item.id]
    const url = await getMediaUrl(item.storage_path)
    setSignedUrls((prev) => ({ ...prev, [item.id]: url }))
    return url
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-300">Photos ({items.length})</h3>
        {canPost && profileToken && (
          <label className="cursor-pointer rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80">
            {uploading ? 'Uploading...' : 'Add Photo'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-stone-600">
          No photos yet. Share moments from your dinners!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, idx) => (
            <PhotoThumbnail
              key={item.id}
              item={item}
              onClick={() => openLightbox(idx)}
              getUrl={getThumbnailUrl}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-stone-800 p-2 text-stone-300 hover:bg-stone-700"
          >
            &times;
          </button>

          {lightboxUrl ? (
            <img
              src={lightboxUrl}
              alt={items[lightboxIdx]?.caption ?? ''}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-stone-400">Loading...</div>
          )}

          {items[lightboxIdx]?.caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-stone-900/80 px-4 py-2 text-sm text-stone-300">
              {items[lightboxIdx].caption}
            </div>
          )}

          {profileToken && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(items[lightboxIdx!].id)
              }}
              disabled={isPending}
              className="absolute bottom-8 right-4 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Thumbnail component that lazily loads signed URL
function PhotoThumbnail({
  item,
  onClick,
  getUrl,
}: {
  item: HubMedia
  onClick: () => void
  getUrl: (item: HubMedia) => Promise<string>
}) {
  const [url, setUrl] = useState<string | null>(null)

  // Load URL on mount
  useState(() => {
    getUrl(item).then(setUrl)
  })

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-lg bg-stone-800"
    >
      {url ? (
        <img src={url} alt={item.caption ?? ''} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-stone-600">
          <span className="text-2xl">...</span>
        </div>
      )}
      {item.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-xs text-white">{item.caption}</p>
        </div>
      )}
    </button>
  )
}
