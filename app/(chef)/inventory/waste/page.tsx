// Waste Tracking Page
// Dashboard with waste analytics by reason, trend over time, and a log form.

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWasteDashboard, getWasteTrend } from '@/lib/inventory/waste-actions'
import { WasteLogForm } from '@/components/inventory/waste-log-form'

const WasteDashboard = dynamic(
  () => import('@/components/inventory/waste-dashboard').then((m) => m.WasteDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export const metadata: Metadata = { title: 'Waste Tracking - ChefFlow' }

export default async function WasteTrackingPage() {
  await requireChef()

  const [dashboard, trend] = await Promise.all([
    getWasteDashboard().catch(() => ({
      byReason: [],
      totalCostCents: 0,
      totalEntries: 0,
    })),
    getWasteTrend(6).catch(() => []),
  ])

  // Normalize dashboard shape for the component
  const dashboardData = {
    byReason: ((dashboard as any).byReason ?? []).map((r: any) => ({
      reason: r.reason,
      count: r.entryCount ?? r.count ?? 0,
      totalCostCents: r.totalCostCents ?? 0,
    })),
    totalCostCents: (dashboard as any).totalCostCents ?? 0,
    totalEntries: (dashboard as any).totalEntries ?? 0,
  }

  const trendData = (trend as any[]).map((t: any) => ({
    month: t.month,
    costCents: t.costCents ?? t.totalCostCents ?? 0,
    count: t.count ?? t.entryCount ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Waste Tracking</h1>
        <p className="text-stone-500 mt-1">
          Log food waste after each event or prep session. Track cost by reason and identify
          patterns to reduce waste.
        </p>
      </div>

      {/* Analytics dashboard */}
      <WasteDashboard dashboard={dashboardData} trend={trendData} />

      {/* Log new waste entry */}
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Log Waste</h2>
        <WasteLogForm />
      </div>
    </div>
  )
}
