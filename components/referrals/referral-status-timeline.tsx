'use client'

import { CheckCircle, Clock, Calendar, Star } from '@/components/ui/icons'

export type ReferralStage = 'referred' | 'inquired' | 'booked' | 'completed'

interface ReferralStatusTimelineProps {
  currentStage: ReferralStage
  referredName: string | null
  createdAt: string
}

const STAGES: { key: ReferralStage; label: string; icon: typeof Clock }[] = [
  { key: 'referred', label: 'Referred', icon: Clock },
  { key: 'inquired', label: 'Inquired', icon: Calendar },
  { key: 'booked', label: 'Booked', icon: CheckCircle },
  { key: 'completed', label: 'Completed', icon: Star },
]

function getStageIndex(stage: ReferralStage): number {
  return STAGES.findIndex((s) => s.key === stage)
}

export function ReferralStatusTimeline({
  currentStage,
  referredName,
  createdAt,
}: ReferralStatusTimelineProps) {
  const currentIndex = getStageIndex(currentStage)

  return (
    <div className="flex flex-col gap-2">
      {referredName && <p className="text-sm font-medium text-stone-200 mb-1">{referredName}</p>}
      <div className="flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const StageIcon = stage.icon
          const isActive = idx <= currentIndex
          const isCurrent = idx === currentIndex

          return (
            <div key={stage.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full ${
                    isCurrent
                      ? 'bg-brand-600 ring-2 ring-brand-400/30'
                      : isActive
                        ? 'bg-emerald-600/80'
                        : 'bg-stone-700'
                  }`}
                >
                  <StageIcon
                    className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-500'}`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-1 ${isActive ? 'text-stone-300' : 'text-stone-600'}`}
                >
                  {stage.label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={`w-6 h-0.5 mx-0.5 mt-[-12px] ${
                    idx < currentIndex ? 'bg-emerald-600/80' : 'bg-stone-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-stone-600">
        Referred{' '}
        {new Date(createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  )
}
