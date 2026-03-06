import { getSchedulingIntelligence } from '@/lib/intelligence/smart-scheduling'

export async function SchedulingInsightsBar() {
  const intel = await getSchedulingIntelligence().catch(() => null)

  if (!intel) return null

  const criticalSuggestions = intel.suggestions.filter((s) => s.severity === 'critical')
  const warningSuggestions = intel.suggestions.filter((s) => s.severity === 'warning')
  const hasAlerts = criticalSuggestions.length > 0 || warningSuggestions.length > 0

  if (!hasAlerts && intel.suggestions.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Alerts */}
      {criticalSuggestions.map((s, i) => (
        <div
          key={`c-${i}`}
          className="flex items-start gap-2 rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2"
        >
          <span className="text-red-400 text-sm mt-0.5">!</span>
          <div>
            <p className="text-sm font-medium text-red-300">{s.title}</p>
            <p className="text-xs text-red-400/70">{s.description}</p>
          </div>
        </div>
      ))}

      {warningSuggestions.map((s, i) => (
        <div
          key={`w-${i}`}
          className="flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2"
        >
          <span className="text-amber-400 text-sm mt-0.5">!</span>
          <div>
            <p className="text-sm font-medium text-amber-300">{s.title}</p>
            <p className="text-xs text-amber-400/70">{s.description}</p>
          </div>
        </div>
      ))}

      {/* Quick Stats Row */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-400">
        <span>
          Optimal spacing: <strong className="text-stone-300">{intel.optimalSpacingDays}d</strong>
        </span>
        <span>
          Best day: <strong className="text-stone-300">{intel.bestPerformanceDay}</strong>
        </span>
        {intel.backToBackCount > 0 && (
          <span>
            Back-to-back (90d): <strong className="text-amber-400">{intel.backToBackCount}</strong>
          </span>
        )}
        <span>
          Avg gap: <strong className="text-stone-300">{intel.avgDaysBetweenEvents}d</strong>
        </span>
      </div>
    </div>
  )
}
