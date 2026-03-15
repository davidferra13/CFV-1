'use client'

import { useState, useTransition } from 'react'
import {
  submitBenchmark,
  getAggregateBenchmarks,
  type BenchmarkAggregate,
} from '@/lib/community/community-actions'

const METRIC_OPTIONS = [
  { value: 'avg_event_price', label: 'Average Event Price ($)', unit: '$' },
  { value: 'events_per_month', label: 'Events per Month', unit: '' },
  { value: 'food_cost_pct', label: 'Food Cost %', unit: '%' },
  { value: 'client_retention_rate', label: 'Client Retention Rate', unit: '%' },
  { value: 'avg_party_size', label: 'Average Party Size', unit: '' },
] as const

function getCurrentPeriod(): string {
  const now = new Date()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${quarter}`
}

export function BenchmarkDashboard() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Contribution form
  const [selectedMetric, setSelectedMetric] = useState(METRIC_OPTIONS[0].value)
  const [metricValue, setMetricValue] = useState('')
  const [period, setPeriod] = useState(getCurrentPeriod)

  // Aggregates viewer
  const [viewMetric, setViewMetric] = useState(METRIC_OPTIONS[0].value)
  const [aggregates, setAggregates] = useState<BenchmarkAggregate[]>([])
  const [aggregateMessage, setAggregateMessage] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const numValue = parseFloat(metricValue)
    if (isNaN(numValue) || numValue < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid non-negative number' })
      return
    }

    startTransition(async () => {
      try {
        const result = await submitBenchmark(selectedMetric, numValue, period)
        if (result.success) {
          setMessage({ type: 'success', text: 'Benchmark submitted. Thank you for contributing!' })
          setMetricValue('')
        } else {
          setMessage({ type: 'error', text: result.error ?? 'Failed to submit' })
        }
      } catch (err) {
        console.error('[BenchmarkDashboard] Submit failed:', err)
        setMessage({ type: 'error', text: 'An unexpected error occurred' })
      }
    })
  }

  function loadAggregates() {
    setAggregateMessage(null)
    startTransition(async () => {
      try {
        const data = await getAggregateBenchmarks(viewMetric)
        setAggregates(data)
        if (data.length === 0) {
          setAggregateMessage(
            'No aggregates available. You must contribute this metric first, and at least 5 chefs must participate for anonymized data to appear.'
          )
        }
      } catch (err) {
        console.error('[BenchmarkDashboard] Load aggregates failed:', err)
        setAggregateMessage('Failed to load benchmarks')
        setAggregates([])
      }
    })
  }

  const selectedMetricInfo = METRIC_OPTIONS.find((m) => m.value === viewMetric)

  return (
    <div className="space-y-8">
      {/* Contribute Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Contribute Your Data
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Share anonymized metrics to see how you compare. Your individual data is never shown to others.
        </p>

        {message && (
          <div
            className={`rounded-md p-3 text-sm mb-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <input
              type="number"
              step="any"
              min={0}
              required
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <input
              type="text"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="2026-Q1"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>

      {/* View Aggregates Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Community Benchmarks
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Anonymized averages from the chef community. Only shown when 5 or more chefs contribute.
        </p>

        <div className="flex gap-3 items-end mb-4">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric
            </label>
            <select
              value={viewMetric}
              onChange={(e) => setViewMetric(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadAggregates}
            disabled={isPending}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {isPending ? 'Loading...' : 'View Benchmarks'}
          </button>
        </div>

        {aggregateMessage && (
          <p className="text-sm text-gray-500">{aggregateMessage}</p>
        )}

        {aggregates.length > 0 && (
          <div className="space-y-2">
            {aggregates.map((agg) => (
              <div
                key={`${agg.metric_type}-${agg.period}`}
                className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-700">{agg.period}</span>
                <span className="text-sm text-gray-900">
                  {selectedMetricInfo?.unit === '$' && '$'}
                  {agg.average.toLocaleString()}
                  {selectedMetricInfo?.unit === '%' && '%'}
                  <span className="ml-2 text-xs text-gray-500">
                    (based on {agg.contributor_count} chefs)
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
