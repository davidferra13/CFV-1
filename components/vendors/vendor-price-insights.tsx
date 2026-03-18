'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buildCsvSafe } from '@/lib/security/csv-sanitize'
import type { VendorPriceAlert, VendorPriceTrend } from '@/lib/vendors/price-insights'

interface VendorPriceInsightsProps {
  alerts: VendorPriceAlert[]
  trends: VendorPriceTrend[]
  title?: string
  thresholdPercent?: number
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatPercent(value: number): string {
  const abs = Math.abs(value)
  return `${abs.toFixed(abs >= 10 ? 0 : 1)}%`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleDateString()
}

function buildSparkline(points: Array<{ price_cents: number }>, width = 140, height = 40): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M 0 ${height / 2} L ${width} ${height / 2}`

  const values = points.map((point) => point.price_cents)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const xStep = width / Math.max(1, points.length - 1)

  return points
    .map((point, idx) => {
      const x = Number((idx * xStep).toFixed(2))
      const normalizedY = (point.price_cents - min) / range
      const y = Number((height - normalizedY * height).toFixed(2))
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

export function VendorPriceInsights({
  alerts,
  trends,
  title = 'Price Alerts & Trends',
  thresholdPercent,
}: VendorPriceInsightsProps) {
  const upCount = alerts.filter((alert) => alert.direction === 'up').length
  const downCount = alerts.filter((alert) => alert.direction === 'down').length

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const exportAlertsCsv = () => {
    const headers = [
      'Vendor',
      'Item',
      'Unit',
      'Current Price USD',
      'Previous Price USD',
      'Delta USD',
      'Delta Percent',
      'Direction',
      'Changed At',
    ]
    const rows = alerts.map((alert) => [
      alert.vendor_name ?? 'Vendor',
      alert.item_name,
      alert.unit,
      (alert.current_price_cents / 100).toFixed(2),
      (alert.previous_price_cents / 100).toFixed(2),
      (alert.delta_cents / 100).toFixed(2),
      alert.delta_percent.toFixed(2),
      alert.direction,
      alert.changed_at,
    ])
    const csv = buildCsvSafe(headers, rows)
    downloadCsv(csv, `vendor-price-alerts-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const exportTrendsCsv = () => {
    const headers = [
      'Vendor',
      'Item',
      'Unit',
      'Latest Price USD',
      'Previous Price USD',
      'Direction',
      'Change Percent',
      'Recorded At',
      'Point Price USD',
    ]
    const rows: string[][] = []
    for (const trend of trends) {
      for (const point of trend.points) {
        rows.push([
          trend.vendor_name ?? 'Vendor',
          trend.item_name,
          trend.unit,
          (trend.latest_price_cents / 100).toFixed(2),
          ((trend.previous_price_cents ?? trend.latest_price_cents) / 100).toFixed(2),
          trend.direction,
          trend.change_percent == null ? '' : trend.change_percent.toFixed(2),
          point.recorded_at,
          (point.price_cents / 100).toFixed(2),
        ])
      }
    }
    const csv = buildCsvSafe(headers, rows)
    downloadCsv(csv, `vendor-price-trends-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-xs-tight uppercase tracking-wide text-stone-500">Recent Changes</p>
            <p className="text-base font-semibold text-stone-100">{alerts.length}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-xs-tight uppercase tracking-wide text-stone-500">Price Increases</p>
            <p className="text-base font-semibold text-red-300">{upCount}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-xs-tight uppercase tracking-wide text-stone-500">Price Drops</p>
            <p className="text-base font-semibold text-emerald-300">{downCount}</p>
          </div>
        </div>

        {typeof thresholdPercent === 'number' && (
          <p className="text-xs text-stone-500">
            Showing changes at or above {thresholdPercent.toFixed(1)}%.
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={exportAlertsCsv}
            disabled={alerts.length === 0}
          >
            Export Alerts CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={exportTrendsCsv}
            disabled={trends.length === 0}
          >
            Export Trends CSV
          </Button>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-400">
            No price changes detected yet. Price alerts will appear automatically as new vendor
            prices are added.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-800 text-left text-stone-400">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Current</th>
                  <th className="px-3 py-2">Previous</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 20).map((alert) => {
                  const isUp = alert.direction === 'up'
                  return (
                    <tr key={alert.key} className="border-b border-stone-800">
                      <td className="px-3 py-2 text-stone-200">
                        <p>{alert.item_name}</p>
                        <p className="text-xs-tight text-stone-500">/{alert.unit}</p>
                      </td>
                      <td className="px-3 py-2 text-stone-400">{alert.vendor_name ?? 'Vendor'}</td>
                      <td className="px-3 py-2 text-stone-100 font-medium">
                        {formatMoney(alert.current_price_cents)}
                      </td>
                      <td className="px-3 py-2 text-stone-400">
                        {formatMoney(alert.previous_price_cents)}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          isUp ? 'text-red-300' : 'text-emerald-300'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isUp ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {formatMoney(Math.abs(alert.delta_cents))} (
                          {formatPercent(alert.delta_percent)})
                        </span>
                      </td>
                      <td className="px-3 py-2 text-stone-400">{formatDate(alert.changed_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {trends.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {trends.slice(0, 10).map((trend) => {
              const path = buildSparkline(trend.points)
              const trendColor =
                trend.direction === 'up'
                  ? 'text-red-300'
                  : trend.direction === 'down'
                    ? 'text-emerald-300'
                    : 'text-stone-300'
              const strokeColor =
                trend.direction === 'up'
                  ? '#fca5a5'
                  : trend.direction === 'down'
                    ? '#86efac'
                    : '#a8a29e'

              return (
                <div
                  key={trend.key}
                  className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-stone-100 truncate">
                        {trend.item_name}
                      </p>
                      <p className="text-xs-tight text-stone-500">
                        {trend.vendor_name ?? 'Vendor'} / {trend.unit}
                      </p>
                    </div>
                    <div className={`text-xs font-medium ${trendColor}`}>
                      <span className="inline-flex items-center gap-1">
                        {trend.direction === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
                        {trend.direction === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
                        {trend.direction === 'flat' && <Minus className="h-3.5 w-3.5" />}
                        {trend.change_percent == null ? 'n/a' : formatPercent(trend.change_percent)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>
                      {formatMoney(trend.previous_price_cents ?? trend.latest_price_cents)}
                    </span>
                    <span className="text-stone-100 font-medium">
                      {formatMoney(trend.latest_price_cents)}
                    </span>
                  </div>

                  <svg
                    width="100%"
                    viewBox="0 0 140 40"
                    preserveAspectRatio="none"
                    className="h-10 w-full overflow-visible"
                    role="img"
                    aria-label={`Price trend for ${trend.item_name}`}
                  >
                    <path
                      d={path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
