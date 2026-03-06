'use client'

import { useEffect, useState, useTransition } from 'react'
import { estimatePrepTime } from '@/lib/intelligence/prep-time-estimator'
import type { PrepTimeEstimate } from '@/lib/intelligence/prep-time-estimator'

interface PrepTimeEstimateHintProps {
  guestCount: number
  occasion?: string | null
}

export function PrepTimeEstimateHint({ guestCount, occasion }: PrepTimeEstimateHintProps) {
  const [estimate, setEstimate] = useState<PrepTimeEstimate | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!guestCount || guestCount <= 0) {
      setEstimate(null)
      return
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await estimatePrepTime(guestCount, occasion ?? undefined)
          setEstimate(result)
        } catch {
          setEstimate(null)
        }
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [guestCount, occasion])

  if (!estimate || isPending) return null

  const totalMin = estimate.estimatedTotalMinutes
  const phases = [
    { label: 'Shopping', min: estimate.estimatedShoppingMinutes },
    { label: 'Prep', min: estimate.estimatedPrepMinutes },
    { label: 'Service', min: estimate.estimatedServiceMinutes },
    { label: 'Travel', min: estimate.estimatedTravelMinutes },
    { label: 'Reset', min: estimate.estimatedResetMinutes },
  ].filter((p) => p.min > 0)

  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-800/30 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-400">Estimated Time Budget</span>
        <span className="text-sm font-semibold text-stone-200">
          {formatMinutes(totalMin)} total
        </span>
      </div>
      <div className="flex gap-1">
        {phases.map((phase) => {
          const pct = Math.round((phase.min / totalMin) * 100)
          return (
            <div key={phase.label} className="relative group" style={{ flex: pct }}>
              <div
                className={`h-2 rounded-full ${
                  phase.label === 'Shopping'
                    ? 'bg-blue-600'
                    : phase.label === 'Prep'
                      ? 'bg-amber-600'
                      : phase.label === 'Service'
                        ? 'bg-green-600'
                        : phase.label === 'Travel'
                          ? 'bg-purple-600'
                          : 'bg-stone-600'
                }`}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-stone-900 text-xs text-stone-300 px-2 py-1 rounded whitespace-nowrap z-10">
                {phase.label}: {formatMinutes(phase.min)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-2">
        {phases.map((phase) => (
          <span key={phase.label} className="text-xs text-stone-500">
            {phase.label}: {formatMinutes(phase.min)}
          </span>
        ))}
      </div>
      <p className="text-xs text-stone-600 mt-1.5">
        Based on {estimate.basedOnEvents} similar events
        {estimate.confidence !== 'high' && ' (limited data)'}
      </p>
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
