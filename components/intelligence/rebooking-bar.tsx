import { getRebookingPredictions } from '@/lib/intelligence/rebooking-predictions'

export async function RebookingBar() {
  const intel = await getRebookingPredictions().catch(() => null)

  if (!intel) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Repeat Client Rate */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Repeat Client Rate</p>
        <p
          className={`text-lg font-bold ${
            intel.repeatClientRate >= 50
              ? 'text-emerald-400'
              : intel.repeatClientRate >= 30
                ? 'text-amber-400'
                : 'text-stone-100'
          }`}
        >
          {intel.repeatClientRate}%
        </p>
        <p className="text-xs text-stone-500">avg interval: {intel.avgRebookingIntervalDays}d</p>
      </div>

      {/* Upcoming Rebookers */}
      {intel.upcomingRebookers.length > 0 && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Likely to Rebook (30d)</p>
          <p className="text-lg font-bold text-emerald-400">{intel.upcomingRebookers.length}</p>
          <p className="text-xs text-stone-500 truncate">
            {intel.upcomingRebookers
              .slice(0, 2)
              .map((r) => r.clientName)
              .join(', ')}
          </p>
        </div>
      )}

      {/* Overdue Rebookers */}
      {intel.overdueRebookers.length > 0 && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Overdue for Rebooking</p>
          <p className="text-lg font-bold text-amber-400">{intel.overdueRebookers.length}</p>
          <p className="text-xs text-stone-500 truncate">
            {intel.overdueRebookers
              .slice(0, 2)
              .map((r) => r.clientName)
              .join(', ')}
          </p>
        </div>
      )}

      {/* Total Predictions */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Tracked Clients</p>
        <p className="text-lg font-bold text-stone-100">{intel.predictions.length}</p>
        <p className="text-xs text-stone-500">with rebooking signals</p>
      </div>
    </div>
  )
}
