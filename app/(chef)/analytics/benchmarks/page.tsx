// Benchmarks — Track performance metrics over time
// Compare current period against historical averages and industry targets

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getBenchmarkHistory } from '@/lib/analytics/benchmark-actions'
import { BenchmarkDashboard } from '@/components/analytics/benchmark-dashboard'

export const metadata: Metadata = { title: 'Benchmarks - ChefFlow' }

export default async function BenchmarksPage() {
  const user = await requireChef()

  let benchmarkHistory: Awaited<ReturnType<typeof getBenchmarkHistory>> | null = null
  try {
    benchmarkHistory = await getBenchmarkHistory()
  } catch {
    benchmarkHistory = null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-700">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-1">Benchmarks</h1>
          <p className="text-stone-600 mt-1">
            Track your key performance metrics against historical trends and targets.
          </p>
        </div>
      </div>

      {benchmarkHistory && benchmarkHistory.length > 0 ? (
        <BenchmarkDashboard
          current={{
            avgEventValueCents: benchmarkHistory[benchmarkHistory.length - 1].avgEventValueCents,
            avgFoodCostPct: benchmarkHistory[benchmarkHistory.length - 1].avgFoodCostPct,
            bookingConversionRate: benchmarkHistory[benchmarkHistory.length - 1].bookingConversionRate,
            clientReturnRate: benchmarkHistory[benchmarkHistory.length - 1].clientReturnRate,
            revenuePerHourCents: benchmarkHistory[benchmarkHistory.length - 1].revenuePerHourCents,
          }}
          history={benchmarkHistory.map(s => ({
            date: s.snapshotDate,
            avgEventValueCents: s.avgEventValueCents,
            avgFoodCostPct: s.avgFoodCostPct,
            bookingConversionRate: s.bookingConversionRate,
            clientReturnRate: s.clientReturnRate,
            revenuePerHourCents: s.revenuePerHourCents,
          }))}
        />
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Not enough data yet to generate benchmarks. Complete a few more events to see your trends.
          </p>
        </div>
      )}
    </div>
  )
}
