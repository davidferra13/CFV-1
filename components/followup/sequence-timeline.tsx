'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Check, Circle, Mail } from 'lucide-react'

type SequenceStep = {
  id: string
  stepNumber: number
  stepType: string
  templateName?: string
  delayDays: number
  status: 'pending' | 'sent' | 'skipped'
  sentAt?: string
}

type Sequence = {
  id: string
  name: string
  status: 'active' | 'completed' | 'paused'
  enrolledAt: string
  steps: SequenceStep[]
}

type Props = {
  sequences: Sequence[]
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  active: 'info',
  completed: 'success',
  paused: 'warning',
}

const STEP_STATUS_BADGE: Record<string, 'default' | 'success' | 'warning'> = {
  pending: 'default',
  sent: 'success',
  skipped: 'warning',
}

export function SequenceTimeline({ sequences }: Props) {
  return (
    <div className="space-y-6">
      {sequences.map((seq) => (
        <Card key={seq.id}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-stone-400" />
                {seq.name}
              </CardTitle>
              <Badge variant={STATUS_BADGE[seq.status]}>{seq.status}</Badge>
            </div>
            <p className="text-xs text-stone-400">
              Started: {new Date(seq.enrolledAt).toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-stone-700" />

              {seq.steps.map((step, i) => (
                <div key={step.id} className="relative pb-4 last:pb-0">
                  {/* Dot */}
                  <div
                    className={`absolute -left-3.5 w-5 h-5 rounded-full flex items-center justify-center ${
                      step.status === 'sent'
                        ? 'bg-emerald-900'
                        : step.status === 'skipped'
                          ? 'bg-stone-800'
                          : 'bg-surface border-2 border-stone-700'
                    }`}
                  >
                    {step.status === 'sent' ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : step.status === 'skipped' ? (
                      <Circle className="h-3 w-3 text-stone-400" />
                    ) : (
                      <Clock className="h-3 w-3 text-stone-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="ml-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-100">
                        Step {step.stepNumber}: {step.stepType}
                      </span>
                      <Badge variant={STEP_STATUS_BADGE[step.status]}>{step.status}</Badge>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {step.delayDays > 0
                        ? `+${step.delayDays} day${step.delayDays !== 1 ? 's' : ''}`
                        : 'Immediately'}
                      {step.templateName && ` · ${step.templateName}`}
                      {step.sentAt && ` · Sent ${new Date(step.sentAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {sequences.length === 0 && (
        <div className="text-center py-8">
          <Mail className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">No active sequences.</p>
        </div>
      )}
    </div>
  )
}
