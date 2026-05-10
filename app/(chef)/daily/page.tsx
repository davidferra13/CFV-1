// Daily Command Center - "Open App -> Approve -> Go Cook"
// Server component: fetches data, passes to client shell for interactive features.
// Protected by layout via requireChef().

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getDailyPlan } from '@/lib/daily-ops/actions'
import { getInboxStats } from '@/lib/inbox/actions'
import { getSignalsForDisplay } from '@/lib/cil/signal-actions'
import { DailyCommandShell } from '@/components/daily-ops/daily-command-shell'
import { DailySignalBanner } from '@/components/cil/daily-signal-banner'

export const metadata: Metadata = { title: 'Daily Ops' }

export default async function DailyOpsPage() {
  const [plan, inboxStats, signals] = await Promise.all([
    getDailyPlan().catch(() => null),
    getInboxStats().catch(() => ({
      total: 0,
      unread: 0,
      bySource: { chat: 0, message: 0, wix: 0, notification: 0 },
    })),
    getSignalsForDisplay().catch(() => []),
  ])

  if (!plan) {
    const todayFormatted = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Daily Ops</h1>
          <p className="text-sm text-stone-400 mt-0.5">{todayFormatted}</p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 px-6 py-8 text-center">
          <p className="text-stone-400 font-medium mb-1">Could not load today&apos;s plan</p>
          <p className="text-stone-500 text-sm">Check your connection and refresh the page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-4">
      {signals.length > 0 && (
        <Suspense fallback={null}>
          <DailySignalBanner initialSignals={signals} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <DailyCommandShell plan={plan} unreadMessages={inboxStats.unread} />
      </Suspense>
    </div>
  )
}
