'use client'

/**
 * Vendor Call History
 *
 * Per-vendor relationship view showing call history, answer rate metrics,
 * price trends (CSS-only bar chart), and expandable transcripts.
 */

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Phone,
  Clock,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/icons'

// ---- Types ----------------------------------------------------------------

export interface VendorCallRecord {
  id: string
  date: string
  ingredient: string
  result: 'available' | 'unavailable' | 'voicemail' | 'no_answer'
  price?: number
  unit?: string
  duration?: number
  transcript?: string
}

export interface VendorCallMetrics {
  answerRate: number
  avgResponseTime: number
  totalCalls: number
  lastCallDate: string
}

interface VendorCallHistoryProps {
  vendorPhone: string
  vendorName: string
  calls: VendorCallRecord[]
  metrics?: VendorCallMetrics
}

// ---- Helpers --------------------------------------------------------------

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

const RESULT_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string }> = {
  available: {
    label: 'Available',
    dotColor: 'bg-emerald-400',
    bgColor: 'bg-emerald-950 text-emerald-300',
  },
  unavailable: {
    label: 'Unavailable',
    dotColor: 'bg-rose-400',
    bgColor: 'bg-rose-950 text-rose-300',
  },
  voicemail: {
    label: 'Voicemail',
    dotColor: 'bg-violet-400',
    bgColor: 'bg-violet-950 text-violet-300',
  },
  no_answer: {
    label: 'No Answer',
    dotColor: 'bg-amber-400',
    bgColor: 'bg-amber-950 text-amber-300',
  },
}

function answerRateColor(rate: number): string {
  if (rate >= 70) return 'bg-emerald-500'
  if (rate >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
}

function answerRateTextColor(rate: number): string {
  if (rate >= 70) return 'text-emerald-400'
  if (rate >= 40) return 'text-amber-400'
  return 'text-rose-400'
}

// ---- Price Trend Bar Chart ------------------------------------------------

function PriceTrend({ calls }: { calls: VendorCallRecord[] }) {
  const pricePoints = calls
    .filter((c) => c.price != null && c.price > 0)
    .slice(0, 12) // Last 12 data points
    .reverse() // Chronological order for the chart

  if (pricePoints.length < 2) return null

  const prices = pricePoints.map((c) => c.price!)
  const maxPrice = Math.max(...prices)
  const minPrice = Math.min(...prices)
  const range = maxPrice - minPrice || 1

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
      <p className="text-xs font-medium text-stone-400 mb-2">Price Trend</p>
      <div className="flex items-end gap-1 h-16">
        {pricePoints.map((point, i) => {
          // Minimum 10% height so bars are always visible
          const heightPct = Math.max(10, ((point.price! - minPrice) / range) * 100)
          return (
            <div
              key={point.id}
              className="flex-1 flex flex-col items-center gap-0.5 group relative"
            >
              <div
                className="w-full rounded-t bg-violet-500/70 hover:bg-violet-400/80 transition-colors cursor-default"
                style={{ height: `${heightPct}%` }}
                title={`$${point.price!.toFixed(2)}${point.unit ? `/${point.unit}` : ''} - ${point.ingredient}`}
              />
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                <div className="bg-stone-700 text-stone-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  ${point.price!.toFixed(2)}
                  {point.unit ? `/${point.unit}` : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1 text-xs text-stone-600">
        <span>${minPrice.toFixed(2)}</span>
        <span>${maxPrice.toFixed(2)}</span>
      </div>
    </div>
  )
}

// ---- Call History Row -----------------------------------------------------

function CallHistoryRow({ call }: { call: VendorCallRecord }) {
  const [expanded, setExpanded] = useState(false)
  const config = RESULT_CONFIG[call.result] || RESULT_CONFIG.no_answer

  return (
    <div className="border-b border-stone-800 last:border-0">
      <button
        type="button"
        onClick={() => call.transcript && setExpanded((p) => !p)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          call.transcript ? 'hover:bg-stone-800/50 cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* Date */}
        <span className="text-xs text-stone-500 w-20 shrink-0 hidden sm:block">
          {format(new Date(call.date), 'MMM d')}
        </span>

        {/* Ingredient */}
        <span className="flex-1 min-w-0 text-sm text-stone-300 truncate">{call.ingredient}</span>

        {/* Result badge */}
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${config.bgColor}`}>
          {config.label}
        </span>

        {/* Price */}
        {call.price != null && (
          <span className="text-xs font-mono text-emerald-300 w-20 shrink-0 text-right hidden md:block">
            ${call.price.toFixed(2)}
            {call.unit ? `/${call.unit}` : ''}
          </span>
        )}

        {/* Duration */}
        {call.duration != null && (
          <span className="text-xs text-stone-600 w-12 shrink-0 text-right hidden lg:block">
            {fmtDuration(call.duration)}
          </span>
        )}

        {/* Expand */}
        {call.transcript && (
          <span className="shrink-0 text-stone-600">
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </button>

      {expanded && call.transcript && (
        <div className="px-4 pb-3 pt-1 bg-stone-900/50 border-t border-stone-800/50">
          <div className="bg-stone-800 rounded-lg p-3">
            <p className="text-stone-500 mb-1 text-xs font-medium uppercase tracking-wide">
              Transcript
            </p>
            <p className="text-stone-300 text-xs leading-relaxed">{call.transcript}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Main Component -------------------------------------------------------

export function VendorCallHistory({
  vendorPhone,
  vendorName,
  calls,
  metrics,
}: VendorCallHistoryProps) {
  // Check for deprioritization: 5+ consecutive no-answers from recent calls
  const recentResults = calls.slice(0, 10).map((c) => c.result)
  let consecutiveNoAnswers = 0
  for (const r of recentResults) {
    if (r === 'no_answer' || r === 'voicemail') consecutiveNoAnswers++
    else break
  }
  const isDeprioritized = consecutiveNoAnswers >= 5

  if (calls.length === 0 && !metrics) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="px-6 py-12 text-center">
          <Phone className="w-8 h-8 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No call history for {vendorName}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-semibold text-stone-200">{vendorName}</span>
          <span className="text-xs text-stone-500">{vendorPhone}</span>
        </div>
      </div>

      {/* Deprioritized warning */}
      {isDeprioritized && (
        <div className="px-4 py-2 bg-amber-950/50 border-b border-amber-800/50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            This vendor has {consecutiveNoAnswers} consecutive missed calls. Consider finding an
            alternative supplier.
          </p>
        </div>
      )}

      {/* Metrics row */}
      {metrics && (
        <div className="px-4 py-3 border-b border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Answer Rate */}
          <div>
            <p className="text-xs text-stone-500 mb-1">Answer Rate</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${answerRateTextColor(metrics.answerRate)}`}>
                {metrics.answerRate}%
              </span>
              <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${answerRateColor(metrics.answerRate)}`}
                  style={{ width: `${metrics.answerRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Avg Response */}
          <div>
            <p className="text-xs text-stone-500 mb-1">Avg Response</p>
            <p className="text-sm font-semibold text-stone-200">
              {metrics.avgResponseTime > 0 ? fmtDuration(metrics.avgResponseTime) : 'N/A'}
            </p>
          </div>

          {/* Total Calls */}
          <div>
            <p className="text-xs text-stone-500 mb-1">Total Calls</p>
            <p className="text-sm font-semibold text-stone-200">{metrics.totalCalls}</p>
          </div>

          {/* Last Call */}
          <div>
            <p className="text-xs text-stone-500 mb-1">Last Call</p>
            <p className="text-sm font-semibold text-stone-200">
              {metrics.lastCallDate
                ? formatDistanceToNow(new Date(metrics.lastCallDate), {
                    addSuffix: true,
                  })
                : 'Never'}
            </p>
          </div>
        </div>
      )}

      {/* Price trend chart */}
      <div className="px-4 py-3 border-b border-stone-800">
        <PriceTrend calls={calls} />
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-stone-800 text-xs font-semibold text-stone-600 uppercase tracking-wide">
        <span className="w-20 shrink-0 hidden sm:block">Date</span>
        <span className="flex-1">Ingredient</span>
        <span className="w-24 shrink-0">Result</span>
        <span className="w-20 shrink-0 text-right hidden md:block">Price</span>
        <span className="w-12 shrink-0 text-right hidden lg:block">Time</span>
        <span className="w-4 shrink-0" />
      </div>

      {/* Call rows */}
      <div className="divide-y divide-stone-800 max-h-96 overflow-y-auto">
        {calls.map((call) => (
          <CallHistoryRow key={call.id} call={call} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-stone-800 text-center">
        <p className="text-xs text-stone-600">
          Showing {calls.length} call{calls.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
