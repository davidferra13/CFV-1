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
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Calendar — ChefFlow' }

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
    getWaitlistEntries('waiting'),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Calendar</h1>
          <p className="mt-1 text-sm text-stone-500">
            Your complete schedule — events, prep, personal commitments, and goals.
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="min-w-0">
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
