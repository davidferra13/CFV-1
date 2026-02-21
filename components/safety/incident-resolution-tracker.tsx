'use client'

import { useState, useTransition } from 'react'
import {
  addFollowUpStep,
  toggleFollowUpStep,
  updateResolutionStatus,
} from '@/lib/safety/incident-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type FollowUpStep = { id: string; label: string; completed: boolean; completed_at: string | null }

type IncidentData = {
  id: string
  follow_up_steps: FollowUpStep[]
  resolution_status: string
  description: string
  incident_type: string
  incident_date: string
  parties_involved: string | null
  immediate_action: string | null
}

export function IncidentResolutionTracker({ incident }: { incident: IncidentData }) {
  const [isPending, startTransition] = useTransition()
  const [newStep, setNewStep] = useState('')

  const steps: FollowUpStep[] = Array.isArray(incident.follow_up_steps)
    ? incident.follow_up_steps
    : []

  function handleToggleStep(stepId: string) {
    startTransition(() => toggleFollowUpStep(incident.id, stepId))
  }

  function handleAddStep() {
    if (!newStep.trim()) return
    startTransition(async () => {
      await addFollowUpStep(incident.id, newStep.trim())
      setNewStep('')
    })
  }

  function handleStatusChange(status: string) {
    startTransition(() =>
      updateResolutionStatus(incident.id, status as 'open' | 'in_progress' | 'resolved')
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Follow-Up & Resolution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {steps.map((step) => (
            <label key={step.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={step.completed}
                onChange={() => handleToggleStep(step.id)}
                disabled={isPending}
                className="rounded"
              />
              <span
                className={
                  step.completed ? 'line-through text-stone-400 text-sm' : 'text-sm text-stone-700'
                }
              >
                {step.label}
              </span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            placeholder="Add follow-up step..."
            className="flex-1 border border-stone-300 rounded px-3 py-1.5 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddStep}
            disabled={isPending || !newStep.trim()}
          >
            Add
          </Button>
        </div>

        <div className="pt-3 border-t border-stone-100">
          <p className="text-sm font-medium text-stone-700 mb-2">Resolution Status</p>
          <div className="flex gap-2">
            {(['open', 'in_progress', 'resolved'] as const).map((s) => (
              <Button
                key={s}
                variant={incident.resolution_status === s ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleStatusChange(s)}
                disabled={isPending}
              >
                {s === 'open' ? 'Open' : s === 'in_progress' ? 'In Progress' : 'Resolved'}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
