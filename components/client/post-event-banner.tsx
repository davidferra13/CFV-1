// Post-Event Review Banner
// Shown at the top of the client My Events page when a completed event
// has not yet received a review. Dismissable via sessionStorage.

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Props = {
  eventId: string
  occasion: string | null
  eventDate: string
  chefName: string
}

export function PostEventBanner({ eventId, occasion, eventDate, chefName }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const storageKey = `post-event-banner-dismissed-${eventId}`

  // Check sessionStorage on mount (avoids flash)
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      setDismissed(true)
    }
  }, [storageKey])

  if (dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, '1')
    setDismissed(true)
  }

  const displayDate = new Date(eventDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mb-8 rounded-xl border border-amber-200 bg-amber-950 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">★</div>
          <div>
            <p className="font-semibold text-stone-100">How was your dinner with {chefName}?</p>
            <p className="text-sm text-stone-400 mt-0.5">
              {occasion || 'Your event'} &mdash; {displayDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:shrink-0">
          <Link href={`/my-events/${eventId}#review`}>
            <Button variant="primary" size="sm">
              Leave a Review
            </Button>
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-stone-400 hover:text-stone-400"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
