import { getThisWeekLoad } from '@/lib/intelligence/operational-load-actions'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

function levelColor(level: string): string {
  switch (level) {
    case 'overloaded': return 'bg-red-500'
    case 'heavy': return 'bg-orange-500'
    case 'moderate': return 'bg-yellow-500'
    case 'light': return 'bg-emerald-600'
    default: return 'bg-stone-800'
  }
}

const DAY_ABBREVS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export async function LoadHeatmapCard() {
  const summary = await getThisWeekLoad()

  if (summary.days.length === 0 || summary.days.every((d) => d.score === 0)) {
    return null
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const maxScore = Math.max(...summary.days.map((d) => d.score), 1)

  // Headline color
  const heavyCount = summary.days.filter(
    (d) => d.level === 'heavy' || d.level === 'overloaded'
  ).length
  const headlineColor =
    heavyCount >= 3 ? 'text-red-400' : heavyCount > 0 ? 'text-orange-400' : 'text-emerald-400'
  const headlineLabel =
    heavyCount >= 3 ? 'Red' : heavyCount > 0 ? 'Orange' : summary.totalEvents > 0 ? 'Green' : 'Clear'

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-stone-200">Weekly Load</h2>
        <Link
          href="/calendar/load"
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          Full heatmap
        </Link>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-1 h-10 mb-2">
        {summary.days.map((day, i) => {
          const barHeight = Math.max((day.score / maxScore) * 40, 2)
          const isToday = day.date === todayStr

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-end h-8">
                <div
                  className={`w-full rounded-t ${levelColor(day.level)} ${
                    isToday ? 'ring-1 ring-brand-400' : ''
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <span
                className={`text-[9px] mt-0.5 ${
                  isToday ? 'text-brand-400 font-bold' : 'text-stone-600'
                }`}
              >
                {DAY_ABBREVS[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Summary line */}
      <p className="text-xs text-stone-400">
        This week is <span className={`font-semibold ${headlineColor}`}>{headlineLabel}</span>
        {summary.totalEvents > 0 && (
          <>
            : {summary.totalEvents} event{summary.totalEvents !== 1 ? 's' : ''}
            {summary.totalComponents > 0 && <>, {summary.totalComponents} components</>}
          </>
        )}
      </p>
    </Card>
  )
}
