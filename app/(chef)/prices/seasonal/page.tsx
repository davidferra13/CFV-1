import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getSeasonalCalendar,
  type SeasonalCalendarEntry,
} from '@/lib/pricing/seasonal-calendar-actions'

export const metadata: Metadata = { title: 'Seasonal Price Calendar' }

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function cellColor(index: number): string {
  if (index <= 0.85) return 'bg-green-500/30 text-green-300'
  if (index <= 0.95) return 'bg-green-500/15 text-green-400'
  if (index <= 1.05) return 'bg-stone-800/50 text-stone-400'
  if (index <= 1.15) return 'bg-yellow-500/15 text-yellow-400'
  if (index <= 1.25) return 'bg-orange-500/20 text-orange-400'
  return 'bg-red-500/20 text-red-400'
}

function formatIndex(index: number): string {
  const pct = Math.round((index - 1) * 100)
  if (pct === 0) return 'avg'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function IngredientDetail({
  entry,
  currentMonth,
}: {
  entry: SeasonalCalendarEntry
  currentMonth: number
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/40 px-3 py-2 text-xs text-stone-400">
      <span className="text-stone-300 font-medium">{entry.ingredientName}</span> &middot; Best:{' '}
      <span className="text-green-400">{MONTH_FULL[entry.cheapestMonth - 1]}</span> &middot; Peak:{' '}
      <span className="text-red-400">{MONTH_FULL[entry.expensiveMonth - 1]}</span> &middot; Swing:{' '}
      <span className="text-stone-300">{entry.seasonalSwingPct}%</span>
      {entry.inSeason && (
        <span className="ml-2 inline-block rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-green-400 text-xs">
          In Season
        </span>
      )}
    </div>
  )
}

export default async function SeasonalCalendarPage() {
  await requireChef()

  const data = await getSeasonalCalendar()
  const { entries, currentMonth, deals, risingPrices } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Seasonal Price Calendar</h1>
        <p className="text-stone-400 mt-1">
          Monthly price patterns for your recipe ingredients. Green cells are cheaper months, red
          cells are more expensive.
        </p>
      </div>

      {/* Best time to buy summary */}
      {(deals.length > 0 || risingPrices.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {deals.length > 0 && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-green-400 mb-2">
                This Month&apos;s Deals
              </h2>
              <div className="flex flex-wrap gap-2">
                {deals.slice(0, 10).map((d) => {
                  const idx = d.monthlyIndices[currentMonth - 1] ?? 1
                  return (
                    <span
                      key={d.ingredientId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-sm text-green-300"
                    >
                      {d.ingredientName}
                      <span className="text-xs text-green-500">{formatIndex(idx)}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {risingPrices.length > 0 && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-orange-400 mb-2">
                Prices Rising Soon
              </h2>
              <div className="flex flex-wrap gap-2">
                {risingPrices.slice(0, 10).map((d) => {
                  const idx = d.monthlyIndices[currentMonth - 1] ?? 1
                  return (
                    <span
                      key={d.ingredientId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-sm text-orange-300"
                    >
                      {d.ingredientName}
                      <span className="text-xs text-orange-500">{formatIndex(idx)}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main grid */}
      {entries.length > 0 ? (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 sticky left-0 bg-stone-900/90 z-10 min-w-[160px]">
                  Ingredient
                </th>
                {MONTH_LABELS.map((m, i) => (
                  <th
                    key={m}
                    className={`text-center px-2 py-3 min-w-[60px] ${
                      i + 1 === currentMonth
                        ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500'
                        : ''
                    }`}
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.ingredientId}
                  className="border-b border-stone-800/50 hover:bg-stone-800/30 group"
                >
                  <td className="px-4 py-2 text-stone-200 font-medium sticky left-0 bg-stone-900/90 z-10">
                    <div className="flex flex-col">
                      <span>{entry.ingredientName}</span>
                      <span className="text-xs text-stone-500">{entry.category}</span>
                    </div>
                  </td>
                  {entry.monthlyIndices.map((idx, i) => (
                    <td
                      key={i}
                      className={`text-center px-2 py-2 text-xs font-mono tabular-nums ${cellColor(idx)} ${
                        i + 1 === currentMonth ? 'ring-1 ring-blue-500/40' : ''
                      }`}
                    >
                      {formatIndex(idx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-8 text-center">
          <p className="text-stone-400">
            No seasonal data available yet. Seasonal patterns build as price observations accumulate
            over time.
          </p>
        </div>
      )}

      {/* Detail cards for each ingredient on click (static for now, expandable rows) */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-stone-500">
            Ingredient Details
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {entries.slice(0, 30).map((entry) => (
              <IngredientDetail
                key={entry.ingredientId}
                entry={entry}
                currentMonth={currentMonth}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-600 text-right">
        Data as of: {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  )
}
