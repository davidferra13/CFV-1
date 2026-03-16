import { getIngredientConsolidation } from '@/lib/intelligence/ingredient-consolidation'
import { formatCurrency } from '@/lib/utils/currency'

export async function IngredientConsolidationBar() {
  const intel = await getIngredientConsolidation().catch(() => null)

  if (!intel || intel.consolidatedList.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Savings Opportunities */}
      {intel.savingsOpportunities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {intel.savingsOpportunities.slice(0, 3).map((opp, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2"
            >
              <span className="text-emerald-400 text-sm mt-0.5">$</span>
              <div>
                <p className="text-sm font-medium text-emerald-300">{opp.title}</p>
                <p className="text-xs text-emerald-400/70">
                  ~{opp.estimatedSavingsPercent}% savings - {opp.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Upcoming Ingredient Cost */}
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Est. Ingredient Cost</p>
          <p className="text-lg font-bold text-stone-100">
            {formatCurrency(intel.totalEstimatedCostCents)}
          </p>
          <p className="text-xs text-stone-500">{intel.eventsCovered} upcoming events</p>
        </div>

        {/* Shared Ingredients */}
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Shared Ingredients</p>
          <p className="text-lg font-bold text-emerald-400">{intel.sharedIngredientCount}</p>
          <p className="text-xs text-stone-500">across 2+ events</p>
        </div>

        {/* Total Ingredients */}
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Total Ingredients</p>
          <p className="text-lg font-bold text-stone-100">{intel.consolidatedList.length}</p>
          <p className="text-xs text-stone-500">
            {intel.dateRange.start} – {intel.dateRange.end}
          </p>
        </div>

        {/* Top Shared Items */}
        {intel.consolidatedList.filter((i) => i.eventCount >= 2).length > 0 && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500 mb-1">Top Shared</p>
            <div className="text-xs text-stone-300 space-y-0.5">
              {intel.consolidatedList
                .filter((i) => i.eventCount >= 2)
                .sort((a, b) => b.eventCount - a.eventCount)
                .slice(0, 3)
                .map((item, i) => (
                  <p key={i} className="truncate">
                    {item.ingredientName} ({item.eventCount} events)
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
