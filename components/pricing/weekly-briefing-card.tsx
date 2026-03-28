'use client'

import { type WeeklyBriefing } from '@/lib/openclaw/weekly-briefing-actions'

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function WeeklyBriefingCard({ briefing }: { briefing: WeeklyBriefing | null }) {
  if (!briefing) return null

  // Show full card Mon-Wed, condensed after
  const dayOfWeek = new Date().getDay()
  const isFullDisplay = dayOfWeek >= 1 && dayOfWeek <= 3

  if (!isFullDisplay) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-400">Weekly Price Briefing</span>
          <span className="text-xs text-stone-500">{briefing.weekOf}</span>
        </div>
        <p className="text-sm mt-1">{briefing.headline}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Weekly Price Briefing</h3>
        <span className="text-xs text-stone-500">{briefing.weekOf}</span>
      </div>

      <p className="text-sm font-medium mb-4">{briefing.headline}</p>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold">{formatPrice(briefing.totalBasketCents)}</span>
        <span className="text-xs text-stone-500">total basket</span>
        {briefing.basketChangePct !== null && (
          <span
            className={`text-sm font-medium ${briefing.basketChangePct < 0 ? 'text-green-400' : briefing.basketChangePct > 0 ? 'text-red-400' : 'text-stone-400'}`}
          >
            {briefing.basketChangePct > 0 ? '+' : ''}
            {briefing.basketChangePct}%
          </span>
        )}
        {briefing.basketChangePct === null && (
          <span className="text-xs text-stone-500">Not enough history for comparison yet</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Drops */}
        <div>
          <h4 className="text-xs font-medium text-green-400 mb-2">
            Price Drops ({briefing.biggestDrops.length})
          </h4>
          {briefing.biggestDrops.length === 0 && (
            <p className="text-xs text-stone-500">No significant drops this week</p>
          )}
          {briefing.biggestDrops.slice(0, 3).map((move, i) => (
            <div key={i} className="text-xs mb-1">
              <span className="text-stone-300">{move.ingredient}</span>
              <span className="text-green-400 ml-1">-{move.changePct}%</span>
              <span className="text-stone-500 ml-1">{move.store}</span>
            </div>
          ))}
        </div>

        {/* Spikes */}
        <div>
          <h4 className="text-xs font-medium text-red-400 mb-2">
            Price Spikes ({briefing.biggestSpikes.length})
          </h4>
          {briefing.biggestSpikes.length === 0 && (
            <p className="text-xs text-stone-500">No significant spikes this week</p>
          )}
          {briefing.biggestSpikes.slice(0, 3).map((move, i) => (
            <div key={i} className="text-xs mb-1">
              <span className="text-stone-300">{move.ingredient}</span>
              <span className="text-red-400 ml-1">+{move.changePct}%</span>
              <span className="text-stone-500 ml-1">{move.store}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-stone-500 border-t border-stone-700 pt-3">
        {briefing.bestStoreThisWeek && (
          <span>
            Best store: <span className="text-stone-300">{briefing.bestStoreThisWeek}</span>
          </span>
        )}
        <span>
          Coverage: <span className="text-stone-300">{briefing.coveragePct}%</span>
        </span>
      </div>
    </div>
  )
}
