'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export interface DateRange {
  start: string // YYYY-MM-DD
  end: string
  label: string
}

const PRESETS: DateRange[] = [
  { start: daysAgo(30), end: today(), label: 'Last 30 days' },
  { start: daysAgo(90), end: today(), label: 'Last 90 days' },
  { start: daysAgo(180), end: today(), label: 'Last 6 months' },
  { start: daysAgo(365), end: today(), label: 'Last 12 months' },
  { start: yearStart(), end: today(), label: 'Year to date' },
  { start: prevYearStart(), end: prevYearEnd(), label: 'Previous year' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`
}

function prevYearStart(): string {
  return `${new Date().getFullYear() - 1}-01-01`
}

function prevYearEnd(): string {
  return `${new Date().getFullYear() - 1}-12-31`
}

interface Props {
  currentStart: string
  currentEnd: string
  comparisonEnabled?: boolean
}

export default function DateRangePicker({ currentStart, currentEnd, comparisonEnabled }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState(currentStart)
  const [customEnd, setCustomEnd] = useState(currentEnd)
  const [compare, setCompare] = useState(comparisonEnabled ?? false)

  const applyRange = useCallback(
    (start: string, end: string, withCompare?: boolean) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('start', start)
      params.set('end', end)
      if (withCompare ?? compare) {
        params.set('compare', '1')
      } else {
        params.delete('compare')
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams, compare]
  )

  // Find which preset matches current range
  const activePreset = PRESETS.find((p) => p.start === currentStart && p.end === currentEnd)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => {
            setShowCustom(false)
            applyRange(preset.start, preset.end)
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation ${
            activePreset?.label === preset.label
              ? 'bg-blue-600 text-white'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          {preset.label}
        </button>
      ))}

      {/* Custom toggle */}
      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation ${
          showCustom ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
        }`}
      >
        Custom
      </button>

      {/* Compare toggle */}
      <label className="flex items-center gap-1.5 text-xs text-stone-400 ml-2 cursor-pointer">
        <input
          type="checkbox"
          checked={compare}
          onChange={(e) => {
            setCompare(e.target.checked)
            applyRange(currentStart, currentEnd, e.target.checked)
          }}
          className="rounded border-stone-600"
        />
        vs previous period
      </label>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 mt-2 w-full sm:w-auto sm:mt-0">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-stone-200"
          />
          <span className="text-xs text-stone-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-stone-200"
          />
          <button
            type="button"
            onClick={() => applyRange(customStart, customEnd)}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 touch-manipulation"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helper: compute comparison period ─────────────────────────

export function getComparisonRange(start: string, end: string): { start: string; end: string } {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const durationMs = endDate.getTime() - startDate.getTime()
  const compEnd = new Date(startDate.getTime() - 1) // day before start
  const compStart = new Date(compEnd.getTime() - durationMs)
  return {
    start: compStart.toISOString().slice(0, 10),
    end: compEnd.toISOString().slice(0, 10),
  }
}
