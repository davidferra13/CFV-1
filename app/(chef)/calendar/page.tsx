// Calendar Page - Unified Calendar
// Single calendar view that consolidates all scheduling data:
// events, prep blocks, calls, availability blocks, waitlist, calendar entries, and inquiries.
// Uses FullCalendar for month/week/day/agenda views with filtering, keyboard shortcuts,
// drag-to-reschedule, and entry creation.

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { getUnifiedCalendar } from '@/lib/calendar/actions'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { SchedulingInsightsBar } from '@/components/intelligence/scheduling-insights-bar'
import { CapacitySeasonalBar } from '@/components/intelligence/capacity-seasonal-bar'
import { captureCalendarContextSnapshot } from '@/lib/context-snapshots/service'

export const metadata: Metadata = { title: 'Calendar' }

// Dynamic import: FullCalendar must be client-only (no SSR)
const UnifiedCalendarView = dynamic(
  () => import('./unified-calendar-client').then((m) => m.UnifiedCalendarClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export default async function CalendarPage() {
  const user = await requireChef()

  // Pre-fetch current month range for initial render
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  // Extend range to cover full calendar grid (prev/next month days)
  const startExt = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7)
  const endExt = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 7)

  const pad = (n: number) => String(n).padStart(2, '0')
  const toLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const startDate = toLocalISO(startExt)
  const endDate = toLocalISO(endExt)

  const initialItems = await getUnifiedCalendar(startDate, endDate)
  await captureCalendarContextSnapshot({
    tenantId: user.tenantId!,
    rangeStart: startDate,
    rangeEnd: endDate,
    items: initialItems,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-100">Calendar</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your complete schedule: events, prep, calls, personal commitments, and goals.
        </p>
      </div>

      {/* Scheduling Intelligence */}
      <WidgetErrorBoundary name="Scheduling Insights" compact>
        <Suspense fallback={null}>
          <SchedulingInsightsBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Capacity & Seasonal Forecast */}
      <WidgetErrorBoundary name="Capacity & Seasonal" compact>
        <Suspense fallback={null}>
          <CapacitySeasonalBar />
        </Suspense>
      </WidgetErrorBoundary>

      <UnifiedCalendarView initialItems={initialItems} chefId={user.tenantId!} />
    </div>
  )
}
