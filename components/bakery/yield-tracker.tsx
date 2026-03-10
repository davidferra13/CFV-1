'use client'

import { useState, useTransition } from 'react'
import {
  type YieldRecord,
  type YieldSummary,
  type WasteReason,
  type RecordYieldInput,
  recordBatchYield,
} from '@/lib/bakery/yield-actions'

// ---- Helpers ----

function varianceColor(pct: number): string {
  const abs = Math.abs(pct)
  if (abs <= 5) return 'text-emerald-400'
  if (abs <= 15) return 'text-amber-400'
  return 'text-red-400'
}

function varianceBg(pct: number): string {
  const abs = Math.abs(pct)
  if (abs <= 5) return 'bg-emerald-900/30 border-emerald-700'
  if (abs <= 15) return 'bg-amber-900/30 border-amber-700'
  return 'bg-red-900/30 border-red-700'
}

function qualityStars(rating: number | null): string {
  if (!rating) return 'N/A'
  return Array(rating).fill('*').join('')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const WASTE_REASONS: { value: WasteReason; label: string }[] = [
  { value: 'burnt', label: 'Burnt' },
  { value: 'misshapen', label: 'Misshapen' },
  { value: 'underproofed', label: 'Underproofed' },
  { value: 'overbaked', label: 'Overbaked' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'other', label: 'Other' },
]

// ---- Props ----

type RecipeAvg = {
  product_name: string
  avg_variance: number
  count: number
  avg_quality: number
}

type WasteEntry = {
  reason: string
  total_units: number
  count: number
}

type Props = {
  initialHistory: YieldRecord[]
  initialSummary: YieldSummary
  initialRecipeAverages: RecipeAvg[]
  initialWasteReport: WasteEntry[]
}

export default function YieldTracker({
  initialHistory,
  initialSummary,
  initialRecipeAverages,
  initialWasteReport,
}: Props) {
  const [history, setHistory] = useState(initialHistory)
  const [summary, setSummary] = useState(initialSummary)
  const [recipeAvgs, setRecipeAvgs] = useState(initialRecipeAverages)
  const [wasteReport, setWasteReport] = useState(initialWasteReport)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [productName, setProductName] = useState('')
  const [expectedYield, setExpectedYield] = useState('')
  const [actualYield, setActualYield] = useState('')
  const [wasteUnits, setWasteUnits] = useState('0')
  const [wasteReason, setWasteReason] = useState<WasteReason | ''>('')
  const [qualityRating, setQualityRating] = useState('3')
  const [notes, setNotes] = useState('')

  function resetForm() {
    setProductName('')
    setExpectedYield('')
    setActualYield('')
    setWasteUnits('0')
    setWasteReason('')
    setQualityRating('3')
    setNotes('')
  }

  function handleSubmitYield() {
    setError(null)
    if (!productName.trim()) {
      setError('Product name is required')
      return
    }
    if (!expectedYield || parseInt(expectedYield) <= 0) {
      setError('Expected yield must be > 0')
      return
    }
    if (!actualYield || parseInt(actualYield) < 0) {
      setError('Actual yield is required')
      return
    }

    const input: RecordYieldInput = {
      product_name: productName.trim(),
      expected_yield: parseInt(expectedYield),
      actual_yield: parseInt(actualYield),
      waste_units: parseInt(wasteUnits) || 0,
      waste_reason: wasteReason || null,
      quality_rating: parseInt(qualityRating) || null,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      try {
        const record = await recordBatchYield(input)
        setHistory((prev) => [record, ...prev])
        // Locally update summary cards
        setSummary((prev) => ({
          ...prev,
          totalBatchesThisWeek: prev.totalBatchesThisWeek + 1,
          totalWasteThisWeek: prev.totalWasteThisWeek + (input.waste_units ?? 0),
        }))
        setShowForm(false)
        resetForm()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to record yield')
      }
    })
  }

  // Computed live variance preview
  const previewVariance =
    expectedYield && actualYield && parseInt(expectedYield) > 0
      ? ((parseInt(actualYield) - parseInt(expectedYield)) / parseInt(expectedYield)) * 100
      : null

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100">
            x
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4 text-center">
          <p className="text-xs text-stone-400 uppercase tracking-wider">Avg Yield Rate</p>
          <p
            className={`text-2xl font-bold mt-1 ${summary.avgYieldRate >= 95 ? 'text-emerald-400' : summary.avgYieldRate >= 85 ? 'text-amber-400' : 'text-red-400'}`}
          >
            {summary.avgYieldRate}%
          </p>
        </div>
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4 text-center">
          <p className="text-xs text-stone-400 uppercase tracking-wider">Consistency Score</p>
          <p
            className={`text-2xl font-bold mt-1 ${summary.consistencyScore >= 80 ? 'text-emerald-400' : summary.consistencyScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}
          >
            {summary.consistencyScore}%
          </p>
          <p className="text-xs text-stone-500">batches within 5% target</p>
        </div>
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4 text-center">
          <p className="text-xs text-stone-400 uppercase tracking-wider">Waste This Week</p>
          <p className="text-2xl font-bold mt-1 text-stone-100">{summary.totalWasteThisWeek}</p>
          <p className="text-xs text-stone-500">units</p>
        </div>
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4 text-center">
          <p className="text-xs text-stone-400 uppercase tracking-wider">Batches This Week</p>
          <p className="text-2xl font-bold mt-1 text-stone-100">{summary.totalBatchesThisWeek}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-medium"
        >
          + Log Yield
        </button>
      </div>

      {/* Recipe Averages */}
      {recipeAvgs.length > 0 && (
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
            <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
              Recipe Averages
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400 text-left">
                  <th className="px-4 py-2">Recipe</th>
                  <th className="px-4 py-2 text-right">Batches</th>
                  <th className="px-4 py-2 text-right">Avg Variance</th>
                  <th className="px-4 py-2 text-right">Avg Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700/50">
                {recipeAvgs.map((r) => (
                  <tr key={r.product_name}>
                    <td className="px-4 py-2 text-stone-100 font-medium">{r.product_name}</td>
                    <td className="px-4 py-2 text-right text-stone-300">{r.count}</td>
                    <td
                      className={`px-4 py-2 text-right font-mono ${varianceColor(r.avg_variance)}`}
                    >
                      {r.avg_variance > 0 ? '+' : ''}
                      {r.avg_variance}%
                    </td>
                    <td className="px-4 py-2 text-right text-stone-300">
                      {r.avg_quality > 0 ? `${r.avg_quality}/5` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Waste Breakdown */}
      {wasteReport.length > 0 && (
        <div className="bg-stone-800/50 border border-stone-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
            <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
              Waste Breakdown (Last 7 Days)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400 text-left">
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2 text-right">Total Units</th>
                  <th className="px-4 py-2 text-right">Occurrences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700/50">
                {wasteReport.map((w) => (
                  <tr key={w.reason}>
                    <td className="px-4 py-2 text-stone-100 capitalize">{w.reason}</td>
                    <td className="px-4 py-2 text-right text-red-400 font-mono">{w.total_units}</td>
                    <td className="px-4 py-2 text-right text-stone-300">{w.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yield History */}
      <div className="bg-stone-800/50 border border-stone-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
          <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
            Yield History
          </h3>
        </div>
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center text-stone-500">
            No yield records yet. Log your first batch yield to start tracking consistency.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400 text-left">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2 text-right">Expected</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Variance</th>
                  <th className="px-4 py-2 text-right">Waste</th>
                  <th className="px-4 py-2 text-right">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700/50">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-stone-300 text-xs">
                      {formatDate(r.recorded_at)}
                    </td>
                    <td className="px-4 py-2 text-stone-100 font-medium">{r.product_name}</td>
                    <td className="px-4 py-2 text-right text-stone-300">{r.expected_yield}</td>
                    <td className="px-4 py-2 text-right text-stone-100">{r.actual_yield}</td>
                    <td
                      className={`px-4 py-2 text-right font-mono ${varianceColor(r.variance_pct)}`}
                    >
                      {r.variance_pct > 0 ? '+' : ''}
                      {r.variance_pct}%
                    </td>
                    <td className="px-4 py-2 text-right text-stone-300">
                      {r.waste_units > 0 ? (
                        <span className="text-red-400">{r.waste_units}</span>
                      ) : (
                        <span className="text-stone-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-stone-300">
                      {r.quality_rating ? `${r.quality_rating}/5` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Yield Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-stone-100">Log Batch Yield</h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="text-stone-400 hover:text-stone-200"
              >
                x
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-stone-300 mb-1">Product Name</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Sourdough Loaves"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Expected Yield</label>
                  <input
                    type="number"
                    value={expectedYield}
                    onChange={(e) => setExpectedYield(e.target.value)}
                    placeholder="24"
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Actual Yield</label>
                  <input
                    type="number"
                    value={actualYield}
                    onChange={(e) => setActualYield(e.target.value)}
                    placeholder="22"
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
              </div>

              {/* Live variance preview */}
              {previewVariance !== null && (
                <div
                  className={`border rounded-lg px-3 py-2 text-center ${varianceBg(previewVariance)}`}
                >
                  <span className={`font-mono font-bold ${varianceColor(previewVariance)}`}>
                    {previewVariance > 0 ? '+' : ''}
                    {previewVariance.toFixed(1)}% variance
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Waste Units</label>
                  <input
                    type="number"
                    value={wasteUnits}
                    onChange={(e) => setWasteUnits(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-300 mb-1">Waste Reason</label>
                  <select
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value as WasteReason | '')}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg"
                  >
                    <option value="">None</option>
                    {WASTE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">Quality Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQualityRating(n.toString())}
                      className={`w-10 h-10 rounded-lg font-bold text-sm ${
                        parseInt(qualityRating) === n
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes about this batch"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 rounded-lg resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm text-stone-300 hover:text-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitYield}
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 font-medium"
                >
                  {isPending ? 'Saving...' : 'Log Yield'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
