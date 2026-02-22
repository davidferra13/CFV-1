'use client'

/**
 * LedgerExplainerPlayer — Remotion Player wrapper for the ledger animation.
 * Shows the append-only ledger with running totals and profit breakdown.
 */

import { Player } from '@remotion/player'
import { LedgerExplainerComposition } from '@/lib/remotion/ledger-explainer-composition'

export function LedgerExplainerPlayer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <Player
        component={LedgerExplainerComposition}
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
