'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getRevenueForecast,
  type RevenueForecast,
  type MonthlyForecastEntry,
} from '@/lib/finance/revenue-forecast-actions'

type RevenueForecastPanelProps = {
  initialForecast: RevenueForecast
  initialMonths?: number
}

function confidenceTone(level: RevenueForecast['confidence']['level']): string {
  if (level === 'high') return 'text-emerald-400'
  if (level === 'moderate') return 'text-brand-400'
  if (level === 'low') return 'text-amber-300'
  return 'text-red-400'
}

function driverToneClasses(
  tone: RevenueForecast['explainability']['drivers'][number]['tone']
): string {
  if (tone === 'positive') {
    return 'border-emerald-500/20 bg-emerald-500/10'
  }
  if (tone === 'neutral') {
    return 'border-brand-500/20 bg-brand-500/10'
  }
  return 'border-amber-500/20 bg-amber-500/10'
}

function monthLabel(month: string): string {
  const labels: Record<string, string> = {
    '01': 'Jan',
    '02': 'Feb',
    '03': 'Mar',
    '04': 'Apr',
    '05': 'May',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Aug',
    '09': 'Sep',
    '10': 'Oct',
    '11': 'Nov',
    '12': 'Dec',
  }

  return labels[month.split('-')[1]] || month
}

function qualityToneClasses(status: RevenueForecast['dataQuality']['overallStatus']): string {
  if (status === 'pass') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  if (status === 'warn') return 'border-amber-500/20 bg-amber-500/10 text-amber-200'
  return 'border-rose-500/20 bg-rose-500/10 text-rose-300'
}

function varianceToneClasses(entry: RevenueForecast['actualsReconciliation'][number]): string {
  if (entry.withinRange) return 'text-emerald-300'
  if ((entry.variancePct ?? 0) > 0) return 'text-amber-200'
  return 'text-sky-300'
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ForecastBarChart({ data }: { data: MonthlyForecastEntry[] }) {
  if (data.length === 0) return null

  const maxValue = Math.max(
    ...data.map((d) => d.highRevenueCents),
    ...data.map((d) => d.expectedRevenueCents),
    ...data.map((d) => d.historicalAvgCents),
    1
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-stone-400">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rounded-sm"
            style={{
              background:
                'repeating-linear-gradient(45deg, #6366f1 0px, #6366f1 2px, #4f46e5 2px, #4f46e5 4px)',
            }}
          />
          <span>Pipeline (weighted)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-amber-400/40" />
          <span>Seasonal fill</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-brand-400/40 bg-brand-500/10" />
          <span>Confidence range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 border-t-2 border-dotted border-stone-500" />
          <span>Historical baseline</span>
        </div>
      </div>

      <div className="flex items-end gap-2" style={{ height: 220 }}>
        {data.map((month) => {
          const bookedHeight = (month.bookedRevenueCents / maxValue) * 190
          const visibleHeight =
            ((month.bookedRevenueCents + month.pipelineRevenueCents) / maxValue) * 190
          const expectedHeight = (month.expectedRevenueCents / maxValue) * 190
          const lowHeight = (month.lowRevenueCents / maxValue) * 190
          const highHeight = (month.highRevenueCents / maxValue) * 190
          const historicalHeight = (month.historicalAvgCents / maxValue) * 190

          return (
            <div
              key={month.month}
              className="group relative flex flex-1 flex-col items-center gap-1"
            >
              <div className="absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200 shadow-lg group-hover:block">
                <p className="font-medium">{month.month}</p>
                <p>Expected: {formatCurrency(month.expectedRevenueCents)}</p>
                <p>
                  Range: {formatCurrency(month.lowRevenueCents)} -{' '}
                  {formatCurrency(month.highRevenueCents)}
                </p>
                <p>Booked: {formatCurrency(month.bookedRevenueCents)}</p>
                <p>
                  Pipeline: {formatCurrency(month.pipelineRevenueCents)} / raw{' '}
                  {formatCurrency(month.pipelineOpenRevenueCents)}
                </p>
                <p>Seasonal fill: {formatCurrency(month.historicalFillCents)}</p>
                <p className="text-stone-400">
                  Baseline: {formatCurrency(month.historicalAvgCents)}
                </p>
              </div>

              <div className="relative w-full" style={{ height: 190 }}>
                {month.highRevenueCents > 0 && (
                  <div
                    className="absolute left-1/2 w-[72%] -translate-x-1/2 rounded-md border border-brand-400/35 bg-brand-500/10"
                    style={{
                      bottom: lowHeight,
                      height: Math.max(2, highHeight - lowHeight),
                    }}
                  />
                )}

                {month.historicalAvgCents > 0 && (
                  <div
                    className="absolute w-full border-t-2 border-dotted border-stone-500"
                    style={{ bottom: historicalHeight }}
                  />
                )}

                {month.expectedRevenueCents > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-sm bg-amber-400/35"
                    style={{ height: expectedHeight }}
                  />
                )}

                {month.pipelineRevenueCents > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-sm"
                    style={{
                      height: visibleHeight,
                      background:
                        'repeating-linear-gradient(45deg, #6366f1 0px, #6366f1 2px, #4f46e5 2px, #4f46e5 4px)',
                    }}
                  />
                )}

                {month.bookedRevenueCents > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-sm bg-emerald-500"
                    style={{ height: bookedHeight }}
                  />
                )}
              </div>

              <span className="text-xxs text-stone-500">{monthLabel(month.month)}</span>
              <span className="text-[10px] text-stone-600">
                {month.visibleRevenueCoveragePercent}% live
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PipelineBreakdown({ pipelineValue }: { pipelineValue: RevenueForecast['pipelineValue'] }) {
  if (pipelineValue.byStage.length === 0) {
    return <p className="text-sm italic text-stone-500">No future events in the live pipeline.</p>
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-stone-500">Total pipeline</p>
          <p className="text-lg font-bold text-stone-200">
            {formatCurrency(pipelineValue.totalCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Weighted pipeline</p>
          <p className="text-lg font-bold text-brand-400">
            {formatCurrency(pipelineValue.weightedCents)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {pipelineValue.byStage.map((stage) => (
          <div key={stage.stage} className="flex items-center justify-between text-sm">
            <div className="min-w-0">
              <p className="truncate text-stone-300">{stage.label}</p>
              <p className="text-xs text-stone-500">
                {stage.count} event{stage.count === 1 ? '' : 's'} at{' '}
                {Math.round(stage.probability * 100)}%
              </p>
            </div>
            <div className="ml-2 shrink-0 text-right">
              <p className="font-medium text-stone-200">{formatCurrency(stage.weightedCents)}</p>
              <p className="text-xs text-stone-500">{formatCurrency(stage.totalCents)} raw</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SeasonalPatternChart({ pattern }: { pattern: RevenueForecast['seasonalPattern'] }) {
  const maxVal = Math.max(...pattern.map((p) => p.avgRevenueCents), 1)
  const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

  return (
    <div className="flex items-end gap-1" style={{ height: 90 }}>
      {pattern.map((month, index) => {
        const height = (month.avgRevenueCents / maxVal) * 70
        return (
          <div
            key={month.month}
            className="group relative flex flex-1 flex-col items-center gap-0.5"
          >
            <div className="absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded border border-stone-600 bg-stone-900 px-1.5 py-0.5 text-[10px] text-stone-200 group-hover:block">
              {formatCurrency(month.avgRevenueCents)}
            </div>
            <div
              className="w-full rounded-t-sm bg-brand-500/40"
              style={{ height: Math.max(2, height) }}
            />
            <span className="text-[10px] text-stone-600">{monthNames[index]}</span>
          </div>
        )
      })}
    </div>
  )
}

function ForecastExplainabilityPanel({ forecast }: { forecast: RevenueForecast }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast Basis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {forecast.explainability.drivers.map((driver) => (
            <div
              key={driver.id}
              className={`rounded-lg border p-3 ${driverToneClasses(driver.tone)}`}
            >
              <p className="text-xs text-stone-400">{driver.label}</p>
              <p className="mt-1 text-sm font-semibold text-stone-100">{driver.value}</p>
              <p className="mt-2 text-xs leading-5 text-stone-300">{driver.detail}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-xs text-stone-400">
          {forecast.explainability.methodology.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ForecastEvidencePanel({ forecast }: { forecast: RevenueForecast }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Snapshot Integrity</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              Durable run metadata, source coverage, and closed-month reconciliation from stored
              forecast snapshots.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${qualityToneClasses(forecast.dataQuality.overallStatus)}`}
          >
            {forecast.dataQuality.overallStatus === 'pass'
              ? 'Data quality passing'
              : forecast.dataQuality.overallStatus === 'warn'
                ? 'Data quality warning'
                : 'Data quality failed'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <p className="text-xs text-stone-500">Latest snapshot</p>
            <p className="mt-1 text-sm font-semibold text-stone-100">
              {formatTimestamp(forecast.planningRun.generatedAt)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {forecast.planningRun.servedFromCache ? 'Reused stored artifact' : 'Generated fresh'}
            </p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <p className="text-xs text-stone-500">Run source</p>
            <p className="mt-1 text-sm font-semibold capitalize text-stone-100">
              {forecast.planningRun.runSource}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {forecast.planningRun.artifactVersion} via {forecast.planningRun.generatorVersion}
            </p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <p className="text-xs text-stone-500">Actuals calibration</p>
            <p className="mt-1 text-sm font-semibold text-stone-100">
              {forecast.actualsCalibration.sampleSize > 0
                ? `${forecast.actualsCalibration.sampleSize} closed month${forecast.actualsCalibration.sampleSize === 1 ? '' : 's'}`
                : 'Not available yet'}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {forecast.actualsCalibration.meanAbsolutePercentError != null
                ? `${forecast.actualsCalibration.meanAbsolutePercentError}% MAE`
                : forecast.actualsCalibration.note}
            </p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <p className="text-xs text-stone-500">Within range</p>
            <p className="mt-1 text-sm font-semibold text-stone-100">
              {forecast.actualsCalibration.withinRangeRatePercent != null
                ? `${forecast.actualsCalibration.withinRangeRatePercent}%`
                : '-'}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {forecast.actualsCalibration.latestClosedMonth
                ? `Latest reconciled month ${forecast.actualsCalibration.latestClosedMonth}`
                : 'Waiting on closed months'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Quality Checks
            </p>
            <div className="space-y-2">
              {forecast.dataQuality.checks.map((check) => (
                <div
                  key={check.key}
                  className="flex flex-col gap-2 rounded-lg border border-stone-800 bg-stone-900/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-100">{check.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        check.status === 'pass'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : check.status === 'warn'
                            ? 'bg-amber-500/15 text-amber-200'
                            : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-stone-400">{check.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Evidence Sources
            </p>
            <div className="space-y-2">
              {forecast.evidence.map((source) => (
                <div
                  key={source.key}
                  className="rounded-lg border border-stone-800 bg-stone-900/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-100">{source.label}</p>
                    <span className="text-[11px] uppercase tracking-wide text-stone-500">
                      {source.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    {source.recordCount.toLocaleString()} record
                    {source.recordCount === 1 ? '' : 's'}
                    {source.coveragePercent != null ? ` | ${source.coveragePercent}% coverage` : ''}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {source.note ?? `As of ${formatTimestamp(source.asOf)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              Closed-Month Reconciliation
            </p>
            <p className="mt-1 text-xs text-stone-400">{forecast.actualsCalibration.note}</p>
          </div>

          {forecast.actualsReconciliation.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-800 bg-stone-900/20 p-4 text-sm text-stone-500">
              No stored month-open forecast snapshots have reached actuals yet.
            </div>
          ) : (
            <div className="space-y-2">
              {forecast.actualsReconciliation.map((entry) => (
                <div
                  key={`${entry.month}:${entry.forecastRunId}`}
                  className="rounded-lg border border-stone-800 bg-stone-900/30 p-3"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-100">{entry.month}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Snapshot {formatTimestamp(entry.forecastGeneratedAt)} from{' '}
                        {entry.forecastAsOfDate}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold ${varianceToneClasses(entry)}`}>
                      {entry.variancePct == null
                        ? 'No comparable expected value'
                        : `${entry.variancePct > 0 ? '+' : ''}${entry.variancePct}% vs expected`}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-stone-400 md:grid-cols-4">
                    <div>
                      <p className="text-stone-500">Expected</p>
                      <p className="mt-1 font-medium text-stone-200">
                        {formatCurrency(entry.expectedRevenueCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-500">Actual</p>
                      <p className="mt-1 font-medium text-stone-200">
                        {formatCurrency(entry.actualRevenueCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-500">Range</p>
                      <p className="mt-1 font-medium text-stone-200">
                        {formatCurrency(entry.lowRevenueCents)} -{' '}
                        {formatCurrency(entry.highRevenueCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-500">Forecast makeup</p>
                      <p className="mt-1 font-medium text-stone-200">
                        {formatCurrency(entry.bookedRevenueCents + entry.pipelineRevenueCents)} live
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function RevenueForecastPanel({
  initialForecast,
  initialMonths = 6,
}: RevenueForecastPanelProps) {
  const [forecast, setForecast] = useState<RevenueForecast>(initialForecast)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forecastMonths, setForecastMonths] = useState(initialMonths)

  useEffect(() => {
    let cancelled = false

    if (forecastMonths === initialMonths) {
      setForecast(initialForecast)
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setError(null)

    getRevenueForecast(forecastMonths)
      .then((data) => {
        if (!cancelled) setForecast(data)
      })
      .catch((err) => {
        if (!cancelled) setError('Could not load forecast data')
        console.error('[RevenueForecast]', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [forecastMonths, initialForecast, initialMonths])

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-400">{error}</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">This month actual</p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(forecast.currentMonthActual)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">This month expected</p>
            <p className="text-2xl font-bold text-stone-100">
              {formatCurrency(forecast.currentMonthProjected)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {formatCurrency(forecast.currentMonthRange.lowCents)} -{' '}
              {formatCurrency(forecast.currentMonthRange.highCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">Forecast window</p>
            <p className="text-2xl font-bold text-stone-100">
              {formatCurrency(forecast.windowTotals.expectedCents)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {formatCurrency(forecast.windowTotals.lowCents)} -{' '}
              {formatCurrency(forecast.windowTotals.highCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">Confidence</p>
            <p className={`text-2xl font-bold ${confidenceTone(forecast.confidence.level)}`}>
              {forecast.confidence.label.replace(' confidence', '')}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Score {forecast.confidence.scorePercent}
              {forecast.calibration.meanAbsolutePercentError != null
                ? ` | ${forecast.calibration.meanAbsolutePercentError}% MAE`
                : ` | ${forecast.dataMonthsAvailable} months history`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Revenue Forecast</CardTitle>
              <p className="mt-1 text-sm text-stone-400">
                Booked revenue + weighted pipeline + seasonal fill to historical baseline.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={forecastMonths}
                onChange={(event) => setForecastMonths(parseInt(event.target.value, 10))}
                className="rounded border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-stone-300"
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
              <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">
                {forecast.confidence.label}
              </span>
              <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">
                {forecast.dataMonthsAvailable} months history
              </span>
              {loading ? <span className="text-[10px] text-stone-500">Updating...</span> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ForecastBarChart data={forecast.monthlyForecast} />
          <div className="grid gap-3 text-xs text-stone-400 md:grid-cols-3">
            <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-stone-500">Visible revenue</p>
              <p className="mt-1 text-sm font-semibold text-stone-100">
                {formatCurrency(
                  forecast.windowTotals.bookedCents + forecast.windowTotals.weightedPipelineCents
                )}
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-stone-500">Seasonal fill</p>
              <p className="mt-1 text-sm font-semibold text-stone-100">
                {formatCurrency(forecast.windowTotals.historicalFillCents)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-stone-500">Window coverage</p>
              <p className="mt-1 text-sm font-semibold text-stone-100">
                {forecast.confidence.visibleRevenueCoveragePercent}% already visible
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ForecastEvidencePanel forecast={forecast} />

      <ForecastExplainabilityPanel forecast={forecast} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineBreakdown pipelineValue={forecast.pipelineValue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seasonal Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            {forecast.dataMonthsAvailable >= 3 ? (
              <SeasonalPatternChart pattern={forecast.seasonalPattern} />
            ) : (
              <p className="text-sm italic text-stone-500">
                Need at least 3 months of completed-event history to show seasonality.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quarterly Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(['q1', 'q2', 'q3', 'q4'] as const).map((quarter, index) => {
              const value = forecast.quarterlyForecast[quarter]
              return (
                <div
                  key={quarter}
                  className="rounded-lg border border-stone-800 bg-stone-900/30 p-4 text-center"
                >
                  <p className="text-xs uppercase text-stone-500">Q{index + 1}</p>
                  <p
                    className={`mt-1 text-lg font-bold ${value > 0 ? 'text-stone-100' : 'text-stone-600'}`}
                  >
                    {formatCurrency(value)}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
