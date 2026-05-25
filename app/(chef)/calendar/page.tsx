// Calendar Page - Unified Calendar
// Single calendar view that consolidates all scheduling data:
// events, prep blocks, calls, availability blocks, waitlist, calendar entries, and inquiries.
// Uses FullCalendar for month/week/day/agenda views with filtering, keyboard shortcuts,
// drag-to-reschedule, and entry creation.

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { getUnifiedCalendar } from '@/lib/calendar/actions'
import { getSchedulingRules } from '@/lib/availability/rules-actions'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { SchedulingInsightsBar } from '@/components/intelligence/scheduling-insights-bar'
import { CapacitySeasonalBar } from '@/components/intelligence/capacity-seasonal-bar'
import { DomainSignals } from '@/components/cil/domain-signals'
import Link from 'next/link'
import { db } from '@/lib/db'
import { inquiries } from '@/lib/db/schema/schema'
import { and, isNull, inArray, eq, sql } from 'drizzle-orm'

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

function CalendarSignalSkeleton() {
  return (
    <div className="mb-3 rounded-xl border border-stone-800 bg-stone-900/70 p-3">
      <div className="h-4 w-40 animate-pulse rounded bg-stone-800" />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-9 animate-pulse rounded bg-stone-800/80" />
        ))}
      </div>
    </div>
  )
}

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

  const [initialItems, rules, undatedResult] = await Promise.all([
    getUnifiedCalendar(startDate, endDate),
    getSchedulingRules(),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.tenantId, user.tenantId!),
          isNull(inquiries.confirmedDate),
          inArray(inquiries.status, ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
        )
      ),
  ])

  const undatedCount = undatedResult[0]?.count ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Calendar</h1>
          <p className="mt-1 text-sm text-stone-500">
            Your complete schedule: events, prep, calls, personal commitments, and goals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {undatedCount > 0 && (
            <Link
              href="/inquiries"
              className="shrink-0 rounded-lg bg-amber-900/30 border border-amber-800/50 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-900/50 transition-colors"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 mr-1.5 align-middle" />
              {undatedCount} undated
            </Link>
          )}
          <Link
            href="/calendar/load"
            className="shrink-0 rounded-lg border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            Operational Load
          </Link>
        </div>
      </div>

      {/* Calendar Intelligence Signals */}
      <WidgetErrorBoundary name="Calendar Signals" compact>
        <Suspense fallback={<CalendarSignalSkeleton />}>
          <DomainSignals domain="calendar" limit={3} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Scheduling Intelligence */}
      <WidgetErrorBoundary name="Scheduling Insights" compact>
        <Suspense fallback={<CalendarSignalSkeleton />}>
          <SchedulingInsightsBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Capacity & Seasonal Forecast */}
      <WidgetErrorBoundary name="Capacity & Seasonal" compact>
        <Suspense fallback={<CalendarSignalSkeleton />}>
          <CapacitySeasonalBar />
        </Suspense>
      </WidgetErrorBoundary>

      <UnifiedCalendarView
        initialItems={initialItems}
        chefId={user.tenantId!}
        blockedDaysOfWeek={rules?.blocked_days_of_week ?? []}
        preferredDaysOfWeek={rules?.preferred_days_of_week ?? []}
      />
    </div>
  )
}
