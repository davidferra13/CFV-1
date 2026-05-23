// Waiting State Radar - Full Route
// Shows all items across the system that are in a waiting state.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { collectWaitingItems } from '@/lib/waiting-radar/collect'
import { rankWaitingItems } from '@/lib/waiting-radar/rank'
import { WaitingRadarFullView } from '@/components/waiting-radar/waiting-radar-panel'

export const metadata: Metadata = { title: 'Waiting Radar' }

export default async function WaitingRadarPage() {
  await requireChef()
  const raw = await collectWaitingItems()
  const { items, summary } = rankWaitingItems(raw)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-100">Waiting Radar</h1>
        <p className="text-sm text-stone-400 mt-1">
          Everything that is waiting on someone or something. Follow up, unblock, or resolve.
        </p>
      </div>
      <WaitingRadarFullView items={items} summary={summary} />
    </div>
  )
}
