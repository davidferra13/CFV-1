'use client'

import type { SOP, TrainingStatus } from '@/lib/training/sop-actions'
import { SOP_CATEGORY_LABELS } from '@/lib/training/sop-shared'

type Props = {
  role: string
  sops: SOP[]
  statuses: TrainingStatus[]
  onViewSOP: (sop: SOP) => void
}

export function OnboardingChecklist({ role, sops, statuses, onViewSOP }: Props) {
  const statusMap = new Map<string, TrainingStatus>()
  for (const s of statuses) {
    statusMap.set(s.sop.id, s)
  }

  const completedCount = sops.filter((sop) => {
    const status = statusMap.get(sop.id)
    return status?.completed && !status?.outdated
  }).length

  const progressPercent = sops.length > 0 ? Math.round((completedCount / sops.length) * 100) : 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-white">Onboarding Checklist: {role}</h3>
        <p className="text-xs text-zinc-400 mt-1">
          {completedCount} of {sops.length} SOPs completed
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {sops.map((sop) => {
          const status = statusMap.get(sop.id)
          const isComplete = status?.completed && !status?.outdated
          const isOutdated = status?.outdated

          return (
            <div
              key={sop.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => onViewSOP(sop)}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  isComplete
                    ? 'bg-green-500/20 text-green-400'
                    : isOutdated
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-zinc-700 text-zinc-500'
                }`}
              >
                {isComplete ? 'Y' : isOutdated ? '!' : ' '}
              </div>

              <div className="flex-1">
                <span
                  className={`text-sm ${isComplete ? 'text-zinc-400 line-through' : 'text-white'}`}
                >
                  {sop.title}
                </span>
                <span className="ml-2 text-[10px] text-zinc-500">
                  {SOP_CATEGORY_LABELS[sop.category]}
                </span>
              </div>

              {isOutdated && (
                <span className="text-[10px] text-yellow-400">New version available</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
