'use client'

import type { WeekLoadSummary } from '@/lib/intelligence/operational-load'

const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function levelColor(level: string): string {
  switch (level) {
    case 'overloaded': return 'bg-red-500'
    case 'heavy': return 'bg-orange-500'
    case 'moderate': return 'bg-yellow-500'
    case 'light': return 'bg-emerald-600'
    default: return 'bg-stone-800'
  }
}

export function WeekLoadBar({ summary }: { summary: WeekLoadSummary }) {
  const maxScore = Math.max(...summary.days.map((d) => d.score), 1)
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div>
      {/* Bar chart */}
      <div className="flex items-end gap-1 h-16">
        {summary.days.map((day, i) => {
          const barHeight = Math.max((day.score / maxScore) * 64, 2)
          const isToday = day.date === todayStr

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-end h-14">
                <div
                  className={`w-full rounded-t transition-all ${levelColor(day.level)} ${
                    isToday ? 'ring-1 ring-brand-400' : ''
                  }`}
                  style={{ height: `${barHeight}px` }}
                  title={`${day.date}: ${day.score}/100 (${day.level})`}
                />
              </div>
              <span
                className={`text-[10px] mt-1 ${isToday ? 'text-brand-400 font-semibold' : 'text-stone-500'}`}
              >
                {DAY_ABBREVS[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="flex gap-3 mt-3 text-[11px] text-stone-400 flex-wrap">
        <span>
          Events: <strong className="text-stone-200">{summary.totalEvents}</strong>
        </span>
        <span>
          Components: <strong className="text-stone-200">{summary.totalComponents}</strong>
        </span>
        {summary.heaviestDay ? (
          <span>
            Peak:{' '}
            <strong className="text-stone-200">
              {new Date(summary.heaviestDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
              })}{' '}
              ({summary.heaviestDay.score})
            </strong>
          </span>
        ) : null}
      </div>
    </div>
  )
}
