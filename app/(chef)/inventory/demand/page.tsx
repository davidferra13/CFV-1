// Demand Forecast Page
// Show upcoming ingredient demand vs current stock.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getDemandForecast } from '@/lib/inventory/demand-forecast-actions'
import { DemandClient } from './demand-client'
import { AutoReorderPanel } from '@/components/inventory/auto-reorder-panel'

export const metadata: Metadata = { title: 'Demand Forecast' }

export default async function DemandPage() {
  await requireChef()

  const forecast = await getDemandForecast(14).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Demand Forecast</h1>
        <p className="text-stone-500 mt-1">
          What ingredients do you need for upcoming events? Compare demand against current stock.
        </p>
      </div>

      <DemandClient initialForecast={forecast as any[]} />

      {/* Auto-reorder: generate draft POs from shortfalls */}
      <AutoReorderPanel />

      <p className="text-xs text-stone-600 text-right">
        <Link href="/inventory/reorder" className="hover:text-stone-400">
          Configure reorder rules (par levels + quantities) &rarr;
        </Link>
      </p>
    </div>
  )
}
