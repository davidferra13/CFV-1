import { getPriceElasticity } from '@/lib/intelligence/price-elasticity'
import { getRevenuePerGuest } from '@/lib/intelligence/revenue-per-guest'
import { formatCurrency } from '@/lib/utils/currency'

export async function PricingIntelligenceBar() {
  const [elasticity, rpg] = await Promise.all([
    getPriceElasticity().catch(() => null),
    getRevenuePerGuest().catch(() => null),
  ])

  if (!elasticity && !rpg) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Price Increase Headroom */}
      {elasticity && elasticity.priceIncreaseHeadroom > 0 && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Price Headroom</p>
          <p
            className={`text-lg font-bold ${
              elasticity.priceIncreaseHeadroom >= 15
                ? 'text-emerald-400'
                : elasticity.priceIncreaseHeadroom >= 5
                  ? 'text-amber-400'
                  : 'text-stone-100'
            }`}
          >
            +{elasticity.priceIncreaseHeadroom}%
          </p>
          <p className="text-xs text-stone-500">before acceptance drops</p>
        </div>
      )}

      {/* Revenue Per Guest */}
      {rpg && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Rev / Guest</p>
          <p className="text-lg font-bold text-stone-100">
            {formatCurrency(rpg.overallAvgPerGuestCents)}
          </p>
          <p
            className={`text-xs ${rpg.trend === 'rising' ? 'text-emerald-400' : rpg.trend === 'falling' ? 'text-red-400' : 'text-stone-500'}`}
          >
            trend: {rpg.trend}
          </p>
        </div>
      )}

      {/* Sweet Spot Guest Count */}
      {rpg && rpg.sweetSpotGuests && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Sweet Spot</p>
          <p className="text-lg font-bold text-stone-100">{rpg.sweetSpotGuests} guests</p>
          <p className="text-xs text-stone-500">highest rev/guest</p>
        </div>
      )}

      {/* Optimal Pricing */}
      {elasticity && elasticity.revenueMaximizingPerGuestCents && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Optimal Price/Guest</p>
          <p className="text-lg font-bold text-stone-100">
            {formatCurrency(elasticity.revenueMaximizingPerGuestCents)}
          </p>
          <p className="text-xs text-stone-500">
            current: {formatCurrency(elasticity.currentAvgPerGuestCents)}
          </p>
        </div>
      )}
    </div>
  )
}
