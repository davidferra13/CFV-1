// Benchmarks — Track performance metrics over time
// Compare current period against historical averages and industry targets

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getBenchmarkHistory } from '@/lib/analytics/benchmark-actions'

const BenchmarkDashboard = dynamic(
  () => import('@/components/analytics/benchmark-dashboard').then((m) => m.BenchmarkDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

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
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Benchmarks</h1>
          <p className="text-stone-400 mt-1">
            Track your key performance metrics against historical trends and targets.
          </p>
        </div>
      </div>

      {benchmarkHistory && benchmarkHistory.length > 0 ? (
        <BenchmarkDashboard
          current={{
            avgEventValueCents: benchmarkHistory[benchmarkHistory.length - 1].avgEventValueCents,
            avgFoodCostPct: benchmarkHistory[benchmarkHistory.length - 1].avgFoodCostPct,
            bookingConversionRate:
              benchmarkHistory[benchmarkHistory.length - 1].bookingConversionRate,
            clientReturnRate: benchmarkHistory[benchmarkHistory.length - 1].clientReturnRate,
            revenuePerHourCents: benchmarkHistory[benchmarkHistory.length - 1].revenuePerHourCents,
          }}
          history={benchmarkHistory.map((s) => ({
            date: s.snapshotDate,
            avgEventValueCents: s.avgEventValueCents,
            avgFoodCostPct: s.avgFoodCostPct,
            bookingConversionRate: s.bookingConversionRate,
            clientReturnRate: s.clientReturnRate,
            revenuePerHourCents: s.revenuePerHourCents,
          }))}
        />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Not enough data yet to generate benchmarks. Complete a few more events to see your
            trends.
          </p>
        </div>
      )}
    </div>
  )
}
