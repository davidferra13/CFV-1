'use client'

interface Props {
  totalSavingsCents: number
  recommendedCount: number
  cautionCount: number
  skipCount: number
  eventsCovered: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function SavingsSummary({
  totalSavingsCents,
  recommendedCount,
  cautionCount,
  skipCount,
  eventsCovered,
}: Props) {
  const totalOpportunities = recommendedCount + cautionCount + skipCount

  if (totalOpportunities === 0) return null

  return (
    <div className="rounded-lg border border-emerald-800/50 bg-gradient-to-r from-emerald-950/40 to-emerald-900/20 px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {totalSavingsCents > 0 ? (
            <>
              <p className="text-lg font-bold text-emerald-300">
                Save ~{formatCents(totalSavingsCents)} by buying in bulk
              </p>
              <p className="text-sm text-emerald-400/70 mt-0.5">
                Across {eventsCovered} events in the selected period
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-stone-200">
                {totalOpportunities} bulk buy opportunities
              </p>
              <p className="text-sm text-stone-400 mt-0.5">
                {eventsCovered} events share ingredients that could be purchased together
              </p>
            </>
          )}
        </div>
        <div className="flex gap-4">
          {recommendedCount > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-300">{recommendedCount}</p>
              <p className="text-xs text-emerald-500">recommended</p>
            </div>
          )}
          {cautionCount > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-300">{cautionCount}</p>
              <p className="text-xs text-amber-500">caution</p>
            </div>
          )}
          {skipCount > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-400">{skipCount}</p>
              <p className="text-xs text-stone-500">skip</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
