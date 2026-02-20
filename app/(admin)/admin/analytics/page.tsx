// Admin Analytics — Platform-wide growth and revenue trends

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformGrowthStats, getPlatformRevenueByMonth, getPlatformOverviewStats } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default async function AdminAnalyticsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const [growth, revenue, overview] = await Promise.allSettled([
    getPlatformGrowthStats(),
    getPlatformRevenueByMonth(),
    getPlatformOverviewStats(),
  ])

  const growthData = growth.status === 'fulfilled' ? growth.value : []
  const revenueData = revenue.status === 'fulfilled' ? revenue.value : []
  const overviewData = overview.status === 'fulfilled' ? overview.value : null

  const maxRevenue = Math.max(...revenueData.map((d) => d.gmvCents), 1)
  const maxGrowth = Math.max(...growthData.map((d) => Math.max(d.newChefs, d.newClients)), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <BarChart3 size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Analytics</h1>
          <p className="text-sm text-slate-500">Growth, revenue, and engagement across all tenants</p>
        </div>
      </div>

      {/* Summary KPIs */}
      {overviewData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Chefs</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{overviewData.totalChefs}</p>
            <p className="text-xs text-slate-400 mt-1">+{overviewData.chefsThisMonth} this month</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Active Rate</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {overviewData.totalChefs > 0
                ? Math.round((overviewData.eventsThisMonth / overviewData.totalChefs) * 100)
                : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">chefs w/ events this month</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Platform GMV</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCents(overviewData.totalGMV)}</p>
            <p className="text-xs text-slate-400 mt-1">{formatCents(overviewData.gmvThisMonth)} this month</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Avg GMV / Chef</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCents(overviewData.avgGMVPerChef)}</p>
            <p className="text-xs text-slate-400 mt-1">all-time average</p>
          </div>
        </div>
      )}

      {/* Revenue by Month */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Platform GMV by Month (last 12 months)</h2>
        {revenueData.length === 0 ? (
          <p className="text-sm text-slate-400">No revenue data yet.</p>
        ) : (
          <div className="space-y-2">
            {revenueData.map((d) => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16 shrink-0">{d.month}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all"
                    style={{ width: `${(d.gmvCents / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 w-20 text-right shrink-0">
                  {formatCents(d.gmvCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chef + Client Growth */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">New Signups by Month (last 12 months)</h2>
        {growthData.length === 0 ? (
          <p className="text-sm text-slate-400">No signup data yet.</p>
        ) : (
          <div className="space-y-3">
            {growthData.map((d) => (
              <div key={d.month} className="space-y-1">
                <span className="text-xs text-slate-500">{d.month}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-500 w-14 shrink-0">Chefs</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${(d.newChefs / maxGrowth) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 w-6 text-right shrink-0">{d.newChefs}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-500 w-14 shrink-0">Clients</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${(d.newClients / maxGrowth) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 w-6 text-right shrink-0">{d.newClients}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
