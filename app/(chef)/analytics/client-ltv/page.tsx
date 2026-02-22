// Client Lifetime Value — Rank clients by total revenue contribution
// Helps identify top clients for retention and VIP treatment

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTopClientsByLTV } from '@/lib/analytics/client-ltv-actions'
import { ClientLTVChart } from '@/components/analytics/client-ltv-chart'

export const metadata: Metadata = { title: 'Client Value - ChefFlow' }

export default async function ClientLTVPage() {
  const user = await requireChef()

  const topClients = await getTopClientsByLTV().catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-700">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-1">Client Value</h1>
          <p className="text-stone-600 mt-1">
            Your top clients ranked by total revenue contribution across all events.
          </p>
        </div>
        <Link
          href="/clients"
          className="inline-flex items-center justify-center px-3 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm shrink-0"
        >
          View All Clients
        </Link>
      </div>

      {(topClients as any[]).length > 0 ? (
        <ClientLTVChart clients={topClients as any[]} />
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No client revenue data yet. Complete events with payments to see lifetime value
            rankings.
          </p>
        </div>
      )}
    </div>
  )
}
