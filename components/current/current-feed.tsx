import { getCurrentFeed } from '@/lib/current/actions'
import { CurrentUnitCard } from './current-unit-card'
import { CurrentFeedExpander } from './current-feed-expander'

export async function CurrentFeed() {
  let feed

  try {
    feed = await getCurrentFeed()
  } catch (err) {
    console.error('[CurrentFeed] Failed to load:', err)
    return null
  }

  if (feed.units.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4">
        <h3 className="text-sm font-medium text-stone-300">The Current</h3>
        <p className="text-xs text-stone-500 mt-1">Nothing needs your attention right now.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-700/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-100">The Current</h3>
          {feed.growthMode && (
            <span className="text-[10px] text-emerald-400 font-medium">Growth mode</span>
          )}
        </div>
        <span className="text-[10px] text-stone-500">
          {feed.totalCount} item{feed.totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Top items (always visible) */}
      <div className="divide-y divide-stone-700/20">
        {feed.top.map((unit, i) => (
          <CurrentUnitCard key={unit.id} unit={unit} rank={i + 1} />
        ))}
      </div>

      {/* Expandable remainder */}
      {feed.units.length > feed.top.length && (
        <CurrentFeedExpander
          units={feed.units.slice(feed.top.length)}
          startRank={feed.top.length + 1}
        />
      )}
    </div>
  )
}
