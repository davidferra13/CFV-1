'use client'

/**
 * QuoteLifecyclePlayer - Remotion Player wrapper for the quote lifecycle animation.
 * Shows draft → sent → accepted/rejected/expired with deposit explanation.
 */

import { Player } from '@remotion/player'
import { QuoteLifecycleComposition } from '@/lib/remotion/quote-lifecycle-composition'

export function QuoteLifecyclePlayer() {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={QuoteLifecycleComposition}
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
