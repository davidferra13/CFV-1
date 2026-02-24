'use client'

/**
 * EventOpsPlayer — Remotion Player wrapper for the event operations animation.
 * Shows staff assignments, temp logs, contingency plans, and menu modifications.
 */

import { Player } from '@remotion/player'
import { EventOpsComposition } from '@/lib/remotion/event-ops-composition'

export function EventOpsPlayer() {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={EventOpsComposition}
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
