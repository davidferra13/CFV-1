'use client'

/**
 * MessagingGuidePlayer — Remotion Player wrapper for the messaging guide animation.
 * Shows the 4 messaging channels and when to use each.
 */

import { Player } from '@remotion/player'
import { MessagingGuideComposition } from '@/lib/remotion/messaging-guide-composition'

export function MessagingGuidePlayer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={MessagingGuideComposition}
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
