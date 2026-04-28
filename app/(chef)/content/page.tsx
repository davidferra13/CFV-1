// Content Pipeline Page
// Manage content creation workflow: drafts, review, scheduling, and publishing.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getContentReadyEvents } from '@/lib/content/post-event-content-actions'
import ContentPipelinePanel from '@/components/content/content-pipeline-panel'

export const metadata: Metadata = { title: 'Content Pipeline' }

function ContentLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-lg bg-stone-800 animate-pulse" />
      ))}
    </div>
  )
}

export default async function ContentPipelinePage() {
  await requireChef()
  let events: Awaited<ReturnType<typeof getContentReadyEvents>> = []
  let fetchError: string | null = null

  try {
    events = await getContentReadyEvents()
  } catch (err) {
    console.error('[ContentPipelinePage] Failed to load content-ready events:', err)
    fetchError = 'Failed to load content-ready events. Please try again.'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Content Pipeline</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track content from idea to published. Manage drafts, review queue, and posted content.
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-300">{fetchError}</p>
        </div>
      ) : (
        <Suspense fallback={<ContentLoading />}>
          <ContentPipelinePanel initialEvents={events} />
        </Suspense>
      )}
    </div>
  )
}
