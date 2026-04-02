// Calendar Page (v2)
// Passes unified calendar data + waitlist to the client component.
// Two-column layout: calendar grid + seasonal palate sidebar on xl screens.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWaitlistEntries } from '@/lib/availability/actions'
import { getUnifiedCalendar } from '@/lib/calendar/actions'
import { AvailabilityCalendarClient } from './availability-calendar-client'
import { SeasonalPaleteSidebar } from '@/components/calendar/seasonal-palate-sidebar'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { Button } from '@/components/ui/button'
import { SchedulingInsightsBar } from '@/components/intelligence/scheduling-insights-bar'
import { CapacitySeasonalBar } from '@/components/intelligence/capacity-seasonal-bar'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string }
}) {
  const user = await requireChef()

  const today = new Date()
  const year = parseInt(searchParams.year ?? String(today.getFullYear()))
  const month = parseInt(searchParams.month ?? String(today.getMonth() + 1))

  const lastDay = new Date(year, month, 0).getDate()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [unifiedItems, waitlistEntries] = await Promise.all([
    getUnifiedCalendar(startDate, endDate),
    getWaitlistEntries('waiting').catch(() => []),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Calendar</h1>
          <p className="mt-1 text-sm text-stone-500">
            Your complete schedule - events, prep, personal commitments, and goals.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/calendar/day">
            <Button variant="secondary" size="sm">
              Day
            </Button>
          </Link>
          <Link href="/calendar/week">
            <Button variant="secondary" size="sm">
              Week
            </Button>
          </Link>
          <Link href="/calendar/year">
            <Button variant="secondary" size="sm">
              Year
            </Button>
          </Link>
        </div>
      </div>

      {unifiedItems.length === 0 && waitlistEntries.length === 0 && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-950">
            <svg
              className="h-7 w-7 text-brand-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-stone-100">Your calendar is empty</h2>
          <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto">
            Events, prep days, and personal commitments will appear here once you start scheduling.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/events/new">
              <Button variant="primary" size="sm">
                Create an Event
              </Button>
            </Link>
            <Link href="/inquiries/new">
              <Button variant="secondary" size="sm">
                Log an Inquiry
              </Button>
            </Link>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="min-w-0" data-tour="chef-explore-calendar">
          <AvailabilityCalendarClient
            year={year}
            month={month}
            chefId={user.tenantId!}
            unifiedItems={unifiedItems}
            waitlistEntries={waitlistEntries as any}
          />
        </div>

        <aside className="hidden xl:block">
          <SeasonalPaleteSidebar month={month} />
        </aside>
      </div>
    </div>
  )
}
