'use client'

/**
 * SeasonalPalettePlayer — Remotion Player wrapper for the seasonal palette animation.
 * Defines micro-windows, proven wins, creative thesis, and seasonal palettes.
 */

import { Player } from '@remotion/player'
import { SeasonalPaletteComposition } from '@/lib/remotion/seasonal-palette-composition'

export function SeasonalPalettePlayer() {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={SeasonalPaletteComposition}
        compositionWidth={640}
        compositionHeight={400}
        durationInFrames={360}
        fps={30}
        loop
        autoPlay
        style={{ width: '100%', aspectRatio: '640 / 400' }}
        controls={false}
      />
    </div>
  )
}
