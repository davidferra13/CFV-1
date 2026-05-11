'use client'

import type { ServiceStep } from '@/lib/mobile/service-ticker'

interface ServiceStepListProps {
  steps: ServiceStep[]
  variant: 'completed' | 'upcoming'
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

function formatDuration(ms: number | null): string {
  if (!ms) return ''
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return '<1m'
  return `${minutes}m`
}

export function ServiceStepList({ steps, variant }: ServiceStepListProps) {
  if (steps.length === 0) return null

  return (
    <div className="space-y-1 px-4">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`flex items-center gap-3 py-2 ${
            variant === 'completed' ? 'opacity-40' : 'opacity-70'
          }`}
        >
          {/* Status dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              variant === 'completed' ? 'bg-emerald-500' : 'bg-stone-600'
            }`}
          />

          {/* Label */}
          <div
            className={`flex-1 text-sm ${
              variant === 'completed'
                ? 'line-through text-stone-500'
                : 'text-stone-300'
            }`}
          >
            {step.label}
          </div>

          {/* Time info */}
          <div className="text-xs text-stone-500 font-mono tabular-nums">
            {variant === 'completed' && step.completedAt
              ? formatTime(step.completedAt)
              : step.scheduledTime
                ? formatTime(step.scheduledTime)
                : ''}
          </div>

          {/* Duration for completed steps */}
          {variant === 'completed' && step.elapsedMs && (
            <div className="text-xs text-stone-600 w-8 text-right">
              {formatDuration(step.elapsedMs)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
