'use client'

/**
 * SettingsRoadmapPlayer — Remotion Player wrapper for the settings roadmap animation.
 * Shows what settings to configure first, second, and optionally.
 */

import { Player } from '@remotion/player'
import { SettingsRoadmapComposition } from '@/lib/remotion/settings-roadmap-composition'

export function SettingsRoadmapPlayer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={SettingsRoadmapComposition}
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
