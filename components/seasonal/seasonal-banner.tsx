// Seasonal Banner — Recipe Library Integration
// Displays active season's sensory anchor and micro-window alerts.
// Renders nothing if no active palette (graceful degradation).

import type { SeasonalPalette, MicroWindow } from '@/lib/seasonal/types'

const SEASON_TINTS: Record<string, string> = {
  Winter: 'bg-sky-50 border-sky-200',
  Spring: 'bg-emerald-50 border-emerald-200',
  Summer: 'bg-amber-50 border-amber-200',
  Autumn: 'bg-orange-50 border-orange-200',
}

const SEASON_TEXT: Record<string, string> = {
  Winter: 'text-sky-800',
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
  if (!palette.sensory_anchor && activeMicroWindows.length === 0 && endingMicroWindows.length === 0) return null

  const tintClass = SEASON_TINTS[palette.season_name] || 'bg-stone-50 border-stone-200'
  const textClass = SEASON_TEXT[palette.season_name] || 'text-stone-800'

  return (
    <div className={`rounded-xl border p-4 ${tintClass} mb-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-semibold text-sm uppercase tracking-wide ${textClass}`}>
            {palette.season_name} Palette
          </h3>
          {palette.sensory_anchor && (
            <p className={`text-sm mt-1 italic ${textClass} opacity-80`}>
              &ldquo;{palette.sensory_anchor}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Micro-window badges */}
      {(activeMicroWindows.length > 0 || endingMicroWindows.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeMicroWindows.map((w, i) => {
            const isEnding = endingMicroWindows.some(e => e.name === w.name)
            return (
              <span
                key={`active-${i}`}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  w.urgency === 'high'
                    ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                    : isEnding
                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                    : 'bg-white/70 text-stone-600 ring-1 ring-stone-200'
                }`}
              >
                {w.urgency === 'high' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
                {isEnding && w.urgency !== 'high' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
                {w.ingredient}
                {isEnding && <span className="text-[10px] opacity-70">ending soon</span>}
              </span>
            )
          })}
          {/* Show ending-only windows not already shown as active */}
          {endingMicroWindows
            .filter(e => !activeMicroWindows.some(a => a.name === e.name))
            .map((w, i) => (
              <span
                key={`ending-${i}`}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {w.ingredient}
                <span className="text-[10px] opacity-70">ending soon</span>
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
