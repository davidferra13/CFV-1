import { getGeographicIntelligence } from '@/lib/intelligence/geographic-hotspots'

export async function GeographicBar() {
  const intel = await getGeographicIntelligence().catch(() => null)

  if (!intel || intel.hotspots.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Top Revenue Location */}
      {intel.topRevenueLocation && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Top Revenue Area</p>
          <p className="text-lg font-bold text-stone-100 truncate">{intel.topRevenueLocation}</p>
          <p className="text-xs text-stone-500">{intel.locationConcentration}% in top 3 areas</p>
        </div>
      )}

      {/* Travel Efficiency */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Avg Travel</p>
        <p className="text-lg font-bold text-stone-100">
          {intel.travelEfficiency.avgTravelMinutes}m
        </p>
        <p className="text-xs text-stone-500">
          ${(intel.travelEfficiency.avgRevenuePerTravelMinute / 100).toFixed(0)}/min revenue
        </p>
      </div>

      {/* Location Count */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Service Areas</p>
        <p className="text-lg font-bold text-stone-100">{intel.totalLocations}</p>
        <p className="text-xs text-stone-500">
          avg {intel.avgEventsPerLocation.toFixed(1)} events/area
        </p>
      </div>

      {/* Growing Hotspots */}
      {(() => {
        const growing = intel.hotspots.filter((h) => h.trend === 'growing')
        if (growing.length === 0) return null
        return (
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
            <p className="text-xs text-stone-500">Growing Areas</p>
            <p className="text-lg font-bold text-emerald-400">{growing.length}</p>
            <p className="text-xs text-stone-500 truncate">
              {growing
                .slice(0, 2)
                .map((h) => h.location)
                .join(', ')}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
