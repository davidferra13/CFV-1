'use client'

import type { WorkloadSummary } from '@/lib/hub/circle-pipeline-stats'

interface WorkloadBarProps {
  workload: WorkloadSummary
}

export function CirclesWorkloadBar({ workload }: WorkloadBarProps) {
  const { thisWeekCount, nextWeekCount, maxPerWeek } = workload

  // Don't render if no events and no limit set
  if (thisWeekCount === 0 && nextWeekCount === 0 && !maxPerWeek) return null

  const isOverCapacity = maxPerWeek !== null && thisWeekCount > maxPerWeek
  const isAtCapacity = maxPerWeek !== null && thisWeekCount === maxPerWeek

  return (
    <div className="flex items-center gap-6 rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-stone-500">This week</span>
        <span
          className={`text-lg font-bold ${
            isOverCapacity ? 'text-red-400' : isAtCapacity ? 'text-amber-400' : 'text-stone-200'
          }`}
        >
          {thisWeekCount}
          {maxPerWeek !== null && (
            <span className="text-sm font-normal text-stone-500">/{maxPerWeek}</span>
          )}
        </span>
      </div>

      <div className="h-8 w-px bg-stone-700" />

      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-stone-500">Next week</span>
        <span className="text-lg font-bold text-stone-200">
          {nextWeekCount}
          {maxPerWeek !== null && (
            <span className="text-sm font-normal text-stone-500">/{maxPerWeek}</span>
          )}
        </span>
      </div>

      {isOverCapacity && (
        <span className="ml-auto rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
          Over capacity
        </span>
      )}
      {isAtCapacity && !isOverCapacity && (
        <span className="ml-auto rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
          At capacity
        </span>
      )}
    </div>
  )
}
