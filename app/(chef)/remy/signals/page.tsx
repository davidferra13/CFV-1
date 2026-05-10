// Remy Signals - Full intelligence signal feed, filterable by domain
// Shows all active proactive signals from the CIL domain analyzers.

import type { Metadata } from 'next'
import { getSignalsForDisplay } from '@/lib/cil/signal-actions'
import { RemySignalFeedClient } from './remy-signal-feed-client'

export const metadata: Metadata = { title: 'Intelligence Signals' }

export default async function RemySignalsPage() {
  const signals = await getSignalsForDisplay().catch(() => [])

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-display text-stone-100">Intelligence Signals</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          Real-time business signals from across your operation
        </p>
      </div>
      <RemySignalFeedClient initialSignals={signals} />
    </div>
  )
}
