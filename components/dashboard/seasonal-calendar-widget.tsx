import Link from 'next/link'
import { getWhatsInSeason } from '@/lib/openclaw/reference-library-actions'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'

const MONTH_NAMES = [
  '',
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

const MONTH_NAMES_FULL = [
  '',
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

function formatWindow(peakMonths: number[]): string {
  if (!peakMonths.length) return ''
  const sorted = [...peakMonths].sort((a, b) => a - b)
  return `${MONTH_NAMES[sorted[0]]} - ${MONTH_NAMES[sorted[sorted.length - 1]]}`
}

export async function SeasonalCalendarWidget() {
  const currentMonth = new Date().getMonth() + 1
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

  let peaking: Awaited<ReturnType<typeof getWhatsInSeason>> = []
  let ending: typeof peaking = []
  let coming: typeof peaking = []

  try {
    const [peakNow, peakNext] = await Promise.all([
      getWhatsInSeason(currentMonth),
      getWhatsInSeason(nextMonth),
    ])

    // Peaking now: in this month's peak
    // Last chance: peaks this month but NOT next
    // Coming next: peaks next month but NOT this
    const nextSet = new Set(peakNext.map((i) => i.ingredientName))
    const nowSet = new Set(peakNow.map((i) => i.ingredientName))

    for (const item of peakNow) {
      if (!nextSet.has(item.ingredientName)) {
        ending.push(item)
      } else {
        peaking.push(item)
      }
    }
    for (const item of peakNext) {
      if (!nowSet.has(item.ingredientName)) {
        coming.push(item)
      }
    }
  } catch {
    return (
      <WidgetCardShell
        widgetId="seasonal_calendar"
        title="Seasonal Calendar"
        size="lg"
        href="/culinary/seasonal-calendar"
      >
        <p className="text-xs text-stone-500">Could not load seasonal data</p>
      </WidgetCardShell>
    )
  }

  const total = peaking.length + ending.length + coming.length

  if (total === 0) {
    return (
      <WidgetCardShell
        widgetId="seasonal_calendar"
        title="Seasonal Calendar"
        size="lg"
        href="/culinary/seasonal-calendar"
      >
        <p className="text-xs text-stone-500">No seasonal data yet. Accumulating price history.</p>
      </WidgetCardShell>
    )
  }

  // Show top items from each bucket
  const SHOW_MAX = 4

  return (
    <WidgetCardShell
      widgetId="seasonal_calendar"
      title="Seasonal Calendar"
      size="lg"
      href="/culinary/seasonal-calendar"
    >
      <div className="space-y-3">
        {/* Summary strip */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-stone-100">
            {MONTH_NAMES_FULL[currentMonth]}
          </span>
          <div className="flex gap-2 text-xs">
            {peaking.length > 0 && (
              <span className="rounded-md bg-emerald-900/40 px-1.5 py-0.5 text-emerald-400">
                {peaking.length} peaking
              </span>
            )}
            {ending.length > 0 && (
              <span className="rounded-md bg-amber-900/40 px-1.5 py-0.5 text-amber-400">
                {ending.length} ending
              </span>
            )}
            {coming.length > 0 && (
              <span className="rounded-md bg-sky-900/40 px-1.5 py-0.5 text-sky-400">
                {coming.length} coming
              </span>
            )}
          </div>
        </div>

        {/* Buckets */}
        <div className="grid gap-2 sm:grid-cols-3">
          {/* Peaking Now */}
          {peaking.length > 0 && (
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                Peaking Now
              </p>
              <div className="space-y-1">
                {peaking.slice(0, SHOW_MAX).map((item) => (
                  <div
                    key={item.ingredientName}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="truncate text-xs capitalize text-stone-200">
                      {item.ingredientName}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-stone-500">
                      {formatWindow(item.peakMonths)}
                    </span>
                  </div>
                ))}
                {peaking.length > SHOW_MAX && (
                  <p className="text-[10px] text-emerald-600">+{peaking.length - SHOW_MAX} more</p>
                )}
              </div>
            </div>
          )}

          {/* Last Chance */}
          {ending.length > 0 && (
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                Last Chance
              </p>
              <div className="space-y-1">
                {ending.slice(0, SHOW_MAX).map((item) => (
                  <div
                    key={item.ingredientName}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="truncate text-xs capitalize text-stone-200">
                      {item.ingredientName}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-stone-500">
                      {formatWindow(item.peakMonths)}
                    </span>
                  </div>
                ))}
                {ending.length > SHOW_MAX && (
                  <p className="text-[10px] text-amber-600">+{ending.length - SHOW_MAX} more</p>
                )}
              </div>
            </div>
          )}

          {/* Coming Next */}
          {coming.length > 0 && (
            <div className="rounded-lg border border-sky-900/40 bg-sky-950/20 p-2.5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-500">
                Coming in {MONTH_NAMES_FULL[nextMonth]}
              </p>
              <div className="space-y-1">
                {coming.slice(0, SHOW_MAX).map((item) => (
                  <div
                    key={item.ingredientName}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="truncate text-xs capitalize text-stone-200">
                      {item.ingredientName}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-stone-500">
                      {formatWindow(item.peakMonths)}
                    </span>
                  </div>
                ))}
                {coming.length > SHOW_MAX && (
                  <p className="text-[10px] text-sky-600">+{coming.length - SHOW_MAX} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/culinary/seasonal-calendar"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Browse full calendar
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </Link>
      </div>
    </WidgetCardShell>
  )
}
