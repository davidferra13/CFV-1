// FIFO / Shelf Life Tracking Page
// Track received lots, expiry dates, and FIFO rotation alerts.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getActiveLots,
  getShelfLifeReport,
  getExpiringItems,
  getExpiredItems,
  getWasteFromExpiry,
} from '@/lib/inventory/fifo-actions'
import { FIFOTracker } from '@/components/inventory/fifo-tracker'

export const metadata: Metadata = { title: 'FIFO Tracking - ChefFlow' }

export default async function FIFOPage() {
  await requireChef()

  const [lots, report, expiring, expired, waste] = await Promise.all([
    getActiveLots().catch(() => []),
    getShelfLifeReport().catch(() => ({
      totalActiveLots: 0,
      expiringSoon: 0,
      expired: 0,
      avgDaysUntilExpiry: null,
      totalValueCents: 0,
    })),
    getExpiringItems(3).catch(() => []),
    getExpiredItems().catch(() => []),
    getWasteFromExpiry(30).catch(() => ({ totalLots: 0, totalValueCents: 0 })),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">FIFO Tracking</h1>
        <p className="text-stone-500 mt-1">
          Track lot expiry dates, rotate stock first-in-first-out, and flag expired items.
        </p>
      </div>

      <FIFOTracker
        initialLots={lots}
        initialReport={report}
        initialExpiring={expiring}
        initialExpired={expired}
        initialWaste={waste}
      />
    </div>
  )
}
