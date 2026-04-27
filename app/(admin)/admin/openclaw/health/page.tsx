// OpenClaw Health Dashboard - Quarantine review, sync health, and pricing coverage
// Admin-only (layout handles admin gate)

import { requireAdmin } from '@/lib/auth/admin'
import {
  getQuarantinedPrices,
  getQuarantineStats,
  getSyncAuditLog,
  getSyncHealthSummary,
  getPricingCoverage,
} from '@/lib/admin/openclaw-health-actions'
import { OpenClawHealthClient } from './health-client'
import { RetryButton } from '@/components/ui/retry-button'

export const metadata = {
  title: 'Data Engine Health | Admin',
}

export default async function OpenClawHealthPage() {
  await requireAdmin()

  const [quarantineStats, syncHealth, syncLog, quarantined, coverage] = await Promise.allSettled([
    getQuarantineStats(),
    getSyncHealthSummary(),
    getSyncAuditLog(30),
    getQuarantinedPrices(100),
    getPricingCoverage(),
  ])

  const stats = quarantineStats.status === 'fulfilled' ? quarantineStats.value.data : null
  const health = syncHealth.status === 'fulfilled' ? syncHealth.value.data : null
  const log = syncLog.status === 'fulfilled' ? syncLog.value.data : []
  const prices = quarantined.status === 'fulfilled' ? quarantined.value.data : []
  const coverageData = coverage.status === 'fulfilled' ? coverage.value.data : null
  const governor = coverageData?.governor
  const governorReady = Boolean(governor?.ready)

  const legacyCoveragePct = coverageData
    ? Math.round(
        (coverageData.ingredientsWithPrice / Math.max(coverageData.totalIngredients, 1)) * 100
      )
    : null

  const sourceFrontierPct = governorReady
    ? Math.round(
        (governor!.summary.discoveredSourceSurfaces /
          Math.max(governor!.summary.expectedSourceSurfaces, 1)) *
          100
      )
    : legacyCoveragePct

  const surfaceableIngredientPct = governorReady
    ? Math.round(
        (governor!.summary.surfaceableCanonicalIngredients /
          Math.max(governor!.summary.expectedCanonicalIngredients, 1)) *
          100
      )
    : null

  const observedStorePct = governorReady
    ? Math.round(
        (governor!.summary.freshObservedStoreSurfaces /
          Math.max(governor!.summary.discoveredStoreSurfaces, 1)) *
          100
      )
    : null

  const anyError =
    (quarantineStats.status === 'fulfilled' && quarantineStats.value.error) ||
    (syncHealth.status === 'fulfilled' && syncHealth.value.error) ||
    (syncLog.status === 'fulfilled' && syncLog.value.error) ||
    (quarantined.status === 'fulfilled' && quarantined.value.error) ||
    (coverage.status === 'fulfilled' && coverage.value.error)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-stone-800 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-400"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Data Engine Health</h1>
          <p className="text-sm text-stone-500">
            Quarantine review, sync history, and pricing coverage
          </p>
        </div>
      </div>

      {anyError && (
        <div className="bg-amber-950/50 border border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-200">
          <p>Some data could not be loaded. Partial results shown.</p>
          <RetryButton />
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KPICard
          label="Quarantined"
          value={stats?.unreviewed ?? 0}
          sub={`${stats?.total ?? 0} total`}
          color={stats?.unreviewed && stats.unreviewed > 0 ? 'amber' : 'green'}
        />
        <KPICard
          label="Acceptance Rate"
          value={health ? `${health.avgAcceptanceRate}%` : 'N/A'}
          sub="last 30 days"
          color={health && health.avgAcceptanceRate >= 90 ? 'green' : 'amber'}
        />
        <KPICard
          label="Last Sync"
          value={health?.lastSyncAt ? formatTimeAgo(health.lastSyncAt) : 'Never'}
          sub={health ? `${health.totalSyncs} syncs` : ''}
          color={health?.lastSyncAt && isRecent(health.lastSyncAt, 24) ? 'green' : 'red'}
        />
        <KPICard
          label={governorReady ? 'Source Frontier' : 'Price Coverage'}
          value={sourceFrontierPct != null ? `${sourceFrontierPct}%` : 'N/A'}
          sub={
            governorReady
              ? `${governor!.summary.discoveredSourceSurfaces}/${governor!.summary.expectedSourceSurfaces} sources`
              : coverageData
                ? `${coverageData.ingredientsWithPrice}/${coverageData.totalIngredients}`
                : ''
          }
          color="green"
        />
        <KPICard
          label={governorReady ? 'Surfaceable' : 'Fresh (7d)'}
          value={
            governorReady
              ? surfaceableIngredientPct != null
                ? `${surfaceableIngredientPct}%`
                : 'N/A'
              : (coverageData?.freshLast7d ?? 0)
          }
          sub={
            governorReady
              ? `${governor!.summary.surfaceableCanonicalIngredients}/${governor!.summary.expectedCanonicalIngredients} ingredients`
              : `${coverageData?.freshLast24h ?? 0} in 24h`
          }
          color="blue"
        />
        <KPICard
          label={governorReady ? 'Observed Stores' : 'Fresh (24h)'}
          value={
            governorReady
              ? observedStorePct != null
                ? `${observedStorePct}%`
                : 'N/A'
              : (coverageData?.freshLast24h ?? 0)
          }
          sub={
            governorReady
              ? `${governor!.summary.freshObservedStoreSurfaces}/${governor!.summary.discoveredStoreSurfaces} stores`
              : ''
          }
          color="green"
        />
      </div>

      {governorReady && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CoverageTable title="State Frontier" noun="stores" rows={governor!.stateCoverage} />
          <CoverageTable
            title="Category Frontier"
            noun="ingredients"
            rows={governor!.categoryCoverage}
          />
        </div>
      )}

      {/* Quarantine Stats Breakdown */}
      {stats && (stats.byReason.length > 0 || stats.bySource.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.byReason.length > 0 && (
            <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
              <h2 className="text-sm font-semibold text-stone-300 mb-3">Quarantine by Reason</h2>
              <div className="space-y-2">
                {stats.byReason.map((r) => (
                  <div key={r.reason} className="flex items-center justify-between text-sm">
                    <span className="text-stone-400">{r.reason}</span>
                    <span className="text-stone-200 font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.bySource.length > 0 && (
            <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
              <h2 className="text-sm font-semibold text-stone-300 mb-3">Quarantine by Source</h2>
              <div className="space-y-2">
                {stats.bySource.map((s) => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="text-stone-400">{formatSource(s.source)}</span>
                    <span className="text-stone-200 font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client-side interactive sections: quarantine table + sync log */}
      <OpenClawHealthClient initialQuarantined={prices} initialSyncLog={log} />
    </div>
  )
}

// --- Helper components ---

function KPICard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub: string
  color: 'green' | 'amber' | 'red' | 'blue'
}) {
  const colorMap = {
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  }
  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-3">
      <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const hours = Math.floor((now - then) / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function isRecent(dateStr: string, maxHours: number): boolean {
  const hours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
  return hours < maxHours
}

function formatSource(source: string): string {
  return source
    .replace('openclaw_', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function CoverageTable({
  title,
  noun,
  rows,
}: {
  title: string
  noun: string
  rows: Array<{
    key: string
    label: string
    expectedCount: number
    discoveredCount: number
    observedCount: number
    inferableCount: number
    surfaceableCount: number
  }>
}) {
  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-300">{title}</h2>
        <span className="text-xs text-stone-500 uppercase tracking-wide">{noun}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">No governor rows yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="pb-2 font-medium">Scope</th>
                <th className="pb-2 font-medium text-right">Expected</th>
                <th className="pb-2 font-medium text-right">Seen</th>
                <th className="pb-2 font-medium text-right">Observed</th>
                <th className="pb-2 font-medium text-right">Inferable</th>
                <th className="pb-2 font-medium text-right">Surfaceable</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-stone-800">
                  <td className="py-2 text-stone-300">{row.label}</td>
                  <td className="py-2 text-right text-stone-400">{row.expectedCount}</td>
                  <td className="py-2 text-right text-stone-400">{row.discoveredCount}</td>
                  <td className="py-2 text-right text-emerald-400">{row.observedCount}</td>
                  <td className="py-2 text-right text-blue-400">{row.inferableCount}</td>
                  <td className="py-2 text-right text-amber-300">{row.surfaceableCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
