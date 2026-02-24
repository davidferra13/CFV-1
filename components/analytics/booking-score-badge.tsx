'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { BookingScore } from '@/lib/analytics/booking-score'

interface BookingScoreBadgeProps {
  score: BookingScore
}

export function BookingScoreBadge({ score }: BookingScoreBadgeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const variant =
    score.level === 'conflict'
      ? 'error'
      : score.level === 'high'
        ? 'success'
        : score.level === 'medium'
          ? 'warning'
          : 'default'

  const label = score.level === 'conflict' ? 'Conflict' : `${score.score}`

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      <Badge variant={variant}>{score.level === 'conflict' ? label : `Score: ${label}`}</Badge>

      {showBreakdown && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-56 bg-surface border border-stone-700 rounded-lg shadow-lg p-3 text-xs text-stone-300">
          <p className="font-semibold text-stone-100 mb-2">Score Breakdown</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">Profitability</span>
              <span
                className={
                  score.breakdown.profitabilityPoints >= 30 ? 'text-emerald-600 font-medium' : ''
                }
              >
                +{score.breakdown.profitabilityPoints}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">
                {score.isNewClient ? 'New client bonus' : 'Client reliability'}
              </span>
              <span
                className={
                  score.breakdown.clientReliabilityPoints >= 20
                    ? 'text-emerald-600 font-medium'
                    : ''
                }
              >
                +
                {score.isNewClient
                  ? score.breakdown.newClientBonus
                  : score.breakdown.clientReliabilityPoints}
              </span>
            </div>
            {score.breakdown.dateConflictPenalty !== 0 && (
              <div className="flex justify-between">
                <span className="text-red-600 font-medium">Date conflict</span>
                <span className="text-red-600 font-medium">
                  {score.breakdown.dateConflictPenalty}
                </span>
              </div>
            )}
            <div className="border-t border-stone-800 pt-1 mt-1 flex justify-between font-semibold">
              <span className="text-stone-300">Total</span>
              <span>{score.breakdown.total} / 100</span>
            </div>
          </div>
          {score.hasDateConflict && (
            <p className="mt-2 text-red-600 text-xs font-medium">
              You already have a confirmed event on this date.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
