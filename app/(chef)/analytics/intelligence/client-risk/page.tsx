// Client Risk Radar - proactive churn detection
// Shows which clients are at risk of leaving based on contact recency,
// booking patterns, revenue trends, and engagement signals.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientRiskRadar } from '@/lib/intelligence/client-risk-actions'
import { RiskRadarOverview } from '@/components/intelligence/risk-radar-overview'
import { ClientRiskRadarList } from './_client'

export const metadata: Metadata = { title: 'Client Risk Radar' }

export default async function ClientRiskRadarPage() {
  await requireChef()

  const result = await getClientRiskRadar().catch(() => null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Client Risk Radar</h1>
          <p className="text-stone-400 mt-1">
            Spot clients going quiet. Clients ranked by risk of disengagement based on contact
            recency, booking patterns, and revenue trends.
          </p>
        </div>
        <Link
          href="/clients"
          className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm shrink-0"
        >
          View All Clients
        </Link>
      </div>

      {/* Content */}
      {result ? (
        <>
          <RiskRadarOverview summary={result.summary} />
          <ClientRiskRadarList reports={result.reports} />
        </>
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Not enough data to calculate risk scores. Complete a few events with clients to start
            seeing churn risk analysis.
          </p>
        </div>
      )}
    </div>
  )
}
