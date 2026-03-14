import { getUntappedMarkets } from '@/lib/intelligence/untapped-markets'

export async function UntappedMarketsBar() {
  const intel = await getUntappedMarkets().catch(() => null)

  if (!intel) return null

  const untapped = intel.occasions.filter(
    (o) => o.status === 'untapped' || o.status === 'underserved'
  )
  if (untapped.length === 0 && !intel.topUntappedOccasion) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Top Untapped Occasion */}
      {intel.topUntappedOccasion && (
        <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2">
          <p className="text-xs text-emerald-500">Untapped Opportunity</p>
          <p className="text-lg font-bold text-emerald-300 truncate">{intel.topUntappedOccasion}</p>
          <p className="text-xs text-emerald-500/70">inquiries exist, no events yet</p>
        </div>
      )}

      {/* Best Converting */}
      {intel.bestConvertingOccasion && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Best Converting</p>
          <p className="text-lg font-bold text-stone-100 truncate">
            {intel.bestConvertingOccasion}
          </p>
          <p className="text-xs text-stone-500">highest inquiry→event rate</p>
        </div>
      )}

      {/* Highest Value Bracket */}
      {intel.highestValueBracket && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Highest Value Size</p>
          <p className="text-lg font-bold text-stone-100 truncate">{intel.highestValueBracket}</p>
          <p className="text-xs text-stone-500">guest bracket</p>
        </div>
      )}

      {/* Underserved Count */}
      {untapped.length > 0 && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Growth Opportunities</p>
          <p className="text-lg font-bold text-emerald-400">{untapped.length}</p>
          <p className="text-xs text-stone-500">underserved occasions</p>
        </div>
      )}
    </div>
  )
}
