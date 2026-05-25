// Intelligence Feed - Full actionable signal feed
// Shows all active CIL/Rail/PIE signals with one-click action buttons.
// Filters by category (client, pricing, operations). Batch dismiss.

import type { Metadata } from 'next'
import { getActiveSignals } from '@/lib/intelligence/signal-actions-wired'
import { IntelligenceFeedClient } from './intelligence-feed-client'

export const metadata: Metadata = { title: 'Business Feed' }

export default async function IntelligencePage() {
  const signalsWithActions = await getActiveSignals().catch(() => [])

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-display text-stone-100">Business Feed</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          Actionable signals from across your operation. One click to act.
        </p>
      </div>
      <IntelligenceFeedClient initialSignals={signalsWithActions} />
    </div>
  )
}
