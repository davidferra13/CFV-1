// Content Pipeline - Create social media content from completed events.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getContentReadyEvents } from '@/lib/content/post-event-content-actions'
import { ContentReadyEvents } from '@/components/marketing/content-ready-events'

export const metadata: Metadata = { title: 'Content Pipeline | ChefFlow' }

export default async function ContentPipelinePage() {
  await requireChef()

  let events: Awaited<ReturnType<typeof getContentReadyEvents>> = []
  let fetchError: string | null = null

  try {
    events = await getContentReadyEvents()
  } catch (err) {
    console.error('[ContentPipelinePage] Failed to load events:', err)
    fetchError = 'Failed to load events. Please try again.'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/marketing"
          className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          &larr; Marketing
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-2">Content Pipeline</h1>
        <p className="mt-1 text-sm text-stone-500">
          Create social media content from your completed events.
        </p>
      </div>

      {/* Events grid or error */}
      {fetchError ? (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-400">{fetchError}</p>
        </div>
      ) : (
        <ContentReadyEvents events={events} />
      )}
    </div>
  )
}
