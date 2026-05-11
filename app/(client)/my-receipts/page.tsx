import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyReceipts } from '@/lib/receipts/client-receipt-actions'
import { ReceiptsClient } from './receipts-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Receipts' }

export default async function MyReceiptsPage() {
  await requireClient()
  const receipts = await getMyReceipts()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Receipts</h1>
        <p className="text-stone-400 mt-1">Grocery and supply receipts from your events.</p>
      </div>
      <ReceiptsClient receipts={receipts} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
