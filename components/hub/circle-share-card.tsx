'use client'

import { useEffect, useMemo, useState } from 'react'

type CircleShareCardProps = {
  group: {
    name: string
    emoji: string | null
    groupToken: string
    displayArea: string | null
    memberCount: number
  }
  onClose: () => void
}

export function CircleShareCard({ group, onClose }: CircleShareCardProps) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
    setCanShare(typeof navigator.share === 'function')
  }, [])

  const title = `${group.emoji ?? ''} ${group.name}`.trim()
  const joinUrl = `${origin || ''}/hub/join/${group.groupToken}`
  const shareDescription = useMemo(() => {
    const memberText = group.memberCount ? `${group.memberCount} people joined` : ''
    const areaText = group.displayArea ? `in ${group.displayArea}` : ''
    return (
      [memberText, areaText].filter(Boolean).join(' - ') || 'Join this dinner circle on ChefFlow'
    )
  }, [group.displayArea, group.memberCount])

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    if (typeof navigator.share !== 'function') return

    try {
      await navigator.share({
        title,
        text: shareDescription,
        url: joinUrl,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="circle-share-card-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-stone-900 p-5 text-stone-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Dinner Circle
            </p>
            <h2
              id="circle-share-card-title"
              className="mt-2 break-words text-2xl font-semibold leading-tight text-stone-50"
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-stone-800 px-3 py-1 text-sm text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-100"
            aria-label="Close share card"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Area
            </p>
            <p className="mt-1 text-sm font-medium text-stone-100">
              {group.displayArea || 'ChefFlow'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Members
            </p>
            <p className="mt-1 text-sm font-medium text-stone-100">
              {group.memberCount} people joined
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Join Link
          </p>
          <p className="mt-2 select-all break-all font-mono text-sm leading-6 text-stone-100">
            {joinUrl}
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--hub-primary,#e88f47)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          {canShare ? (
            <button
              type="button"
              onClick={shareLink}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-[var(--hub-primary,#e88f47)]/40 hover:bg-white/10"
            >
              Share
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
