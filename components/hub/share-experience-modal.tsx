'use client'

import { useState, useTransition } from 'react'
import { createShareCard } from '@/lib/hub/share-card-actions'
import type { HubMedia } from '@/lib/hub/types'

interface ShareExperienceModalProps {
  groupId: string
  profileToken: string
  media: HubMedia[]
  hasEvent: boolean
  onClose: () => void
}

type SharePlatform = 'copy' | 'twitter' | 'facebook' | 'native'

export function ShareExperienceModal({
  groupId,
  profileToken,
  media,
  hasEvent,
  onClose,
}: ShareExperienceModalProps) {
  const [includeMenu, setIncludeMenu] = useState(true)
  const [includeChef, setIncludeChef] = useState(true)
  const [includeTheme, setIncludeTheme] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(media.length > 0)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>(
    media.slice(0, 4).map((m) => m.id)
  )

  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  function togglePhoto(id: string) {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(0, 12)
    )
  }

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createShareCard({
          groupId,
          profileToken,
          includeMenu,
          includeChef,
          includeTheme,
          includePhotos,
          selectedPhotoIds: includePhotos ? selectedPhotoIds : undefined,
        })

        if (!result.success) {
          setError(result.error ?? 'Failed to create share card')
          return
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        setShareUrl(`${origin}/experience/${result.shareToken}`)
      } catch (err) {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  async function handleShare(platform: SharePlatform) {
    if (!shareUrl) return

    const text = 'Had an amazing private chef experience!'

    switch (platform) {
      case 'copy': {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        break
      }
      case 'twitter': {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
        window.open(twitterUrl, '_blank', 'noopener,noreferrer')
        break
      }
      case 'facebook': {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        window.open(fbUrl, '_blank', 'noopener,noreferrer')
        break
      }
      case 'native': {
        if (navigator.share) {
          try {
            await navigator.share({ title: 'My Private Chef Experience', text, url: shareUrl })
          } catch {
            // User cancelled share
          }
        }
        break
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
          <h2 className="text-lg font-bold text-stone-100">Share Your Experience</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!shareUrl ? (
          <>
            {/* Content selection */}
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-stone-400">
                Choose what to include in your shareable card. No private details (names, dietary info, prices) are ever shared.
              </p>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-800 bg-stone-800/50 px-4 py-3 transition hover:border-stone-600">
                <input
                  type="checkbox"
                  checked={includeMenu}
                  onChange={() => setIncludeMenu(!includeMenu)}
                  disabled={!hasEvent}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-700 text-amber-500 focus:ring-amber-500/30"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-stone-200">Menu & Courses</span>
                  {!hasEvent && (
                    <span className="ml-2 text-xs text-stone-600">(no event linked)</span>
                  )}
                </div>
                <span className="text-lg">🍽</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-800 bg-stone-800/50 px-4 py-3 transition hover:border-stone-600">
                <input
                  type="checkbox"
                  checked={includeChef}
                  onChange={() => setIncludeChef(!includeChef)}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-700 text-amber-500 focus:ring-amber-500/30"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-stone-200">Chef Name</span>
                </div>
                <span className="text-lg">👨‍🍳</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-800 bg-stone-800/50 px-4 py-3 transition hover:border-stone-600">
                <input
                  type="checkbox"
                  checked={includeTheme}
                  onChange={() => setIncludeTheme(!includeTheme)}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-700 text-amber-500 focus:ring-amber-500/30"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-stone-200">Event Theme</span>
                </div>
                <span className="text-lg">🎨</span>
              </label>

              {media.length > 0 && (
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-800 bg-stone-800/50 px-4 py-3 transition hover:border-stone-600">
                    <input
                      type="checkbox"
                      checked={includePhotos}
                      onChange={() => setIncludePhotos(!includePhotos)}
                      className="h-4 w-4 rounded border-stone-600 bg-stone-700 text-amber-500 focus:ring-amber-500/30"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-stone-200">Photos</span>
                      <span className="ml-2 text-xs text-stone-500">
                        ({selectedPhotoIds.length} selected)
                      </span>
                    </div>
                    <span className="text-lg">📸</span>
                  </label>

                  {includePhotos && (
                    <div className="grid grid-cols-4 gap-2 px-1">
                      {media.slice(0, 12).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => togglePhoto(m.id)}
                          className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                            selectedPhotoIds.includes(m.id)
                              ? 'border-amber-500'
                              : 'border-transparent opacity-50 hover:opacity-75'
                          }`}
                        >
                          <div className="h-full w-full bg-stone-800" />
                          {selectedPhotoIds.includes(m.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-amber-500/20">
                              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Generate button */}
            <div className="border-t border-stone-800 px-5 py-4">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || (!includeMenu && !includeChef && !includeTheme && !includePhotos)}
                className="w-full rounded-xl bg-[var(--hub-primary,#e88f47)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {isPending ? 'Creating...' : 'Generate Share Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Share URL + platform buttons */}
            <div className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-stone-700 bg-stone-800 p-3">
                <p className="mb-1 text-xs text-stone-500">Your share link</p>
                <p className="break-all text-sm font-mono text-stone-200">{shareUrl}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Copy Link */}
                <button
                  type="button"
                  onClick={() => handleShare('copy')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm font-medium text-stone-200 transition hover:bg-stone-700"
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>

                {/* Twitter/X */}
                <button
                  type="button"
                  onClick={() => handleShare('twitter')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm font-medium text-stone-200 transition hover:bg-stone-700"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Post on X
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => handleShare('facebook')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm font-medium text-stone-200 transition hover:bg-stone-700"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Share
                </button>

                {/* Native Share (mobile) */}
                {canShare && (
                  <button
                    type="button"
                    onClick={() => handleShare('native')}
                    className="flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-[var(--hub-primary,#e88f47)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                    </svg>
                    Share...
                  </button>
                )}
              </div>
            </div>

            {/* Done */}
            <div className="border-t border-stone-800 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-2.5 text-sm text-stone-300 transition hover:bg-stone-700"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
