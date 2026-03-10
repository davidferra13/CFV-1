// Daily Specials Calendar - schedule and manage daily specials
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getSpecialsCalendar, getRecurringSpecials } from '@/lib/commerce/daily-specials-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SpecialsCalendar } from '@/components/commerce/specials-calendar'
import { SpecialsWeekNav } from './specials-client'

export const metadata: Metadata = { title: 'Daily Specials - ChefFlow' }

function getMonday(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T12:00:00Z') : new Date()
  const day = d.getDay()
  const diff = d.getDate() - ((day + 6) % 7) // Adjust to Monday
  d.setDate(diff)
  return d.toISOString().substring(0, 10)
}

function getSunday(mondayStr: string): string {
  const d = new Date(mondayStr + 'T12:00:00Z')
  d.setDate(d.getDate() + 6)
  return d.toISOString().substring(0, 10)
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function SpecialsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  await requireChef()
  await requirePro('commerce')

  const params = await searchParams
  const weekStart = getMonday(params.week)
  const weekEnd = getSunday(weekStart)

  const [calendarSpecials, recurringSpecials] = await Promise.all([
    getSpecialsCalendar(weekStart, weekEnd),
    getRecurringSpecials(),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Daily Specials</h1>
          <p className="text-stone-400 mt-1">Plan and schedule your daily specials</p>
        </div>
      </div>

      {/* Week navigation */}
      <SpecialsWeekNav currentWeek={weekStart} />

      {/* Calendar view */}
      <SpecialsCalendar specials={calendarSpecials} weekStart={weekStart} />

      {/* Recurring specials */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Specials</CardTitle>
        </CardHeader>
        <CardContent>
          {recurringSpecials.length === 0 ? (
            <p className="text-stone-500 text-sm">
              No recurring specials. Add a special and check &quot;Repeat&quot; to make it weekly.
            </p>
          ) : (
            <div className="space-y-2">
              {recurringSpecials.map((special) => (
                <div
                  key={special.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="info">
                      {special.recurringDay != null ? DAY_NAMES[special.recurringDay] : 'Weekly'}
                    </Badge>
                    <span className="text-stone-200">{special.name}</span>
                    <Badge variant="default">{special.category}</Badge>
                  </div>
                  <span className="text-stone-300 font-medium">
                    ${(special.priceCents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
