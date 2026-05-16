// Lifecycle Timeline Component for Client Portal
// Visual timeline showing completed, current, and upcoming stages.
'use client'

import { CheckCircle, Clock, Circle } from '@/components/ui/icons'

export interface TimelineStage {
  stage: number
  label: string
  status: 'completed' | 'current' | 'upcoming'
  message: string
  completedAt: string | null
}

interface LifecycleTimelineProps {
  stages: TimelineStage[]
  currentStage: number
}

export function LifecycleTimeline({ stages, currentStage }: LifecycleTimelineProps) {
  if (!stages || stages.length === 0) return null

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Booking Progress</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage.stage} className="relative flex items-start gap-3 pl-0">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                {stage.status === 'completed' && <CheckCircle className="h-6 w-6 text-green-600" />}
                {stage.status === 'current' && (
                  <Clock className="h-6 w-6 text-blue-600 animate-pulse" />
                )}
                {stage.status === 'upcoming' && (
                  <Circle className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      stage.status === 'completed'
                        ? 'text-green-700'
                        : stage.status === 'current'
                          ? 'text-blue-700'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {stage.label}
                  </span>
                  {stage.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(stage.completedAt)}
                    </span>
                  )}
                </div>
                {stage.status === 'current' && (
                  <p className="text-sm text-muted-foreground mt-0.5">{stage.message}</p>
                )}
                {stage.status === 'upcoming' && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{stage.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
