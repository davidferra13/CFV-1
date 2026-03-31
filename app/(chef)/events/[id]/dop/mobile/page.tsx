// DOP Mobile Page
// Full-screen, step-by-step day-of protocol view optimised for phone use.
// No app shell - renders the DopMobileView directly so the whole viewport is usable.

import { requireChef } from '@/lib/auth/get-user'
import { getEventDOPSchedule } from '@/lib/scheduling/actions'
import { getDOPManualCompletions } from '@/lib/scheduling/dop-completions'
import { createServerClient } from '@/lib/db/server'
import { notFound } from 'next/navigation'
import { DopMobileView } from '@/components/scheduling/dop-mobile-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Day-Of Protocol',
  // Prevent zoom on double-tap for touch-friendly UI
  other: {
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  },
}

interface Props {
  params: { id: string }
}

export default async function DopMobilePage({ params }: Props) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event basics for the header
  const { data: event } = await db
    .from('events')
    .select('id, occasion, serve_time, event_date')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  // Fetch computed DOP schedule and manual completions in parallel
  const [schedule, manualKeys] = await Promise.all([
    getEventDOPSchedule(params.id),
    getDOPManualCompletions(params.id).catch(() => new Set<string>()),
  ])

  if (!schedule) {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-stone-400 font-medium">No DOP schedule available.</p>
          <p className="text-sm text-stone-400 mt-1">
            Ensure the event has a date and serve time set.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DopMobileView
      eventId={params.id}
      schedule={schedule}
      manualCompletionKeys={manualKeys}
      eventTitle={event.occasion || 'Event'}
      serveTime={event.serve_time || 'TBD'}
    />
  )
}
