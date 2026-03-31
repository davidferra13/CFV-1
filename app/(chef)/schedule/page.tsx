// Schedule Page - Google Calendar-style view
// Month, week, day, and list views with event interaction.
// Seasonal sidebar shows active palette context (sensory anchor, micro-windows, energy reality).

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { getCalendarEvents } from '@/lib/scheduling/actions'
import { getActivePalette, getSeasonalPalettes } from '@/lib/seasonal/actions'
import { SeasonalSidebar } from '@/components/seasonal/seasonal-sidebar'

export const metadata: Metadata = { title: 'Schedule' }

const CalendarView = dynamic(
  () => import('@/components/scheduling/calendar-view').then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export default async function SchedulePage() {
  await requireChef()

  // Pre-fetch current month range for SSR
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  // Extend to cover full calendar grid (prev/next month days)
  start.setDate(start.getDate() - 7)
  end.setDate(end.getDate() + 7)

  const rangeStart = start.toISOString().split('T')[0]
  const rangeEnd = end.toISOString().split('T')[0]

  const [initialEvents, palette, palettes] = await Promise.all([
    getCalendarEvents(rangeStart, rangeEnd),
    getActivePalette(),
    getSeasonalPalettes(),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Schedule</h1>
        <p className="text-stone-500 mt-1">Your events at a glance. Click any event for details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <CalendarView initialEvents={initialEvents} palettes={palettes} />
        {palette && <SeasonalSidebar palette={palette} />}
      </div>
    </div>
  )
}
