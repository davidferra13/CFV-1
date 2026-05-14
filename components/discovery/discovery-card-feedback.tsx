'use client'

import { Heart, Pin, X } from 'lucide-react'

interface DiscoveryCardFeedbackProps {
  isPinned?: boolean
  onLove?: () => void
  onPin?: () => void
  onHide?: () => void
}

export function DiscoveryCardFeedback({
  isPinned,
  onLove,
  onPin,
  onHide,
}: DiscoveryCardFeedbackProps) {
  return (
    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 z-10">
      {onLove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onLove()
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:text-rose-400 hover:bg-black/80 transition-colors"
          aria-label="More like this"
        >
          <Heart className="h-3 w-3" />
        </button>
      )}
      {onPin && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onPin()
          }}
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-black/60 transition-colors ${
            isPinned ? 'text-amber-400' : 'text-white/70 hover:text-amber-400'
          } hover:bg-black/80`}
          aria-label={isPinned ? 'Unpin' : 'Pin to shortcuts'}
        >
          <Pin className="h-3 w-3" />
        </button>
      )}
      {onHide && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onHide()
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-colors"
          aria-label="Hide this"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
