import type { MileageSavings } from '@/lib/intelligence/travel-optimization'

interface TravelSavingsBannerProps {
  savings: MileageSavings
  totalEvents: number
}

export function TravelSavingsBanner({ savings, totalEvents }: TravelSavingsBannerProps) {
  const hasSavings = savings.savedTrips > 0

  if (!hasSavings) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-4">
        <p className="text-sm text-stone-400">
          {totalEvents} event(s) this week, all in different areas. No consolidation opportunities found.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
        <h3 className="text-sm font-semibold text-emerald-300">Travel Savings</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-300">{savings.savedTrips}</p>
          <p className="text-xs text-stone-500">Trips Saved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-300">~{savings.estimatedMilesSaved}</p>
          <p className="text-xs text-stone-500">Miles Saved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-300">~{savings.estimatedTimeSavedMinutes}</p>
          <p className="text-xs text-stone-500">Minutes Saved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-stone-300">
            {savings.clusteredTrips}/{savings.separateTrips}
          </p>
          <p className="text-xs text-stone-500">Trips (vs. separate)</p>
        </div>
      </div>

      <p className="text-xs text-stone-500 mt-3">
        By clustering {totalEvents} events into {savings.clusteredTrips} trip(s) instead of {savings.separateTrips} separate runs.
      </p>
    </div>
  )
}
