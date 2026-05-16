'use client'

// PhotoUploadPrompt - Shows on event detail page after event completion.
// Prompts the chef to upload photos from the event.
// Dismissable per session but returns until photos are uploaded.

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = {
  eventId: string
  photoCount: number
  occasion?: string | null
}

export function PhotoUploadPrompt({ eventId, photoCount, occasion }: Props) {
  const [dismissed, setDismissed] = useState(false)

  // If photos already exist, show a subtler "manage" prompt
  if (photoCount > 0) {
    return (
      <Card className="border-stone-700 bg-stone-950/70">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-stone-100">
                {photoCount} photo{photoCount !== 1 ? 's' : ''} uploaded
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Manage tags, visibility, and portfolio selections.
              </p>
            </div>
            <Link href={`/events/${eventId}/photos`}>
              <Button variant="ghost" size="sm">
                Manage Photos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (dismissed) return null

  return (
    <Card className="border-brand-800/40 bg-brand-950/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-100">
              Upload photos from {occasion || 'this event'}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Share your best shots with the client and build your portfolio. Photos tagged
              client-visible will appear in their portal automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-stone-500 hover:text-stone-300 transition"
            title="Dismiss for now"
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
        <div className="mt-4">
          <Link href={`/events/${eventId}/photos`}>
            <Button size="sm">Upload Photos</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
