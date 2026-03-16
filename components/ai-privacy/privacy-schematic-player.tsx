'use client'

/**
 * PrivacySchematicPlayer - Remotion Player wrapper for the Remy privacy schematic.
 * Shows the 6-scene animated explainer (55 seconds) of how conversations stay private.
 */

import { Player } from '@remotion/player'
import { RemyPrivacySchematic } from '@/lib/remotion/remy-privacy-schematic'

export function PrivacySchematicPlayer() {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={RemyPrivacySchematic}
        compositionWidth={640}
        compositionHeight={400}
        durationInFrames={1650}
        fps={30}
        loop
        autoPlay
        style={{ width: '100%', aspectRatio: '640 / 400' }}
        controls
      />
    </div>
  )
}
