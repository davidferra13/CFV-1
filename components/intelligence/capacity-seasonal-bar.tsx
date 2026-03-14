import { getCapacityCeiling } from '@/lib/intelligence/capacity-ceiling'
import { getSeasonalDemandForecast } from '@/lib/intelligence/seasonal-demand'
import { formatCurrency } from '@/lib/utils/currency'

export async function CapacitySeasonalBar() {
  const [capacity, seasonal] = await Promise.all([
    getCapacityCeiling().catch(() => null),
    getSeasonalDemandForecast().catch(() => null),
  ])

  if (!capacity && !seasonal) return null

  return (
    <div className="space-y-3">
      {/* Bottleneck Alerts */}
      {capacity &&
        capacity.bottlenecks
          .filter((b) => b.severity !== 'info')
          .map((b, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                b.severity === 'critical'
                  ? 'border-red-800/40 bg-red-950/30'
                  : 'border-amber-800/40 bg-amber-950/30'
              }`}
            >
              <span
                className={`text-sm mt-0.5 ${b.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}
              >
                !
              </span>
              <div>
                <p
                  className={`text-sm font-medium ${b.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}
                >
                  {b.title}
                </p>
                <p
                  className={`text-xs ${b.severity === 'critical' ? 'text-red-400/70' : 'text-amber-400/70'}`}
                >
                  {b.description}
                </p>
              </div>
            </div>
          ))}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Utilization */}
        {capacity && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Utilization</p>
            <p
              className={`text-lg font-bold ${
                capacity.currentUtilization >= 90
                  ? 'text-red-400'
                  : capacity.currentUtilization >= 70
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {capacity.currentUtilization}%
            </p>
            <p className="text-xs text-stone-500">{capacity.capacityHeadroom}% headroom</p>
          </div>
        )}

        {/* Avg Events/Week */}
        {capacity && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Events/Week</p>
            <p className="text-lg font-bold text-stone-100">
              {capacity.avgEventsPerWeek.toFixed(1)}
            </p>
            <p className="text-xs text-stone-500">max: {capacity.maxEventsPerWeek}</p>
          </div>
        )}

        {/* Next Month Forecast */}
        {seasonal && seasonal.nextMonthForecast && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">{seasonal.nextMonthForecast.month} Forecast</p>
            <p className="text-lg font-bold text-stone-100">
              {seasonal.nextMonthForecast.expectedEvents} events
            </p>
            <p className="text-xs text-stone-500">
              ~{formatCurrency(seasonal.nextMonthForecast.expectedRevenueCents)}
            </p>
          </div>
        )}

        {/* Current Season */}
        {seasonal && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Seasons</p>
            <p className="text-xs text-stone-300 mt-0.5">
              Peak: {seasonal.peakSeasonMonths.slice(0, 3).join(', ') || 'n/a'}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              Slow: {seasonal.slowSeasonMonths.slice(0, 3).join(', ') || 'n/a'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
