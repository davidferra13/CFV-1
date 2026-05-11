import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { findBulkBuyOpportunities, getShoppingConsolidation } from '@/lib/intelligence/bulk-buy'
import { BulkBuyClient } from './bulk-buy-client'

export const metadata: Metadata = { title: 'Bulk Buy Optimizer' }

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function BulkBuyPage() {
  await requireChef()

  const today = new Date()
  const twoWeeksOut = new Date(today)
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  const startDate = toDateStr(today)
  const endDate = toDateStr(twoWeeksOut)

  // Fetch both in parallel
  const [opportunities, consolidation] = await Promise.all([
    findBulkBuyOpportunities({ start: startDate, end: endDate }).catch(() => []),
    getShoppingConsolidation({ start: startDate, end: endDate }).catch(() => ({
      items: [],
      totalItems: 0,
      eventsCovered: 0,
      dateRange: { start: startDate, end: endDate },
    })),
  ])

  return (
    <BulkBuyClient
      initialOpportunities={opportunities}
      initialConsolidation={consolidation}
      initialStartDate={startDate}
      initialEndDate={endDate}
    />
  )
}
