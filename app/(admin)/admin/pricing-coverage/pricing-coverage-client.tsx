'use client'

import { useEffect, useState } from 'react'

interface CoverageData {
  totalRegions: number
  totalIngredients: number
  totalResolvedPrices: number
  avgConfidence: number
  coverageByRegionType: Array<{
    regionType: string
    regionCount: number
    avgIngredientsPerRegion: number
    avgConfidence: number
  }>
  coverageByMethod: Array<{
    method: string
    count: number
    avgConfidence: number
  }>
  lastRunAt: string | null
  lastRunDurationMs: number | null
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 65 ? 'bg-green-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function PricingCoverageClient() {
  const [data, setData] = useState<CoverageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchCoverage() {
    try {
      const res = await fetch('/api/pricing/coverage')
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coverage')
    } finally {
      setLoading(false)
    }
  }

  async function triggerRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/cron/resolve-prices', { method: 'POST' })
      if (!res.ok) throw new Error(`${res.status}`)
      await fetchCoverage()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCoverage()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Pricing Coverage</h1>
        <div className="mt-4 text-muted-foreground">Loading coverage data...</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Pricing Coverage</h1>
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Run the migration and seed script first:
          <code className="ml-1 rounded bg-gray-100 px-1 text-xs">
            npx tsx scripts/seed-pricing-regions.ts
          </code>
        </p>
      </div>
    )
  }

  if (!data) return null

  const lastRunAgo = data.lastRunAt
    ? Math.round((Date.now() - new Date(data.lastRunAt).getTime()) / (1000 * 60))
    : null

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pricing Coverage</h1>
          <p className="text-sm text-muted-foreground">
            National pricing intelligence: resolved prices across all regions
          </p>
        </div>
        <button
          onClick={triggerRefresh}
          disabled={refreshing}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh Prices'}
        </button>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Regions" value={data.totalRegions} sub="metro + rural" />
        <StatCard label="Ingredients Priced" value={data.totalIngredients.toLocaleString()} />
        <StatCard
          label="Resolved Prices"
          value={data.totalResolvedPrices.toLocaleString()}
          sub={`${data.totalRegions > 0 ? Math.round(data.totalResolvedPrices / data.totalRegions) : 0} per region avg`}
        />
        <StatCard
          label="Avg Confidence"
          value={`${Math.round(data.avgConfidence * 100)}%`}
          sub={
            data.avgConfidence >= 0.65
              ? 'Good'
              : data.avgConfidence >= 0.45
                ? 'Acceptable'
                : 'Needs improvement'
          }
        />
      </div>

      {/* Last run info */}
      {data.lastRunAt && (
        <div className="rounded border bg-muted/50 p-3 text-sm">
          Last refresh: {lastRunAgo} min ago
          {data.lastRunDurationMs && (
            <span className="ml-2 text-muted-foreground">
              ({Math.round(data.lastRunDurationMs / 1000)}s)
            </span>
          )}
        </div>
      )}

      {/* Coverage by region type */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Coverage by Region Type</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Regions</th>
                <th className="py-2 pr-4">Avg Ingredients</th>
                <th className="py-2">Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              {data.coverageByRegionType.map((row) => (
                <tr key={row.regionType} className="border-b">
                  <td className="py-2 pr-4 font-medium capitalize">{row.regionType}</td>
                  <td className="py-2 pr-4">{row.regionCount}</td>
                  <td className="py-2 pr-4">{row.avgIngredientsPerRegion}</td>
                  <td className="py-2">
                    <ConfidenceBar value={row.avgConfidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coverage by computation method */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Coverage by Computation Method</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Count</th>
                <th className="py-2">Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              {data.coverageByMethod.map((row) => (
                <tr key={row.method} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{row.method}</td>
                  <td className="py-2 pr-4">{row.count.toLocaleString()}</td>
                  <td className="py-2">
                    <ConfidenceBar value={row.avgConfidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scorecard */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Health Scorecard</h2>
        <div className="space-y-2 text-sm">
          <ScoreRow
            label="Ingredient coverage"
            value={data.totalIngredients}
            good={450}
            acceptable={350}
            unit=" ingredients"
          />
          <ScoreRow
            label="Avg confidence"
            value={Math.round(data.avgConfidence * 100)}
            good={65}
            acceptable={45}
            unit="%"
          />
          <ScoreRow
            label="Prices per region"
            value={
              data.totalRegions > 0 ? Math.round(data.totalResolvedPrices / data.totalRegions) : 0
            }
            good={200}
            acceptable={100}
            unit=""
          />
        </div>
      </div>
    </div>
  )
}

function ScoreRow({
  label,
  value,
  good,
  acceptable,
  unit,
}: {
  label: string
  value: number
  good: number
  acceptable: number
  unit: string
}) {
  const status = value >= good ? 'Good' : value >= acceptable ? 'Acceptable' : 'Bad'
  const color =
    status === 'Good'
      ? 'text-green-600'
      : status === 'Acceptable'
        ? 'text-yellow-600'
        : 'text-red-600'

  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-medium ${color}`}>
        {value}
        {unit} ({status})
      </span>
    </div>
  )
}
