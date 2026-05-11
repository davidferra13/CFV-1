import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientCalendarEvents } from '@/lib/calendar/client-calendar-actions'
import { CalendarClient } from './calendar-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Calendar' }

export default async function MyCalendarPage() {
  await requireClient()
  const now = new Date()
  const events = await getClientCalendarEvents(now.getMonth() + 1, now.getFullYear())

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Calendar</h1>
        <p className="text-stone-400 mt-1">Your upcoming events and deadlines at a glance.</p>
      </div>
      <CalendarClient
        initialEvents={events}
        initialMonth={now.getMonth() + 1}
        initialYear={now.getFullYear()}
      />
      <ActivityTracker eventType="page_viewed" metadata={{ event_count: events.length }} />
    </div>
  )
}
