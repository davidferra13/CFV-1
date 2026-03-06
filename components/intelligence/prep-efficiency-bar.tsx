import { getPrepTimeIntelligence } from '@/lib/intelligence/prep-time-estimator'

export async function PrepEfficiencyBar() {
  const intel = await getPrepTimeIntelligence().catch(() => null)

  if (!intel) return null

  const totalAvgMinutes = intel.phaseAverages.reduce((s, p) => s + p.avgMinutes, 0)
  const totalAvgHours = (totalAvgMinutes / 60).toFixed(1)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Avg Total Time */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Avg Event Time</p>
        <p className="text-lg font-bold text-stone-100">{totalAvgHours}h</p>
        <p className="text-xs text-stone-500">efficiency: {intel.efficiencyTrend}</p>
      </div>

      {/* Minutes per Guest */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Min / Guest</p>
        <p className="text-lg font-bold text-stone-100">{intel.avgMinutesPerGuest.toFixed(0)}</p>
        <p className="text-xs text-stone-500">avg across events</p>
      </div>

      {/* Phase Breakdown */}
      {intel.phaseAverages.length > 0 && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2 col-span-2">
          <p className="text-xs text-stone-500 mb-1">Phase Breakdown</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {intel.phaseAverages.slice(0, 5).map((p) => (
              <span key={p.phase} className="text-stone-300">
                {p.phase}: <strong>{Math.round(p.avgMinutes)}m</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
