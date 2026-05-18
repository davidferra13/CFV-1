'use client'

import { Brain, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { LearningNudgeData } from './types'

type LearningNudgeProps = {
  nudge: LearningNudgeData
  onAccept?: (nudge: LearningNudgeData) => void
  onDismiss?: (nudge: LearningNudgeData) => void
  disabled?: boolean
}

export function LearningNudge({ nudge, onAccept, onDismiss, disabled }: LearningNudgeProps) {
  const thresholdLabel =
    nudge.confidenceThreshold === undefined ? null : `${Math.round(nudge.confidenceThreshold)}%`

  return (
    <Card className="border-brand-700/40 bg-brand-950/20 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 rounded-md border border-brand-700/60 bg-brand-950/60 p-2">
            <Brain className="h-4 w-4 text-brand-300" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-50">Pattern detected</h3>
              <Badge variant="info" className="capitalize">
                {nudge.domain}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-5 text-stone-300">
              You approved {nudge.actionType} {nudge.approvalCount} times. Let ChefFlow use{' '}
              {nudge.suggestedMode === 'auto' ? 'auto mode' : 'approval mode'} next time.
            </p>
            {(thresholdLabel || nudge.sampleLabel) && (
              <p className="mt-2 text-xs text-stone-500">
                {nudge.sampleLabel}
                {nudge.sampleLabel && thresholdLabel ? ' - ' : ''}
                {thresholdLabel ? `Confidence floor ${thresholdLabel}` : null}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 sm:flex-col lg:flex-row">
          <Button type="button" size="sm" onClick={() => onAccept?.(nudge)} disabled={disabled}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Apply
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDismiss?.(nudge)}
            disabled={disabled}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  )
}
