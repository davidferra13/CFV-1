import { getWeekPrepPressure } from '@/lib/prep-timeline/week-pressure-actions'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

function formatMinutes(min: number): string {
  if (min === 0) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export async function PrepPressureCard() {
  const pressure = await getWeekPrepPressure()
  const { days, totalActiveMinutes, heavyDayCount } = pressure

  if (days.length === 0 || days.every((day) => day.activeMinutes === 0)) {
    return null
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const maxActiveMinutes = Math.max(...days.map((day) => day.activeMinutes), 1)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-stone-200">Prep Pressure</h2>
        <Link
          href="/culinary/prep/timeline"
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          {formatMinutes(totalActiveMinutes)} total this week
        </Link>
      </div>

      <div className="flex overflow-x-auto gap-2 sm:grid sm:grid-cols-7 sm:gap-1 sm:overflow-visible">
        {days.map((day) => {
          const isToday = day.date === todayStr
          const visibleEvents = day.events.slice(0, 4)
          const hiddenEventCount = Math.max(day.events.length - visibleEvents.length, 0)
          const barHeight = Math.max((day.activeMinutes / maxActiveMinutes) * 64, 2)

          return (
            <div key={day.date} className="min-w-[3rem] sm:min-w-0 text-center">
              <div
                className={`text-xs mb-2 ${
                  isToday ? 'text-brand-400 font-semibold' : 'text-stone-500'
                }`}
              >
                {day.dayOfWeek.slice(0, 3)}
              </div>

              <div className="h-16 flex items-end">
                {day.activeMinutes > 0 ? (
                  <div
                    className={`w-full rounded-t ${day.isHeavy ? 'bg-amber-500' : 'bg-brand-600'}`}
                    style={{ height: `${barHeight}px` }}
                  />
                ) : (
                  <div className="w-full h-0.5 bg-stone-800" />
                )}
              </div>

              <div
                className={`mt-2 text-xs ${
                  day.activeMinutes === 0 ? 'text-stone-600' : 'text-stone-400'
                }`}
              >
                {day.activeMinutes === 0 ? 'Rest' : formatMinutes(day.activeMinutes)}
              </div>

              {day.isHeavy ? <div className="text-[10px] text-amber-400">Heavy</div> : null}

              {day.events.length > 0 ? (
                <div className="mt-1 flex items-center justify-center gap-1">
                  {visibleEvents.map((event) => (
                    <span
                      key={event.id}
                      title={`${event.occasion}: ${formatMinutes(event.activeMinutes)}`}
                      className="w-1.5 h-1.5 rounded-full bg-stone-500"
                    />
                  ))}
                  {hiddenEventCount > 0 ? (
                    <span className="text-[10px] text-stone-500">+{hiddenEventCount}</span>
                  ) : null}
                </div>
              ) : (
                <div className="mt-1 h-2" />
              )}
            </div>
          )
        })}
      </div>

      {heavyDayCount > 0 ? (
        <p className="text-xs text-amber-400/80 mt-2">
          {heavyDayCount} heavy day{heavyDayCount !== 1 ? 's' : ''} this week ({'>'}4h active prep)
        </p>
      ) : null}
    </Card>
  )
}
