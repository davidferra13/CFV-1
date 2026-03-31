// Expiry Alerts Page
// Show batches approaching expiry with urgency indicators.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getExpiryAlerts } from '@/lib/inventory/batch-actions'
import { ExpiryClient } from './expiry-client'

export const metadata: Metadata = { title: 'Expiry Alerts' }

export default async function ExpiryPage() {
  await requireChef()

  const alerts = await getExpiryAlerts(7).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Expiry Alerts</h1>
        <p className="text-stone-500 mt-1">
          Batches expiring within the next 7 days. Take action before it&apos;s too late.
        </p>
      </div>

      <ExpiryClient initialAlerts={alerts as any[]} />
    </div>
  )
}
