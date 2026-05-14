'use client'

import type { PublicPlatformStats } from '@/lib/directory/public-stats'

type Props = {
  stats: PublicPlatformStats
}

export function HomepageActivitySignals({ stats }: Props) {
  const signals: { label: string; pulse?: boolean }[] = []

  if (stats.verifiedChefCount) {
    signals.push({
      label: `${stats.verifiedChefCount} verified chef${stats.verifiedChefCount === 1 ? '' : 's'} on the platform`,
    })
  }

  if (stats.cityCoveredCount) {
    signals.push({
      label: `Serving ${stats.cityCoveredCount}+ cities nationwide`,
      pulse: true,
    })
  }

  if (stats.cuisineTypeCount) {
    signals.push({
      label: `${stats.cuisineTypeCount} cuisine types available`,
    })
  }

  if (stats.avgRating) {
    signals.push({
      label: `${stats.avgRating} avg chef rating`,
    })
  }

  if (signals.length === 0) return null

  return (
    <div className="w-full border-y border-stone-800/60 bg-stone-950/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5">
        {signals.map((signal, i) => (
          <span key={i} className="flex items-center gap-x-2 text-xs text-stone-500">
            {i > 0 && (
              <span aria-hidden className="hidden h-3 w-px bg-stone-700/60 sm:inline-block" />
            )}
            {signal.pulse && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500/70" />
              </span>
            )}
            {signal.label}
          </span>
        ))}
      </div>
    </div>
  )
}
