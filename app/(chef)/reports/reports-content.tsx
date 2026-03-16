'use client'

import { useState, useTransition } from 'react'
import { REPORT_DEFINITIONS } from '@/lib/reports/report-definitions'
import type { ReportType, ReportPeriod } from '@/lib/reports/report-definitions'
import { generateReport } from '@/lib/reports/report-actions'
import type { GeneratedReport } from '@/lib/reports/report-actions'
import { ReportResultsView } from './report-results-view'

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 12)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function ReportsContent() {
  const [selectedType, setSelectedType] = useState<ReportType>('revenue-summary')
  const [period, setPeriod] = useState<ReportPeriod>('monthly')
  const [dateRange, setDateRange] = useState(defaultDateRange)
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedDef = REPORT_DEFINITIONS.find((d) => d.type === selectedType)

  const handleGenerate = () => {
    setError(null)
    setReport(null)
    startTransition(async () => {
      try {
        const result = await generateReport(selectedType, dateRange, period)
        if (result.success) {
          setReport(result.report)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate report')
      }
    })
  }

  const handleExportCsv = () => {
    if (!report) return

    let csvContent = ''

    if (report.type === 'revenue-summary') {
      csvContent =
        'Period,Gross Revenue,Refunds,Net Revenue,Tips,Expenses,Profit\n' +
        report.data.rows
          .map(
            (r) =>
              `${r.period},${r.grossRevenueCents},${r.refundsCents},${r.netRevenueCents},${r.tipsCents},${r.expensesCents},${r.profitCents}`
          )
          .join('\n')
    } else if (report.type === 'client-activity') {
      csvContent =
        'Client,Bookings,Total Spend (cents),Last Event\n' +
        report.data.rows
          .map(
            (r) =>
              `"${r.clientName}",${r.totalBookings},${r.totalSpendCents},${r.lastEventDate || 'N/A'}`
          )
          .join('\n')
    } else if (report.type === 'event-performance') {
      csvContent =
        'Period,Events,Revenue (cents),Expenses (cents),Avg Margin %\n' +
        report.data.rows
          .map(
            (r) =>
              `${r.period},${r.eventCount},${r.totalRevenueCents},${r.totalExpensesCents},${r.avgMarginPercent ?? 'N/A'}`
          )
          .join('\n')
    } else if (report.type === 'expense-breakdown') {
      csvContent =
        'Category,Period,Total (cents),Count\n' +
        report.data.rows
          .map((r) => `"${r.category}",${r.period},${r.totalCents},${r.count}`)
          .join('\n')
    } else if (report.type === 'pipeline-conversion') {
      csvContent =
        'Source,Inquiries,Events,Conversion %\n' +
        report.data.bySource
          .map((r) => `"${r.source}",${r.inquiries},${r.events},${r.conversionRate ?? 'N/A'}`)
          .join('\n')
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.type}-${dateRange.start}-to-${dateRange.end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Custom Reports</h1>
        <p className="mt-1 text-stone-400">
          Generate detailed reports across revenue, clients, events, expenses, and pipeline.
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-4">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-2">Report Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {REPORT_DEFINITIONS.map((def) => (
              <button
                key={def.type}
                type="button"
                onClick={() => setSelectedType(def.type)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedType === def.type
                    ? 'border-amber-500 bg-amber-500/10 text-stone-100'
                    : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600'
                }`}
              >
                <p className="font-medium text-sm">{def.label}</p>
                <p className="text-xs mt-0.5 opacity-75">{def.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range + Period */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-stone-300">
            Start
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="mt-1 block h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            />
          </label>
          <label className="text-sm text-stone-300">
            End
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="mt-1 block h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            />
          </label>

          {selectedDef?.supportsPeriodGrouping && (
            <label className="text-sm text-stone-300">
              Group by
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="mt-1 block h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="h-10 rounded-md bg-amber-500 px-6 text-sm font-medium text-stone-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {isPending ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-stone-100">
              {REPORT_DEFINITIONS.find((d) => d.type === report.type)?.label || 'Report'}
            </h2>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-md border border-stone-600 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
            >
              Export CSV
            </button>
          </div>
          <ReportResultsView report={report} />
        </div>
      )}
    </div>
  )
}
