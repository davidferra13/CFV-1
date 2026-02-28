'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toggleHACCPSection, updateHACCPSectionNotes, markHACCPReviewed } from '@/lib/haccp/actions'
import { toast } from 'sonner'
import type { HACCPPlanData } from '@/lib/haccp/types'

type Props = {
  planData: HACCPPlanData
}

type WizardStep = {
  id: string
  title: string
  description: string
  items: { id: string; label: string; detail: string }[]
}

function buildSteps(planData: HACCPPlanData): WizardStep[] {
  return [
    {
      id: 'prereqs',
      title: 'Prerequisite Programs',
      description:
        "Foundational food safety programs. Toggle off any that don't apply to your operation.",
      items: planData.prerequisitePrograms.map((p) => ({
        id: p.id,
        label: p.name,
        detail: p.description,
      })),
    },
    {
      id: 'process-steps',
      title: 'Process Steps & Hazard Analysis',
      description:
        "Each step in your food handling process and the hazards identified. Toggle off steps that aren't part of your workflow.",
      items: planData.processSteps.map((s) => ({
        id: s.id,
        label: s.name,
        detail: `${s.description} (${s.hazards.length} hazard${s.hazards.length !== 1 ? 's' : ''} identified)`,
      })),
    },
    ...planData.criticalControlPoints.map((ccp) => ({
      id: ccp.id,
      title: `CCP-${ccp.ccpNumber}: ${ccp.processStep}`,
      description: ccp.hazard,
      items: [
        { id: `${ccp.id}-limits`, label: 'Critical Limits', detail: ccp.criticalLimits },
        {
          id: `${ccp.id}-monitoring`,
          label: 'Monitoring',
          detail: `${ccp.monitoring.what} — ${ccp.monitoring.frequency}`,
        },
        {
          id: `${ccp.id}-corrective`,
          label: 'Corrective Actions',
          detail: ccp.correctiveActions.join('. '),
        },
        {
          id: `${ccp.id}-verification`,
          label: 'Verification',
          detail: ccp.verificationProcedures.join('. '),
        },
      ],
    })),
    {
      id: 'records',
      title: 'Record-Keeping',
      description: 'Records you should maintain for compliance and traceability.',
      items: planData.recordKeepingSummary.map((r, i) => ({
        id: `record-${i}`,
        label: r,
        detail: '',
      })),
    },
  ]
}

export function HACCPWizard({ planData }: Props) {
  const steps = buildSteps(planData)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState('')

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  function handleToggle(sectionId: string, enabled: boolean) {
    startTransition(async () => {
      try {
        await toggleHACCPSection(sectionId, enabled)
      } catch (err) {
        toast.error('Failed to toggle HACCP section')
      }
    })
  }

  function handleSaveNotes(sectionId: string) {
    if (!notes.trim()) return
    startTransition(async () => {
      try {
        await updateHACCPSectionNotes(sectionId, notes)
        setNotes('')
      } catch (err) {
        toast.error('Failed to save HACCP notes')
      }
    })
  }

  function handleComplete() {
    startTransition(async () => {
      try {
        await markHACCPReviewed()
      } catch (err) {
        toast.error('Failed to complete HACCP review')
      }
    })
  }

  function isEnabled(id: string) {
    return planData.overrides[id]?.enabled ?? true
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-400">
          Step {currentStep + 1} of {steps.length}
        </span>
        <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current step */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-stone-100">{step.title}</h2>
            <p className="text-sm text-stone-400 mt-1">{step.description}</p>
          </div>

          <div className="space-y-2">
            {step.items.map((item) => (
              <div
                key={item.id}
                className={`rounded-md border border-stone-700 px-3 py-2.5 flex items-start justify-between gap-3 transition-opacity ${
                  !isEnabled(item.id) ? 'opacity-50' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-200">{item.label}</p>
                  {item.detail && <p className="text-xs text-stone-400 mt-0.5">{item.detail}</p>}
                </div>
                {/* Only show toggle for prereqs and process steps (top-level sections) */}
                {(step.id === 'prereqs' || step.id === 'process-steps') && (
                  <Switch
                    checked={isEnabled(item.id)}
                    onCheckedChange={(checked) => handleToggle(item.id, checked)}
                    disabled={isPending}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Notes for this step */}
          {step.id !== 'records' && (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything to add for your operation? (optional)"
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                rows={2}
              />
              {notes.trim() && (
                <Button
                  variant="secondary"
                  onClick={() => handleSaveNotes(step.id)}
                  disabled={isPending}
                >
                  Save Note
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            setCurrentStep((s) => s - 1)
            setNotes('')
          }}
          disabled={isFirst || isPending}
        >
          Back
        </Button>

        {isLast ? (
          <Button variant="primary" onClick={handleComplete} disabled={isPending}>
            {isPending ? 'Saving...' : 'Complete Review'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              setCurrentStep((s) => s + 1)
              setNotes('')
            }}
            disabled={isPending}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
