'use client'

import { useEffect, useState, useTransition } from 'react'
import { getGrowthMetrics, type GrowthMetricsResult } from '@/lib/finance/yoy-comparison-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

type MetricRowProps = {
  label: string
  current: number
  previous: number
  changePercent: number | null
  format?: 'currency' | 'number'
  yearLabel: string
  prevYearLabel: string
}

function MetricRow({ label, current, previous, changePercent, format = 'number', yearLabel, prevYearLabel }: MetricRowProps) {
  const formatted = (v: number) => format === 'currency' ? formatCents(v) : v.toLocaleString()
  const isPositive = changePercent !== null && changePercent > 0
  const isNegative = changePercent !== null && changePercent < 0
  const isZero = changePercent !== null && changePercent === 0

  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <div className="mt-1 flex items-baseline gap-3 text-xs text-gray-500">
          <span>{prevYearLabel}: {formatted(previous)}</span>
          <span>{yearLabel}: {formatted(current)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isPositive && (
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l7.5-7.5 7.5 7.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12l7.5-7.5 7.5 7.5" />
          </svg>
        )}
        {isNegative && (
          <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-7.5 7.5-7.5-7.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
        <span
          className={`text-sm font-semibold ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : isZero ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          {changePercent === null
            ? 'New'
            : `${changePercent > 0 ? '+' : ''}${changePercent}%`}
        </span>
      </div>
    </div>
  )
}

type Props = {
  defaultYear?: number
}

export default function GrowthMetricsCard({ defaultYear }: Props) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(defaultYear ?? currentYear)
  const [data, setData] = useState<GrowthMetricsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await getGrowthMetrics(year)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load growth metrics')
        setData(null)
      }
    })
  }, [year])

  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Growth Metrics</h3>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y} vs {y - 1}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {isPending && !data && (
        <div className="flex h-32 items-center justify-center text-sm text-gray-400">Loading...</div>
      )}

      {data && (
        <div>
          <MetricRow
            label="Total Revenue"
            current={data.revenue.current}
            previous={data.revenue.previous}
            changePercent={data.revenue.changePercent}
            format="currency"
            yearLabel={String(data.year)}
            prevYearLabel={String(data.previousYear)}
          />
          <MetricRow
            label="Event Count"
            current={data.eventCount.current}
            previous={data.eventCount.previous}
            changePercent={data.eventCount.changePercent}
            yearLabel={String(data.year)}
            prevYearLabel={String(data.previousYear)}
          />
          <MetricRow
            label="Avg Event Value"
            current={data.avgEventValue.current}
            previous={data.avgEventValue.previous}
            changePercent={data.avgEventValue.changePercent}
            format="currency"
            yearLabel={String(data.year)}
            prevYearLabel={String(data.previousYear)}
          />
          <MetricRow
            label="Active Clients"
            current={data.clientCount.current}
            previous={data.clientCount.previous}
            changePercent={data.clientCount.changePercent}
            yearLabel={String(data.year)}
            prevYearLabel={String(data.previousYear)}
          />
        </div>
      )}
    </div>
  )
}
