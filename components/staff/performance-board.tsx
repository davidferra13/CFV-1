'use client'

// Performance Board — sortable table showing staff performance metrics.
// Displays on-time rate, cancellations, avg rating, and total events.

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, Trophy, TrendingUp, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffPerformanceScore = {
  staffMemberId: string
  staffName: string
  onTimeRate: number
  cancellationCount: number
  avgRating: number
  totalEvents: number
}

interface PerformanceBoardProps {
  scores: StaffPerformanceScore[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortKey = 'staffName' | 'onTimeRate' | 'cancellationCount' | 'avgRating' | 'totalEvents'
type SortDir = 'asc' | 'desc'

function renderStars(rating: number): string {
  if (rating <= 0) return '\u2014'
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  let stars = '\u2605'.repeat(full)
  if (half) stars += '\u00BD'
  return stars || '\u2014'
}

function getOnTimeVariant(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'warning'
  return 'error'
}

function getOnTimeBg(rate: number): string {
  if (rate >= 90) return 'text-emerald-700'
  if (rate >= 70) return 'text-amber-700'
  return 'text-red-700'
}

function getRatingColor(rating: number): string {
  if (rating <= 0) return 'text-stone-400'
  if (rating >= 4.5) return 'text-amber-500'
  if (rating >= 3.5) return 'text-amber-400'
  if (rating >= 2.5) return 'text-stone-500'
  return 'text-red-500'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PerformanceBoard({ scores }: PerformanceBoardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalEvents')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Default desc for numeric, asc for name
      setSortDir(key === 'staffName' ? 'asc' : 'desc')
    }
  }

  const sorted = [...scores].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    const aNum = aVal as number
    const bNum = bVal as number
    return sortDir === 'asc' ? aNum - bNum : bNum - aNum
  })

  // Find top performer (highest on-time rate with >= 3 events)
  const topPerformer = scores
    .filter((s) => s.totalEvents >= 3)
    .sort((a, b) => b.onTimeRate - a.onTimeRate)[0]

  function SortHeader({ label, column }: { label: string; column: SortKey }) {
    const isActive = sortKey === column
    return (
      <th
        className="px-3 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider cursor-pointer select-none hover:text-stone-700 transition-colors"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-brand-600' : 'text-stone-300'}`} />
        </div>
      </th>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-stone-500" />
            <CardTitle>Staff Performance</CardTitle>
            <Badge variant="info">
              {scores.length} member{scores.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {topPerformer && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600">
              <Trophy className="h-4 w-4" />
              <span className="font-medium">{topPerformer.staffName}</span>
              <span className="text-stone-400">({topPerformer.onTimeRate}%)</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {scores.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">No performance data yet.</p>
            <p className="text-xs text-stone-400 mt-1">
              Performance scores are computed from event assignment history.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <SortHeader label="Name" column="staffName" />
                  <SortHeader label="On-Time Rate" column="onTimeRate" />
                  <SortHeader label="Cancellations" column="cancellationCount" />
                  <SortHeader label="Avg Rating" column="avgRating" />
                  <SortHeader label="Total Events" column="totalEvents" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((score, idx) => (
                  <tr
                    key={score.staffMemberId}
                    className={`border-b border-stone-100 ${idx % 2 === 0 ? '' : 'bg-stone-50/50'}`}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-900">
                          {score.staffName}
                        </span>
                        {topPerformer?.staffMemberId === score.staffMemberId && (
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={getOnTimeVariant(score.onTimeRate)}>
                          {score.onTimeRate.toFixed(1)}%
                        </Badge>
                        {score.onTimeRate < 70 && score.totalEvents >= 3 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-sm ${
                          score.cancellationCount === 0
                            ? 'text-stone-500'
                            : score.cancellationCount >= 3
                              ? 'text-red-600 font-medium'
                              : 'text-amber-600'
                        }`}
                      >
                        {score.cancellationCount}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-sm ${getRatingColor(score.avgRating)}`}>
                        {renderStars(score.avgRating)}
                        {score.avgRating > 0 && (
                          <span className="ml-1 text-xs text-stone-400">
                            ({score.avgRating.toFixed(1)})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-stone-700 font-medium">
                        {score.totalEvents}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Performance thresholds legend */}
        {scores.length > 0 && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stone-100">
            <span className="text-xs text-stone-500">On-Time Thresholds:</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="success">90%+</Badge>
              <span className="text-xs text-stone-500">Excellent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="warning">70-90%</Badge>
              <span className="text-xs text-stone-500">Fair</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="error">&lt;70%</Badge>
              <span className="text-xs text-stone-500">Needs Attention</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
