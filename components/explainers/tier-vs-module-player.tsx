'use client'

/**
 * TierVsModulePlayer — Remotion Player wrapper for the tier vs module animation.
 * Explains the difference between Free/Pro tiers and module visibility toggles.
 */

import { Player } from '@remotion/player'
import { TierVsModuleComposition } from '@/lib/remotion/tier-vs-module-composition'

export function TierVsModulePlayer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={TierVsModuleComposition}
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
