'use client'

/**
 * MenuHierarchyPlayer — Remotion Player wrapper for the menu hierarchy animation.
 * Shows how Menu → Dish → Component → Recipe layers nest together.
 */

import { Player } from '@remotion/player'
import { MenuHierarchyComposition } from '@/lib/remotion/menu-hierarchy-composition'

export function MenuHierarchyPlayer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={MenuHierarchyComposition}
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
