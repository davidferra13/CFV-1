'use client'

/**
 * ProductExplainerPlayer — Remotion Player wrapper for the landing page.
 *
 * Shows the 4-step workflow: Inquiry → Event → Quote → Payment.
 * Helps prospects understand what ChefFlow does in ~12 seconds.
 */

import { Player } from '@remotion/player'
import { ProductExplainerComposition } from '@/lib/remotion/product-explainer-composition'

export function ProductExplainerPlayer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={ProductExplainerComposition}
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
