// Referral Source Analytics Page
// Dedicated analytics page showing referral source performance —
// which sources bring the most clients, highest-value events, and best conversion rates

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getReferralAnalytics } from '@/lib/analytics/referral-analytics'
import { ReferralAnalyticsDashboard } from '@/components/analytics/referral-analytics-dashboard'

export const metadata: Metadata = { title: 'Referral Sources - ChefFlow' }

export default async function ReferralSourcesPage() {
  await requireChef()

  const data = await getReferralAnalytics().catch(() => null)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Referral Sources</h1>
          <p className="text-stone-400 mt-1">
            Which sources bring the most clients, highest-value events, and best conversion rates.
          </p>
        </div>
      </div>

      {data ? (
        <ReferralAnalyticsDashboard data={data} />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Unable to load referral analytics. Please try again later.
          </p>
        </div>
      )}
    </div>
  )
}
