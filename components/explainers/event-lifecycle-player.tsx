'use client'

/**
 * EventLifecyclePlayer — Remotion Player wrapper for the event lifecycle animation.
 * Shows the 8-state event journey with triggers for each transition.
 */

import { Player } from '@remotion/player'
import { EventLifecycleComposition } from '@/lib/remotion/event-lifecycle-composition'

export function EventLifecyclePlayer() {
  return (
    <div className="rounded-xl border border-stone-700 bg-surface shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={EventLifecycleComposition}
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
