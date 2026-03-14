'use client'

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react'
import { Camera, FileText, Film, MapPin, Pencil, Plus, Star, Trash2 } from '@/components/ui/icons'
import {
  createChefJourneyMedia,
  deleteChefJourneyMedia,
  uploadChefJourneyPhoto,
  updateChefJourneyMedia,
} from '@/lib/journey/actions'
import type { ChefJournalMediaType, ChefJourneyEntry, ChefJourneyMedia } from '@/lib/journey/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LocationMap } from '@/components/ui/location-map'
import { formatDisplayDate } from './helpers'

type MediaFormState = {
  entry_id: string
  media_type: ChefJournalMediaType
  media_url: string
  caption: string
  taken_on: string
  location_label: string
  latitude: string
  longitude: string
  is_cover: boolean
}

const MEDIA_LABELS: Record<ChefJournalMediaType, string> = {
  photo: 'Photo',
  video: 'Video',
  document: 'Document',
}

const EMPTY_FORM: MediaFormState = {
  entry_id: '',
  media_type: 'photo',
  media_url: '',
  caption: '',
  taken_on: '',
  location_label: '',
  latitude: '',
  longitude: '',
  is_cover: false,
}

function buildForm(media: ChefJourneyMedia): MediaFormState {
  return {
    entry_id: media.entry_id || '',
    media_type: media.media_type,
    media_url: media.media_url,
    caption: media.caption,
    taken_on: media.taken_on || '',
    location_label: media.location_label,
    latitude: media.latitude !== null ? String(media.latitude) : '',
    longitude: media.longitude !== null ? String(media.longitude) : '',
    is_cover: media.is_cover,
  }
}

function sortMedia(items: ChefJourneyMedia[]): ChefJourneyMedia[] {
  return [...items].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1
    const aDate = a.taken_on || ''
    const bDate = b.taken_on || ''
    const dateCompare = bDate.localeCompare(aDate)
    if (dateCompare !== 0) return dateCompare
    return b.created_at.localeCompare(a.created_at)
  })
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function MediaTypePill({ mediaType }: { mediaType: ChefJournalMediaType }) {
  if (mediaType === 'photo') {
    return (
      <Badge variant="info">
        <Camera className="w-3 h-3 mr-1" />
        Photo
      </Badge>
    )
  }
  if (mediaType === 'video') {
    return (
      <Badge variant="warning">
        <Film className="w-3 h-3 mr-1" />
        Video
      </Badge>
    )
  }
  return (
    <Badge variant="default">
      <FileText className="w-3 h-3 mr-1" />
      Document
    </Badge>
  )
}

export function JourneyMediaPanel({
  journeyId,
  initialMedia,
  entries,
  onMediaChange,
}: {
  journeyId: string
  initialMedia: ChefJourneyMedia[]
  entries: ChefJourneyEntry[]
  onMediaChange?: (media: ChefJourneyMedia[]) => void
}) {
  const [media, setMedia] = useState<ChefJourneyMedia[]>(sortMedia(initialMedia))
  const [form, setForm] = useState<MediaFormState>(EMPTY_FORM)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(initialMedia.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingMedia, setDeletingMedia] = useState<ChefJourneyMedia | null>(null)

  useEffect(() => {
    if (!selectedPhotoFile) {
      setPhotoPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedPhotoFile)
    setPhotoPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedPhotoFile])

  const entryOptions = useMemo(
    () =>
      entries
        .map((entry) => ({
          id: entry.id,
          label: `${formatDisplayDate(entry.entry_date)} - ${entry.title}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [entries]
  )

  const entryLookup = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of entryOptions) {
      map.set(option.id, option.label)
    }
    return map
  }, [entryOptions])
  const photoItems = useMemo(() => media.filter((item) => item.media_type === 'photo'), [media])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setSelectedPhotoFile(null)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const latitude = toNumberOrNull(form.latitude)
        const longitude = toNumberOrNull(form.longitude)
        let mediaUrl = form.media_url.trim()

        if (form.media_type === 'photo' && selectedPhotoFile) {
          const uploadFormData = new FormData()
          uploadFormData.set('image', selectedPhotoFile)
          uploadFormData.set('journey_id', journeyId)
          if (form.entry_id) uploadFormData.set('entry_id', form.entry_id)

          const uploaded = await uploadChefJourneyPhoto(uploadFormData)
          mediaUrl = uploaded.url
        }

        if (!mediaUrl) {
          throw new Error(
            form.media_type === 'photo'
              ? 'Provide a media URL or upload a photo'
              : 'Media URL is required'
          )
        }

        const payload = {
          entry_id: form.entry_id || null,
          media_type: form.media_type,
          media_url: mediaUrl,
          caption: form.caption,
          taken_on: form.taken_on || null,
          location_label: form.location_label,
          latitude,
          longitude,
          is_cover: form.is_cover,
        } as const

        if (editingId) {
          const result = await updateChefJourneyMedia(editingId, payload)
          setMedia((prev) => {
            const next = sortMedia(
              prev.map((item) => (item.id === result.media.id ? result.media : item))
            )
            onMediaChange?.(next)
            return next
          })
        } else {
          const result = await createChefJourneyMedia({
            journey_id: journeyId,
            ...payload,
          })
          setMedia((prev) => {
            const next = sortMedia([result.media, ...prev])
            onMediaChange?.(next)
            return next
          })
        }

        resetForm()
      } catch (mediaError) {
        setError(mediaError instanceof Error ? mediaError.message : 'Failed to save journal media')
      }
    })
  }

  const handleEdit = (item: ChefJourneyMedia) => {
    setError(null)
    setEditingId(item.id)
    setForm(buildForm(item))
    setSelectedPhotoFile(null)
    setShowForm(true)
  }

  const handleDelete = (item: ChefJourneyMedia) => {
    setDeletingMedia(item)
  }

  const handleConfirmDelete = () => {
    if (!deletingMedia) return
    const item = deletingMedia
    setDeletingMedia(null)

    setError(null)
    startTransition(async () => {
      try {
        await deleteChefJourneyMedia(item.id)
        setMedia((prev) => {
          const next = prev.filter((existing) => existing.id !== item.id)
          onMediaChange?.(next)
          return next
        })
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : 'Failed to delete journal media'
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{media.length} media memories captured</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingId(null)
            setForm(EMPTY_FORM)
            setSelectedPhotoFile(null)
            setShowForm((prev) => !prev)
          }}
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Hide Media Form' : 'Add Media'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-stone-700 rounded-lg p-4 space-y-4 bg-stone-800/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Media Type</label>
              <select
                value={form.media_type}
                onChange={(event) => {
                  const nextType = event.target.value as ChefJournalMediaType
                  setForm((prev) => ({ ...prev, media_type: nextType }))
                  if (nextType !== 'photo') {
                    setSelectedPhotoFile(null)
                  }
                }}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                {(Object.keys(MEDIA_LABELS) as ChefJournalMediaType[]).map((type) => (
                  <option key={type} value={type}>
                    {MEDIA_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Captured On"
              type="date"
              value={form.taken_on}
              onChange={(event) => setForm((prev) => ({ ...prev, taken_on: event.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Linked Entry (optional)
              </label>
              <select
                value={form.entry_id}
                onChange={(event) => setForm((prev) => ({ ...prev, entry_id: event.target.value }))}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {entryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.media_type === 'photo' && (
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Upload Photo (optional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                onChange={(event) => setSelectedPhotoFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 file:mr-3 file:rounded-md file:border-0 file:bg-brand-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-400"
              />
              <p className="mt-1 text-xs text-stone-500">
                Upload JPEG, PNG, HEIC, or WebP (max 15MB).
              </p>
              {photoPreviewUrl && (
                <div className="mt-3 rounded-lg overflow-hidden border border-stone-700 bg-stone-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreviewUrl}
                    alt="Upload preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          <Input
            label={form.media_type === 'photo' ? 'Media URL (optional if uploading)' : 'Media URL'}
            value={form.media_url}
            onChange={(event) => setForm((prev) => ({ ...prev, media_url: event.target.value }))}
            placeholder="https://..."
            helperText={
              form.media_type === 'photo' ? 'Paste a URL or upload a photo above.' : undefined
            }
          />

          <Textarea
            label="Caption"
            value={form.caption}
            onChange={(event) => setForm((prev) => ({ ...prev, caption: event.target.value }))}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Location Label"
              value={form.location_label}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location_label: event.target.value }))
              }
              placeholder="Bologna Central Market"
            />
            <Input
              label="Latitude"
              value={form.latitude}
              onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              placeholder="44.4949"
            />
            <Input
              label="Longitude"
              value={form.longitude}
              onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              placeholder="11.3426"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={form.is_cover}
              onChange={(event) => setForm((prev) => ({ ...prev, is_cover: event.target.checked }))}
              className="rounded border-stone-600"
            />
            Use as cover memory
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-950 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : editingId ? 'Update Media' : 'Add Media'}
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-stone-700 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-stone-100">Scrapbook</p>
          <span className="text-xs text-stone-500">{photoItems.length} photos</span>
        </div>
        {photoItems.length === 0 ? (
          <p className="text-sm text-stone-500">
            Add photos to build your scrapbook. This gallery shows every picture from the journal.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {photoItems.map((item) => (
              <a
                key={`scrapbook-${item.id}`}
                href={item.media_url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg overflow-hidden border border-stone-700 bg-stone-800 hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.media_url}
                  alt={item.caption || 'Scrapbook photo'}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {media.length === 0 ? (
          <div className="border border-dashed border-stone-600 rounded-lg p-8 text-center text-sm text-stone-400">
            No media yet. Add photos, videos, and source documents from the journey.
          </div>
        ) : (
          media.map((item) => (
            <div key={item.id} className="border border-stone-700 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <MediaTypePill mediaType={item.media_type} />
                    {item.is_cover && (
                      <Badge variant="success">
                        <Star className="w-3 h-3 mr-1" />
                        Cover
                      </Badge>
                    )}
                    <span className="text-xs text-stone-500">
                      {formatDisplayDate(item.taken_on)}
                    </span>
                  </div>
                  {item.entry_id && (
                    <p className="text-xs text-stone-500">
                      Linked to: {entryLookup.get(item.entry_id) || 'Entry'}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-950"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {item.media_type === 'photo' && (
                <div className="rounded-lg overflow-hidden border border-stone-700 bg-stone-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.media_url}
                    alt={item.caption || 'Journal photo'}
                    className="w-full h-56 object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {item.media_type === 'video' && (
                <video
                  controls
                  className="w-full rounded-lg border border-stone-700 bg-black/80 max-h-80"
                >
                  <source src={item.media_url} />
                </video>
              )}

              {item.media_type === 'document' && (
                <a
                  href={item.media_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700"
                >
                  <FileText className="w-4 h-4 text-stone-500" />
                  Open source document
                </a>
              )}

              {item.caption && (
                <p className="text-sm text-stone-300 whitespace-pre-wrap">{item.caption}</p>
              )}

              {(item.location_label || (item.latitude !== null && item.longitude !== null)) && (
                <div className="space-y-2">
                  {item.location_label && (
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-stone-400">
                      <MapPin className="w-3.5 h-3.5" />
                      {item.location_label}
                    </div>
                  )}
                  {item.latitude !== null && item.longitude !== null && (
                    <LocationMap lat={item.latitude} lng={item.longitude} className="h-56" />
                  )}
                </div>
              )}

              <a
                href={item.media_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs text-brand-600 hover:text-brand-400"
              >
                View original source
              </a>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={!!deletingMedia}
        title="Delete this media item?"
        description="This will remove the media item from the journal. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingMedia(null)}
      />
    </div>
  )
}
