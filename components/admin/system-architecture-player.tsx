'use client'

import { Player } from '@remotion/player'
import { SystemArchitectureComposition } from '@/lib/remotion/system-architecture-composition'

export function SystemArchitecturePlayer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <Player
        component={SystemArchitectureComposition}
        compositionWidth={640}
        compositionHeight={400}
        durationInFrames={600}
        fps={30}
        loop
        autoPlay
        style={{ width: '100%', aspectRatio: '640 / 400' }}
        controls={false}
      />
    </div>
  )
}
