// Seasonal Banner - Recipe Library Integration
// Shows the active season's notes and what ingredients are currently available.
// Renders nothing if no active palette.

import type { SeasonalPalette, MicroWindow } from '@/lib/seasonal/types'

const SEASON_TINTS: Record<string, string> = {
  Winter: 'bg-brand-950 border-brand-200',
  Spring: 'bg-emerald-950 border-emerald-200',
  Summer: 'bg-amber-950 border-amber-200',
  Autumn: 'bg-orange-950 border-orange-200',
}

const SEASON_TEXT: Record<string, string> = {
  Winter: 'text-brand-800',
  Spring: 'text-emerald-800',
  Summer: 'text-amber-800',
  Autumn: 'text-orange-800',
}

export function SeasonalBanner({
  palette,
  activeMicroWindows,
  endingMicroWindows,
}: {
  palette: SeasonalPalette | null
  activeMicroWindows: MicroWindow[]
  endingMicroWindows: MicroWindow[]
}) {
  if (!palette) return null
  if (!palette.sensory_anchor && activeMicroWindows.length === 0 && endingMicroWindows.length === 0)
    return null

  const tintClass = SEASON_TINTS[palette.season_name] || 'bg-stone-800 border-stone-700'
  const textClass = SEASON_TEXT[palette.season_name] || 'text-stone-200'

  return (
    <div className={`rounded-xl border p-4 ${tintClass} mb-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-semibold text-sm uppercase tracking-wide ${textClass}`}>
            {palette.season_name}
          </h3>
          {palette.sensory_anchor && (
            <p className={`text-sm mt-1 ${textClass} opacity-80`}>{palette.sensory_anchor}</p>
          )}
        </div>
      </div>

      {/* Available ingredients */}
      {(activeMicroWindows.length > 0 || endingMicroWindows.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeMicroWindows.map((w, i) => {
            const isEnding = endingMicroWindows.some((e) => e.ingredient === w.ingredient)
            return (
              <span
                key={`active-${i}`}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  isEnding
                    ? 'bg-amber-900 text-amber-700 ring-1 ring-amber-800'
                    : 'bg-stone-900/70 text-stone-400 ring-1 ring-stone-700'
                }`}
              >
                {w.ingredient}
                {isEnding && <span className="text-xxs opacity-70">ending soon</span>}
              </span>
            )
          })}
          {/* Show ending-only items not already shown as active */}
          {endingMicroWindows
            .filter((e) => !activeMicroWindows.some((a) => a.ingredient === e.ingredient))
            .map((w, i) => (
              <span
                key={`ending-${i}`}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-900 text-amber-700 ring-1 ring-amber-800"
              >
                {w.ingredient}
                <span className="text-xxs opacity-70">ending soon</span>
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
