'use client'

// EntityPhotoUpload - reusable photo upload for clients, staff, vendors, equipment, ingredients.
// Two modes: compact (circular avatar 48x48) and full (16:9 hero with replace/remove).

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { uploadEntityPhoto, removeEntityPhoto } from '@/lib/entities/photo-actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

type Props = {
  entityType: 'client' | 'staff' | 'vendor' | 'equipment' | 'ingredient' | 'partner'
  entityId: string
  currentPhotoUrl: string | null
  onPhotoChange?: (url: string | null) => void
  /** compact: circular avatar. full: 16:9 hero banner */
  compact?: boolean
  /** Label shown in the empty state */
  label?: string
}

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,image/webp'

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

export function EntityPhotoUpload({
  entityType,
  entityId,
  currentPhotoUrl,
  onPhotoChange,
  compact = false,
  label = 'Add photo',
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
        const result = await uploadEntityPhoto(entityType, entityId, formData)
        if (result.success) {
          setPhotoUrl(result.photoUrl)
          onPhotoChange?.(result.photoUrl)
          toast.success('Photo uploaded')
        } else {
          setError(result.error)
          toast.error(result.error)
        }
      } catch {
        setError('Failed to upload photo')
        toast.error('Failed to upload photo')
      }
    })

    e.target.value = ''
  }

  const handleConfirmedRemove = () => {
    setShowRemoveConfirm(false)
    setError(null)

    startTransition(async () => {
      try {
        const result = await removeEntityPhoto(entityType, entityId)
        if (result.success) {
          setPhotoUrl(null)
          onPhotoChange?.(null)
          toast.success('Photo removed')
        } else {
          setError(result.error || 'Failed to remove photo')
        }
      } catch {
        setError('Failed to remove photo')
        toast.error('Failed to remove photo')
      }
    })
  }

  // ─── Compact mode: circular avatar ────────────────────────────────────────

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
          title={photoUrl ? 'Replace photo' : label}
          className={[
            'relative overflow-hidden rounded-full transition-colors w-12 h-12 flex items-center justify-center',
            photoUrl
              ? 'group'
              : 'border-2 border-dashed border-stone-700 hover:border-amber-400 text-stone-300 hover:text-amber-500',
          ].join(' ')}
        >
          {photoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-full w-full object-cover rounded-full" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full">
                <CameraIcon className="w-4 h-4 text-white" />
              </div>
            </>
          ) : isPending ? (
            <span className="text-xs text-stone-400 animate-pulse">...</span>
          ) : (
            <CameraIcon className="w-4 h-4" />
          )}
        </button>
        {error && <p className="text-xs text-red-500 mt-1 w-12 break-words">{error}</p>}
      </div>
    )
  }

  // ─── Full mode: hero banner ───────────────────────────────────────────────

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
          style={{ aspectRatio: '16/9', maxHeight: '240px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
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
              onClick={() => setShowRemoveConfirm(true)}
              disabled={isPending}
              className="bg-stone-900 text-red-600 text-xs font-medium px-2.5 py-1.5 rounded-md shadow hover:bg-red-950 transition-colors"
            >
              Remove
            </button>
          </div>
          {isPending && (
            <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
              <span className="text-sm text-stone-400 animate-pulse">Uploading...</span>
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

  // ─── Empty state ──────────────────────────────────────────────────────────

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
        className="w-full border-2 border-dashed border-stone-700 hover:border-amber-400 hover:bg-amber-950/30 transition-colors rounded-xl flex flex-col items-center justify-center gap-2 py-6 group"
      >
        {isPending ? (
          <span className="text-sm text-stone-500 animate-pulse">Uploading...</span>
        ) : (
          <>
            <CameraIcon className="w-7 h-7 text-stone-300 group-hover:text-amber-500 transition-colors" />
            <span className="text-sm font-medium text-stone-500 group-hover:text-amber-600 transition-colors">
              {label}
            </span>
            <span className="text-xs text-stone-400">JPEG, PNG, HEIC, WebP (max 10 MB)</span>
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
