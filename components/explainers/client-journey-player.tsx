'use client'

/**
 * ClientJourneyPlayer — Remotion Player wrapper for the client journey animation.
 * Shows what clients see at each step of the event lifecycle.
 */

import { Player } from '@remotion/player'
import { ClientJourneyComposition } from '@/lib/remotion/client-journey-composition'

export function ClientJourneyPlayer() {
  return (
    <div className="rounded-xl border border-stone-700 bg-surface shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={ClientJourneyComposition}
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
