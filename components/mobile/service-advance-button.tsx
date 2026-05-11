'use client'

import { useTransition } from 'react'

interface ServiceAdvanceButtonProps {
  onAdvance: () => void
  isLastStep: boolean
}

export function ServiceAdvanceButton({ onAdvance, isLastStep }: ServiceAdvanceButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handlePress() {
    startTransition(() => {
      onAdvance()
    })
  }

  return (
    <div className="px-6 pb-8 pt-4">
      <button
        type="button"
        onClick={handlePress}
        disabled={isPending}
        className={`w-full py-5 text-xl font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${
          isLastStep
            ? 'bg-emerald-500 text-white active:bg-emerald-600'
            : 'bg-white text-black active:bg-stone-200'
        }`}
      >
        {isPending ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>SAVING</span>
          </div>
        ) : isLastStep ? (
          'COMPLETE SERVICE'
        ) : (
          'DONE'
        )}
      </button>
    </div>
  )
}
