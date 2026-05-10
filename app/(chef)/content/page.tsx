// Content Pipeline Page
// Manage content creation workflow: drafts, review, scheduling, and publishing.
// Three tabs: From Events (AI drafts from completed events), From Captures (marketing thoughts), Calendar (scheduled view).

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getContentReadyEvents } from '@/lib/content/post-event-content-actions'
import { getCaptures } from '@/lib/capture/actions'
import ContentPipelinePanel from '@/components/content/content-pipeline-panel'
import CaptureToContent from '@/components/content/capture-to-content'
import ContentCalendar from '@/components/content/content-calendar'
import ContentTabs from './content-tabs'

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

async function EventsTab() {
  const events = await getContentReadyEvents()
  return <ContentPipelinePanel initialEvents={events} />
}

async function CapturesTab() {
  const captures = await getCaptures({ tag: 'marketing-thought' })
  return <CaptureToContent initialCaptures={captures} />
}

export default async function ContentPipelinePage() {
  await requireChef()
  await requirePro('marketing')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Content Pipeline</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track content from idea to published. Manage drafts, review queue, and scheduled posts.
        </p>
      </div>

      <ContentTabs
        eventsTab={
          <Suspense fallback={<ContentLoading />}>
            <EventsTab />
          </Suspense>
        }
        capturesTab={
          <Suspense fallback={<ContentLoading />}>
            <CapturesTab />
          </Suspense>
        }
        calendarTab={
          <Suspense fallback={<ContentLoading />}>
            <ContentCalendar />
          </Suspense>
        }
      />
    </div>
  )
}
