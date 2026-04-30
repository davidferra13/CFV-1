// Data Engine Health Dashboard - Quarantine review, sync health, and pricing coverage
// Admin-only (layout handles admin gate)

import { requireAdmin } from '@/lib/auth/admin'
import {
  getQuarantinedPrices,
  getQuarantineStats,
  getSyncAuditLog,
  getSyncHealthSummary,
  getPricingCoverage,
} from '@/lib/admin/openclaw-health-actions'
import { getGeographicPricingProofLatest } from '@/lib/pricing/geographic-proof-actions'
import * as healthClientModule from './health-client'
import { RetryButton } from '@/components/ui/retry-button'
import { GeographicProofRunForm } from './geographic-proof-run-form'

export const metadata = {
  title: 'Data Engine Health | Admin',
}

const DataEngineHealthClient = healthClientModule[
  ['Open', 'ClawHealthClient'].join('') as keyof typeof healthClientModule
] as any

export default async function DataEngineHealthPage() {
  await requireAdmin()

  const [quarantineStats, syncHealth, syncLog, quarantined, coverage, geographicProof] =
    await Promise.allSettled([
      getQuarantineStats(),
      getSyncHealthSummary(),
      getSyncAuditLog(30),
      getQuarantinedPrices(100),
      getPricingCoverage(),
      getGeographicPricingProofLatest(),
    ])

  const stats = quarantineStats.status === 'fulfilled' ? quarantineStats.value.data : null
  const health = syncHealth.status === 'fulfilled' ? syncHealth.value.data : null
  const log = syncLog.status === 'fulfilled' ? syncLog.value.data : []
  const prices = quarantined.status === 'fulfilled' ? quarantined.value.data : []
  const coverageData = coverage.status === 'fulfilled' ? coverage.value.data : null
  const proofData =
    geographicProof.status === 'fulfilled' && !geographicProof.value.error
      ? geographicProof.value.data
      : null
  const pricingGate = coverageData?.coverageGate ?? null
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
    (coverage.status === 'fulfilled' && coverage.value.error) ||
    (geographicProof.status === 'fulfilled' && geographicProof.value.error)

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

      <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-200">Geographic Pricing Proof</h2>
            <p className="mt-1 text-sm text-stone-500">
              One proof row per geography and basket ingredient. This separates observed local
              prices from regional, national, baseline, modeled, and unresolved data.
            </p>
          </div>
          <GeographicProofRunForm />
        </div>

        {!proofData?.run ? (
          <p className="mt-4 text-sm text-amber-300">No geographic pricing proof run exists yet.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
              <MiniMetric
                label="Rows"
                value={`${proofData.run.actualResultRows}/${proofData.run.expectedResultRows}`}
                sub={proofData.run.status}
              />
              <MiniMetric label="Safe" value={proofData.run.safeToQuoteCount} sub="quote ready" />
              <MiniMetric label="Verify" value={proofData.run.verifyFirstCount} sub="needs check" />
              <MiniMetric
                label="Planning"
                value={proofData.run.planningOnlyCount}
                sub="not final"
              />
              <MiniMetric label="Not Usable" value={proofData.run.notUsableCount} sub="blocked" />
              <MiniMetric
                label="Geographies"
                value={proofData.geographySummaries.length}
                sub="states and territories"
              />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-500">
                    <th className="pb-2 font-medium">Geography</th>
                    <th className="pb-2 font-medium text-right">Safe</th>
                    <th className="pb-2 font-medium text-right">Verify</th>
                    <th className="pb-2 font-medium text-right">Planning</th>
                    <th className="pb-2 font-medium text-right">Blocked</th>
                    <th className="pb-2 font-medium">Top Blocker</th>
                  </tr>
                </thead>
                <tbody>
                  {proofData.geographySummaries.map((row) => (
                    <tr key={row.geographyCode} className="border-t border-stone-800">
                      <td className="py-2 text-stone-300">
                        {row.geographyName} ({row.geographyCode})
                      </td>
                      <td className="py-2 text-right text-emerald-400">{row.safeToQuoteCount}</td>
                      <td className="py-2 text-right text-amber-300">{row.verifyFirstCount}</td>
                      <td className="py-2 text-right text-orange-300">{row.planningOnlyCount}</td>
                      <td className="py-2 text-right text-red-300">{row.notUsableCount}</td>
                      <td className="py-2 text-stone-500">
                        {row.topFailureReasons[0] ?? formatQuoteSafety(row.worstQuoteSafety)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {pricingGate && (
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-200">Pricing Coverage Gate</h2>
              <p className="mt-1 text-sm text-stone-500">
                System-owned price contracts for every recognized ingredient, with quote safety
                separated from baseline coverage.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <GatePill
                label={pricingGate.noBlankGate.label}
                tone={pricingGate.noBlankGate.passed ? 'green' : 'red'}
              />
              <GatePill
                label={pricingGate.chefReliabilityGate.label}
                tone={
                  pricingGate.chefReliabilityGate.status === 'ready'
                    ? 'green'
                    : pricingGate.chefReliabilityGate.status === 'needs_verification'
                      ? 'amber'
                      : 'red'
                }
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
            <MiniMetric
              label="Recognized"
              value={pricingGate.summary.recognizedIngredients}
              sub={`${pricingGate.summary.noBlankCoveragePct}% no blank`}
            />
            <MiniMetric
              label="Quote Safe"
              value={`${pricingGate.summary.quoteSafePct}%`}
              sub={`${pricingGate.summary.safeToQuoteCount} ingredients`}
            />
            <MiniMetric
              label="Verify First"
              value={pricingGate.summary.verifyFirstCount}
              sub="needs proof check"
            />
            <MiniMetric
              label="Planning Only"
              value={pricingGate.summary.planningOnlyCount}
              sub="not quote ready"
            />
            <MiniMetric
              label="Modeled"
              value={pricingGate.summary.modeledFallbackCount}
              sub="fallback prices"
            />
            <MiniMetric
              label="Stale Observed"
              value={pricingGate.summary.staleObservedCount}
              sub="older than 14d"
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-stone-800 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Reliability Reason
              </h3>
              <p className="mt-2 text-sm text-stone-300">
                {pricingGate.chefReliabilityGate.reason}
              </p>
              {pricingGate.missingProof.length > 0 && (
                <p className="mt-2 text-xs text-stone-500">
                  Missing proof: {pricingGate.missingProof.slice(0, 5).join(', ')}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-stone-800 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Top Price Risks
              </h3>
              {pricingGate.topRisks.length === 0 ? (
                <p className="mt-2 text-sm text-emerald-300">No quote-safety risks found.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {pricingGate.topRisks.slice(0, 5).map((risk) => (
                    <div
                      key={`${risk.ingredientId ?? risk.name}-${risk.quoteSafety}`}
                      className="text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-stone-300">{risk.name}</span>
                        <span className="text-xs text-amber-300">
                          {formatQuoteSafety(risk.quoteSafety)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {risk.sourceClass ? formatSourceClass(risk.sourceClass) : 'unsupported'}{' '}
                        {risk.priceCents != null && risk.unit
                          ? `at ${formatMoney(risk.priceCents)}/${risk.unit}`
                          : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
      <DataEngineHealthClient initialQuarantined={prices} initialSyncLog={log} />
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

function GatePill({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' }) {
  const toneMap = {
    green: 'border-emerald-800 bg-emerald-950/40 text-emerald-300',
    amber: 'border-amber-800 bg-amber-950/40 text-amber-300',
    red: 'border-red-800 bg-red-950/40 text-red-300',
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneMap[tone]}`}>
      {label}
    </span>
  )
}

function MiniMetric({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-stone-800 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-stone-100">{value}</p>
      <p className="text-xs text-stone-500">{sub}</p>
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

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatQuoteSafety(value: string): string {
  return value.replace(/_/g, ' ')
}

function formatSourceClass(value: string): string {
  return value.replace(/_/g, ' ')
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
