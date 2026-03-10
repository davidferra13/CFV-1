'use client'

// Order Status Tracker
// Visual timeline showing progress through order stages.
// Used for bakery orders, catering orders, etc.

import { Check, Clock } from '@/components/ui/icons'

const ORDER_STAGES = [
  'inquiry',
  'quoted',
  'deposit_paid',
  'in_production',
  'decorating',
  'ready',
  'picked_up',
] as const

const STAGE_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  quoted: 'Quoted',
  deposit_paid: 'Deposit Paid',
  in_production: 'In Production',
  decorating: 'Decorating',
  ready: 'Ready',
  picked_up: 'Picked Up',
}

export function OrderTracker({ currentStage }: { currentStage: string }) {
  const currentIdx = ORDER_STAGES.indexOf(currentStage as (typeof ORDER_STAGES)[number])
  const activeIdx = currentIdx >= 0 ? currentIdx : 0

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {ORDER_STAGES.map((stage, idx) => {
        const isComplete = idx < activeIdx
        const isCurrent = idx === activeIdx
        const isFuture = idx > activeIdx

        return (
          <div key={stage} className="flex items-center">
            {idx > 0 && (
              <div className={`w-6 h-0.5 ${isComplete ? 'bg-green-500' : 'bg-stone-700'}`} />
            )}
            <div className="flex flex-col items-center min-w-[60px]">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isComplete
                    ? 'bg-green-600 text-white'
                    : isCurrent
                      ? 'bg-brand-600 text-white ring-2 ring-brand-400'
                      : 'bg-stone-700 text-stone-500'
                }`}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 text-center whitespace-nowrap ${
                  isCurrent
                    ? 'text-brand-400 font-medium'
                    : isComplete
                      ? 'text-green-400'
                      : 'text-stone-600'
                }`}
              >
                {STAGE_LABELS[stage] || stage}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
