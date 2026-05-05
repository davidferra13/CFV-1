'use client'

import type { CoverageSummary } from '@/lib/pricing/region-coverage-actions'

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'ok'
      ? 'bg-emerald-400'
      : status === 'degraded'
        ? 'bg-amber-400'
        : status === 'stale'
          ? 'bg-orange-400'
          : 'bg-red-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
      <div className="text-xs text-stone-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-stone-100 mt-1">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    </div>
  )
}

export function PricingHealthDashboard({ data }: { data: CoverageSummary }) {
  return (
    <div className="space-y-8 p-6 max-w-7xl">
      <h1 className="text-xl font-semibold text-stone-100">Pricing Intelligence Engine Health</h1>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Regions"
          value={data.activeRegions}
          sub={`${data.regionsWithPrices} with prices`}
        />
        <StatCard label="Resolved Prices" value={data.totalResolvedPrices.toLocaleString()} />
        <StatCard label="Avg Coverage" value={`${data.avgCoverage}%`} />
        <StatCard label="Avg Confidence" value={data.avgConfidence.toFixed(2)} />
        <StatCard label="Chef Overrides" value={data.feedbackSummary.chefOverrides} />
        <StatCard
          label="Feedback (7d)"
          value={data.feedbackSummary.recentFeedback}
          sub={`${data.feedbackSummary.totalFeedback} total`}
        />
      </div>

      {/* Feedback breakdown */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-stone-300 mb-3">Feedback Breakdown</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-emerald-400">
              {data.feedbackSummary.confirmed}
            </div>
            <div className="text-xs text-stone-500">Confirmed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-amber-400">
              {data.feedbackSummary.tooHigh}
            </div>
            <div className="text-xs text-stone-500">Too High</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-sky-400">{data.feedbackSummary.tooLow}</div>
            <div className="text-xs text-stone-500">Too Low</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-400">
              {data.feedbackSummary.wrongItem}
            </div>
            <div className="text-xs text-stone-500">Wrong Item</div>
          </div>
        </div>
      </div>

      {/* Source health */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-stone-300 mb-3">Source Health</h2>
        {data.sourceHealth.length === 0 ? (
          <p className="text-xs text-stone-500">
            No health checks recorded yet. Run /api/cron/source-health.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-800">
                <th className="text-left py-2 pr-4">Source</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-right py-2 pr-4">Records</th>
                <th className="text-left py-2 pr-4">Freshest</th>
                <th className="text-left py-2">Checked</th>
              </tr>
            </thead>
            <tbody>
              {data.sourceHealth.map((s) => (
                <tr key={s.sourceName} className="border-b border-stone-800/50">
                  <td className="py-2 pr-4 text-stone-300 font-mono">{s.sourceName}</td>
                  <td className="py-2 pr-4 text-stone-500">{s.sourceType}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className="text-stone-400">{s.status}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right text-stone-400">
                    {s.recordCount.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-stone-500">
                    {s.freshestRecordAt
                      ? new Date(s.freshestRecordAt).toLocaleDateString()
                      : 'never'}
                  </td>
                  <td className="py-2 text-stone-500">{new Date(s.checkedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Region coverage table */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-stone-300 mb-3">
          Region Coverage ({data.regionCoverage.length} regions)
        </h2>
        {data.regionCoverage.length === 0 ? (
          <p className="text-xs text-stone-500">
            No pricing regions found. Run the resolve-prices cron first.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-stone-900">
                <tr className="text-stone-500 border-b border-stone-800">
                  <th className="text-left py-2 pr-3">Region</th>
                  <th className="text-left py-2 pr-3">State</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-right py-2 pr-3">Cost Idx</th>
                  <th className="text-right py-2 pr-3">Ingredients</th>
                  <th className="text-right py-2 pr-3">Coverage</th>
                  <th className="text-right py-2 pr-3">Confidence</th>
                  <th className="text-left py-2">Freshest</th>
                </tr>
              </thead>
              <tbody>
                {data.regionCoverage.map((r) => (
                  <tr
                    key={r.regionId}
                    className="border-b border-stone-800/50 hover:bg-stone-800/30"
                  >
                    <td
                      className="py-1.5 pr-3 text-stone-300 max-w-[200px] truncate"
                      title={r.regionName}
                    >
                      {r.regionName}
                    </td>
                    <td className="py-1.5 pr-3 text-stone-400">{r.state}</td>
                    <td className="py-1.5 pr-3 text-stone-500">{r.regionType}</td>
                    <td className="py-1.5 pr-3 text-right text-stone-400">
                      {r.costIndex.toFixed(3)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-stone-400">
                      {r.ingredientsWithPrice}
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <span
                        className={
                          r.coveragePct >= 80
                            ? 'text-emerald-400'
                            : r.coveragePct >= 50
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {r.coveragePct}%
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-right text-stone-400">
                      {r.avgConfidence.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-stone-500">
                      {r.freshestPrice ? new Date(r.freshestPrice).toLocaleDateString() : 'none'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
