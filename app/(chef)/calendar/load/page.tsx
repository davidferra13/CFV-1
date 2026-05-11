import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { calculateMonthLoad, calculateWeekLoad, buildWeekSummary } from '@/lib/intelligence/operational-load'
import { LoadHeatmapCalendar } from '@/components/intelligence/load-heatmap-calendar'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Operational Load Heatmap' }

export default async function OperationalLoadPage() {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Compute current week start (Monday)
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  const weekStart = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-')

  // Pre-fetch month data and this week summary in parallel
  const [monthDays, weekDays] = await Promise.all([
    calculateMonthLoad(tenantId, currentMonth, currentYear),
    calculateWeekLoad(tenantId, weekStart),
  ])

  const weekSummary = buildWeekSummary(weekDays)

  // Headline stat
  const heavyCount = monthDays.filter(
    (d) => d.level === 'heavy' || d.level === 'overloaded'
  ).length
  const totalEvents = monthDays.reduce((s, d) => s + d.breakdown.events, 0)
  const totalComponents = monthDays.reduce((s, d) => s + d.breakdown.components, 0)

  // Week headline
  const weekHeavy = weekDays.filter((d) => d.level === 'heavy' || d.level === 'overloaded').length
  const weekEvents = weekDays.reduce((s, d) => s + d.breakdown.events, 0)
  const weekComponents = weekDays.reduce((s, d) => s + d.breakdown.components, 0)

  // Build headline text
  let headline = ''
  if (weekHeavy > 0) {
    const color = weekHeavy >= 3 ? 'red' : 'orange'
    headline = `This week is ${color}: ${weekEvents} event${weekEvents !== 1 ? 's' : ''}, ${weekHeavy} heavy day${weekHeavy !== 1 ? 's' : ''}, ${weekComponents} components.`
  } else if (weekEvents > 0) {
    headline = `This week is green: ${weekEvents} event${weekEvents !== 1 ? 's' : ''}, ${weekComponents} components. Looking manageable.`
  } else {
    headline = 'This week is clear. No scheduled events.'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/calendar"
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            Calendar
          </Link>
          <span className="text-stone-600">/</span>
          <span className="text-xs text-stone-400">Operational Load</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-100">Operational Load</h1>
        <p className="mt-1 text-sm text-stone-400">{headline}</p>
      </div>

      <LoadHeatmapCalendar
        initialDays={monthDays}
        initialMonth={currentMonth}
        initialYear={currentYear}
        initialWeekSummary={weekSummary}
      />
    </div>
  )
}
