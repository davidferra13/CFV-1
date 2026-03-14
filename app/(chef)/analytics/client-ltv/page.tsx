// Client Lifetime Value — Rank clients by total revenue contribution
// Helps identify top clients for retention and VIP treatment

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTopClientsByLTV } from '@/lib/analytics/client-ltv-actions'

const ClientLTVChart = dynamic(
  () => import('@/components/analytics/client-ltv-chart').then((m) => m.ClientLTVChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export const metadata: Metadata = { title: 'Client Value - ChefFlow' }

export default async function ClientLTVPage() {
  const user = await requireChef()

  const topClients = await getTopClientsByLTV().catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Client Value</h1>
          <p className="text-stone-400 mt-1">
            Your top clients ranked by total revenue contribution across all events.
          </p>
        </div>
        <Link
          href="/clients"
          className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm shrink-0"
        >
          View All Clients
        </Link>
      </div>

      {(topClients as any[]).length > 0 ? (
        <ClientLTVChart clients={topClients as any[]} />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No client revenue data yet. Complete events with payments to see lifetime value
            rankings.
          </p>
        </div>
      )}
    </div>
  )
}
