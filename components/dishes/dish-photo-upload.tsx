'use client'

// DishPhotoUpload — single hero photo upload for a recipe or a dish.
//
// Two modes:
//   compact (default false) — full-width hero for the recipe detail page.
//     Shows a dashed "Add photo" nudge when empty; image with hover controls when filled.
//   compact=true — small 64×64 thumbnail for the menu doc editor.
//     Shows a camera icon when empty; thumbnail with hover-replace overlay when filled.

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  uploadRecipePhoto,
  removeRecipePhoto,
  uploadDishPhoto,
  removeDishPhoto,
} from '@/lib/dishes/photo-actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// ─── Camera icon (inline — no external icon dependency) ──────────────────────

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.04l-.821 1.316Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
      />
    </svg>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  entityType: 'recipe' | 'dish'
  entityId: string
  currentPhotoUrl: string | null
  /** Called after successful upload or removal so parent can update local state */
  onPhotoChange?: (url: string | null) => void
  /** compact=true: 64×64 thumbnail for menu dish rows */
  compact?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,image/webp'

// ─── Component ───────────────────────────────────────────────────────────────

export function DishPhotoUpload({
  entityType,
  entityId,
  currentPhotoUrl,
  onPhotoChange,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const formData = new FormData()
    formData.append('photo', file)

    startTransition(async () => {
      try {
        const result =
          entityType === 'recipe'
            ? await uploadRecipePhoto(entityId, formData)
            : await uploadDishPhoto(entityId, formData)

        if (result.success) {
          setPhotoUrl(result.photoUrl)
          onPhotoChange?.(result.photoUrl)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Failed to upload photo')
        toast.error('Failed to upload photo')
      }
    })

    // Reset so the same file can be re-selected after removal
    e.target.value = ''
  }

  const handleRemove = () => {
    setShowRemoveConfirm(true)
  }

  const handleConfirmedRemove = () => {
    setShowRemoveConfirm(false)
    setError(null)

    startTransition(async () => {
      try {
        const result =
          entityType === 'recipe'
            ? await removeRecipePhoto(entityId)
            : await removeDishPhoto(entityId)

        if (result.success) {
          setPhotoUrl(null)
          onPhotoChange?.(null)
        } else {
          setError(result.error || 'Failed to remove photo')
        }
      } catch (err) {
        setError('Failed to remove photo')
        toast.error('Failed to remove photo')
      }
    })
  }

  // ─── Compact mode — menu doc editor ────────────────────────────────────────

  if (compact) {
    return (
      <div className="flex-shrink-0">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          title={photoUrl ? 'Replace dish photo' : 'Add dish photo'}
          className={[
            'relative overflow-hidden rounded-lg transition-colors w-16 h-16 flex items-center justify-center',
            photoUrl
              ? 'group'
              : 'border-2 border-dashed border-stone-700 hover:border-amber-400 text-stone-300 hover:text-amber-500',
          ].join(' ')}
        >
          {photoUrl ? (
            <>
              <Image src={photoUrl} alt="Dish" fill className="object-cover" sizes="64px" />
              {/* Replace overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <CameraIcon className="w-5 h-5 text-white" />
              </div>
            </>
          ) : isPending ? (
            <span className="text-xs text-stone-400 animate-pulse">…</span>
          ) : (
            <CameraIcon className="w-5 h-5" />
          )}
        </button>
        {error && <p className="text-xs text-red-500 mt-1 w-16 break-words">{error}</p>}
      </div>
    )
  }

  // ─── Full mode — recipe detail page ────────────────────────────────────────

  if (photoUrl) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className="relative w-full rounded-xl overflow-hidden bg-stone-800 group"
          style={{ aspectRatio: '16/9', maxHeight: '320px' }}
        >
          <Image
            src={photoUrl}
            alt="Dish photo"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
          />
          {/* Hover controls */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="bg-stone-900 text-stone-100 text-xs font-medium px-2.5 py-1.5 rounded-md shadow hover:bg-stone-800 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="bg-stone-900 text-red-600 text-xs font-medium px-2.5 py-1.5 rounded-md shadow hover:bg-red-950 transition-colors"
            >
              Remove
            </button>
          </div>
          {isPending && (
            <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
              <span className="text-sm text-stone-400 animate-pulse">Uploading…</span>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <ConfirmModal
          open={showRemoveConfirm}
          title="Remove this photo?"
          description="This cannot be undone."
          confirmLabel="Remove"
          variant="danger"
          loading={isPending}
          onConfirm={handleConfirmedRemove}
          onCancel={() => setShowRemoveConfirm(false)}
        />
      </div>
    )
  }

  // No photo yet — full prompt
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="w-full border-2 border-dashed border-stone-700 hover:border-amber-400 hover:bg-amber-950/30 transition-colors rounded-xl flex flex-col items-center justify-center gap-2 py-8 group"
      >
        {isPending ? (
          <span className="text-sm text-stone-500 animate-pulse">Uploading…</span>
        ) : (
          <>
            <CameraIcon className="w-8 h-8 text-stone-300 group-hover:text-amber-500 transition-colors" />
            <span className="text-sm font-medium text-stone-500 group-hover:text-amber-600 transition-colors">
              Add a photo of this dish
            </span>
            <span className="text-xs text-stone-400">JPEG · PNG · HEIC · WebP · max 10 MB</span>
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
