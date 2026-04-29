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

function DopUnavailableMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-stone-800 flex items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <p className="text-stone-200 font-semibold">{title}</p>
        <p className="text-sm text-stone-400 mt-2">{message}</p>
      </div>
    </div>
  )
}

export default async function DopMobilePage({ params }: Props) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event basics for the header
  const { data: event } = await db
    .from('events')
    .select('id, occasion, serve_time, event_date, status')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  if (event.status === 'draft') {
    return (
      <DopUnavailableMessage
        title="Day-of protocol is not ready yet."
        message="Confirm this event before opening the mobile run mode."
      />
    )
  }

  if (event.status === 'cancelled') {
    return (
      <DopUnavailableMessage
        title="Day-of protocol is unavailable."
        message="Cancelled events cannot be opened in mobile run mode."
      />
    )
  }

  // Fetch computed DOP schedule and manual completions in parallel
  const [scheduleResult, manualKeysResult] = await Promise.allSettled([
    getEventDOPSchedule(params.id),
    getDOPManualCompletions(params.id),
  ])

  if (scheduleResult.status === 'rejected') {
    return (
      <DopUnavailableMessage
        title="DOP schedule could not be loaded."
        message="Refresh and try again before running service from this page."
      />
    )
  }

  if (manualKeysResult.status === 'rejected') {
    return (
      <DopUnavailableMessage
        title="Task completion status could not be loaded."
        message="Refresh and try again so completed DOP tasks are not shown as incomplete."
      />
    )
  }

  const schedule = scheduleResult.value
  const manualKeys = manualKeysResult.value

  if (!schedule) {
    return (
      <DopUnavailableMessage
        title="No DOP schedule available."
        message="Ensure the event has a date and serve time set."
      />
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
