'use client'

/**
 * Per-Chef Coverage Scorecard
 * Shows how much of the chef's ingredient library has direct, regional, or estimated pricing.
 * Stacked bar + text summary. Loads lazily on mount.
 */

import { useEffect, useState, useTransition } from 'react'
import { getChefCoverageScore, type CoverageScore } from '@/lib/pricing/chef-coverage-score'

export function CoverageScorecard() {
  const [score, setScore] = useState<CoverageScore | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getChefCoverageScore()
        setScore(result)
      } catch {
        // Non-critical; silently degrade
      }
    })
  }, [])

  if (!score || score.totalIngredients === 0) return null

  const segments = [
    { label: 'Direct', pct: score.directPct, color: 'bg-emerald-500' },
    { label: 'Regional', pct: score.regionalPct, color: 'bg-sky-500' },
    { label: 'Estimated', pct: score.estimatedPct, color: 'bg-amber-500' },
  ]

  return (
    <div className="flex items-center gap-3 text-xs text-stone-400">
      <span className="font-medium text-stone-300 whitespace-nowrap">Price coverage</span>

      {/* Stacked bar */}
      <div className="flex h-2 w-32 rounded-full overflow-hidden bg-stone-700">
        {segments.map((seg) =>
          seg.pct > 0 ? (
            <div
              key={seg.label}
              className={seg.color}
              style={{ width: `${seg.pct}%` }}
              title={`${seg.label}: ${seg.pct}%`}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <span className="whitespace-nowrap">
        <span className="text-emerald-400">{score.directPct}%</span>
        {' direct'}
        {score.regionalPct > 0 && (
          <>
            {', '}
            <span className="text-sky-400">{score.regionalPct}%</span>
            {' regional'}
          </>
        )}
        {score.estimatedPct > 0 && (
          <>
            {', '}
            <span className="text-amber-400">{score.estimatedPct}%</span>
            {' est.'}
          </>
        )}
      </span>

      {score.syntheticCount > 0 && (
        <span className="text-stone-500">({score.syntheticCount} need your prices)</span>
      )}
    </div>
  )
}
