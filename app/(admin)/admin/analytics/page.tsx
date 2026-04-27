// Admin Analytics - Platform-wide growth and revenue trends

import { requireAdmin } from '@/lib/auth/admin'
import {
  getPlatformGrowthStats,
  getPlatformRevenueByMonth,
  getPlatformOverviewStats,
} from '@/lib/admin/platform-stats'
import {
  getSyncHealthSummary,
  getQuarantineStats,
  getPricingCoverage,
} from '@/lib/admin/openclaw-health-actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3 } from '@/components/ui/icons'
import { ErrorState } from '@/components/ui/error-state'
import { RetryButton } from '@/components/ui/retry-button'

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default async function AdminAnalyticsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const [growth, revenue, overview, syncHealth, quarantine, pricing] = await Promise.allSettled([
    getPlatformGrowthStats(),
    getPlatformRevenueByMonth(),
    getPlatformOverviewStats(),
    getSyncHealthSummary(),
    getQuarantineStats(),
    getPricingCoverage(),
  ])

  const growthData = growth.status === 'fulfilled' ? growth.value : null
  const revenueData = revenue.status === 'fulfilled' ? revenue.value : null
  const overviewData = overview.status === 'fulfilled' ? overview.value : null

  const syncData = syncHealth.status === 'fulfilled' ? syncHealth.value.data : null
  const quarantineData = quarantine.status === 'fulfilled' ? quarantine.value.data : null
  const pricingData = pricing.status === 'fulfilled' ? pricing.value.data : null
  const pricingGovernor = pricingData?.governor
  const governorReady = Boolean(pricingGovernor?.ready)

  const maxRevenue = revenueData ? Math.max(...revenueData.map((d) => d.gmvCents), 1) : 1
  const maxGrowth = growthData
    ? Math.max(...growthData.map((d) => Math.max(d.newChefs, d.newClients)), 1)
    : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-950 rounded-lg">
          <BarChart3 size={18} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Platform Analytics</h1>
          <p className="text-sm text-stone-500">
            Growth, revenue, and engagement across all tenants
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      {overview.status === 'rejected' && (
        <div>
          <ErrorState
            title="Could not load overview"
            description="Platform stats query failed."
            size="sm"
          />
          <div className="flex justify-center">
            <RetryButton />
          </div>
        </div>
      )}
      {overviewData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              Total Chefs
            </p>
            <p className="text-2xl font-bold text-stone-100 mt-1">{overviewData.totalChefs}</p>
            <p className="text-xs text-slate-400 mt-1">+{overviewData.chefsThisMonth} this month</p>
          </div>
          <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              Active Rate
            </p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {overviewData.totalChefs > 0
                ? Math.round((overviewData.eventsThisMonth / overviewData.totalChefs) * 100)
                : 0}
              %
            </p>
            <p className="text-xs text-slate-400 mt-1">chefs w/ events this month</p>
          </div>
          <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              Platform GMV
            </p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {formatCents(overviewData.totalGMV)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {formatCents(overviewData.gmvThisMonth)} this month
            </p>
          </div>
          <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
              Avg GMV / Chef
            </p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {formatCents(overviewData.avgGMVPerChef)}
            </p>
            <p className="text-xs text-slate-400 mt-1">all-time average</p>
          </div>
        </div>
      )}

      {/* Revenue by Month */}
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
        <h2 className="text-sm font-semibold text-stone-300 mb-4">
          Platform GMV by Month (last 12 months)
        </h2>
        {revenueData === null ? (
          <div>
            <ErrorState
              title="Could not load revenue data"
              description="The platform revenue query failed."
              size="sm"
            />
            <div className="flex justify-center">
              <RetryButton />
            </div>
          </div>
        ) : revenueData.length === 0 ? (
          <p className="text-sm text-slate-400">No revenue data yet.</p>
        ) : (
          <div className="space-y-2">
            {revenueData.map((d) => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs text-stone-500 w-16 shrink-0">{d.month}</span>
                <div className="flex-1 bg-stone-800 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all"
                    style={{ width: `${(d.gmvCents / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-stone-300 w-20 text-right shrink-0">
                  {formatCents(d.gmvCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chef + Client Growth */}
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
        <h2 className="text-sm font-semibold text-stone-300 mb-4">
          New Signups by Month (last 12 months)
        </h2>
        {growthData === null ? (
          <div>
            <ErrorState
              title="Could not load growth data"
              description="The signup growth query failed."
              size="sm"
            />
            <div className="flex justify-center">
              <RetryButton />
            </div>
          </div>
        ) : growthData.length === 0 ? (
          <p className="text-sm text-slate-400">No signup data yet.</p>
        ) : (
          <div className="space-y-3">
            {growthData.map((d) => (
              <div key={d.month} className="space-y-1">
                <span className="text-xs text-stone-500">{d.month}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-500 w-14 shrink-0">Chefs</span>
                  <div className="flex-1 bg-stone-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full"
                      style={{ width: `${(d.newChefs / maxGrowth) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-6 text-right shrink-0">
                    {d.newChefs}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-500 w-14 shrink-0">Clients</span>
                  <div className="flex-1 bg-stone-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${(d.newClients / maxGrowth) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-6 text-right shrink-0">
                    {d.newClients}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Engine Health */}
      {(syncData || quarantineData || pricingData) && (
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-300">Data Engine Health</h2>
            <Link
              href="/admin/openclaw/health"
              className="text-xs text-brand-400 hover:text-brand-300 transition"
            >
              Full dashboard &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {syncData && (
              <div className="space-y-1">
                <p className="text-xs text-stone-500">Last Sync</p>
                <p
                  className={`text-sm font-medium ${
                    syncData.lastSyncAt &&
                    Date.now() - new Date(syncData.lastSyncAt).getTime() < 24 * 60 * 60 * 1000
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {syncData.lastSyncAt
                    ? new Date(syncData.lastSyncAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </p>
              </div>
            )}
            {syncData && (
              <div className="space-y-1">
                <p className="text-xs text-stone-500">Acceptance Rate</p>
                <p
                  className={`text-sm font-medium ${
                    syncData.avgAcceptanceRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {syncData.avgAcceptanceRate}%
                </p>
              </div>
            )}
            {quarantineData && (
              <div className="space-y-1">
                <p className="text-xs text-stone-500">Quarantined</p>
                <p
                  className={`text-sm font-medium ${
                    quarantineData.unreviewed > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {quarantineData.unreviewed} unreviewed
                </p>
              </div>
            )}
            {pricingData && (
              <div className="space-y-1">
                <p className="text-xs text-stone-500">
                  {governorReady ? 'Surfaceable Coverage' : 'Price Coverage'}
                </p>
                <p className="text-sm font-medium text-emerald-400">
                  {governorReady
                    ? Math.round(
                        (pricingGovernor!.summary.surfaceableCanonicalIngredients /
                          Math.max(pricingGovernor!.summary.expectedCanonicalIngredients, 1)) *
                          100
                      )
                    : Math.round(
                        (pricingData.ingredientsWithPrice /
                          Math.max(pricingData.totalIngredients, 1)) *
                          100
                      )}
                  %
                  <span className="text-stone-500 font-normal ml-1">
                    {governorReady
                      ? `(${pricingGovernor!.summary.surfaceableCanonicalIngredients}/${pricingGovernor!.summary.expectedCanonicalIngredients})`
                      : `(${pricingData.ingredientsWithPrice}/${pricingData.totalIngredients})`}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
