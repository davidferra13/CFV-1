'use client'

import { ElapsedTimer } from './elapsed-timer'
import type { ServiceStep } from '@/lib/mobile/service-ticker'

interface ServiceCurrentStepProps {
  step: ServiceStep
  previousCompletedAt: string | null
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function ServiceCurrentStep({ step, previousCompletedAt }: ServiceCurrentStepProps) {
  const scheduledTime = formatTime(step.scheduledTime)

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-8">
      {/* Scheduled time */}
      {scheduledTime && (
        <div className="text-lg text-stone-500 font-mono mb-2">
          {scheduledTime}
        </div>
      )}

      {/* Step label - THE BIG TEXT */}
      <div className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-6">
        {step.label}
      </div>

      {/* Elapsed timer */}
      <ElapsedTimer
        startedAt={previousCompletedAt ?? new Date().toISOString()}
        className="text-2xl text-amber-400"
      />

      {/* Pulsing indicator */}
      <div className="mt-6 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-sm text-stone-400 uppercase tracking-wider">In Progress</span>
      </div>
    </div>
  )
}
