// Day View Page
// Full time-slotted view (6am–midnight) showing all calendar items for a single day.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getUnifiedCalendar } from '@/lib/calendar/actions'
import { DayViewClient } from './day-view-client'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Day View — ChefFlow' }

export default async function DayViewPage({ searchParams }: { searchParams: { date?: string } }) {
  const user = await requireChef()

  const today = new Date().toISOString().split('T')[0]
  const date = searchParams.date ?? today

  const items = await getUnifiedCalendar(date, date)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Day View</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/calendar">
            <Button variant="secondary" size="sm">
              Month
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

      <DayViewClient date={date} items={items} chefId={user.tenantId!} />
    </div>
  )
}
