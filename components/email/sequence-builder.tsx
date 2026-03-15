'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createSequence,
  updateSequence,
  addStep,
  updateStep,
  removeStep,
  reorderSteps,
  previewStep,
  type TriggerType,
  type SequenceInput,
  type StepInput,
} from '@/lib/email/sequence-actions'

// ============================================
// TYPES
// ============================================

interface SequenceStep {
  id: string
  sequence_id: string
  step_number: number
  delay_days: number
  subject_template: string
  body_template: string
  created_at: string
}

interface Sequence {
  id: string
  chef_id: string
  name: string
  trigger_type: TriggerType
  is_active: boolean
  created_at: string
  email_sequence_steps: SequenceStep[]
}

interface SequenceBuilderProps {
  sequence?: Sequence | null
  onSaved?: (seq: any) => void
  onCancel?: () => void
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  post_inquiry: 'After Inquiry',
  post_event: 'After Event',
  post_quote: 'After Quote Sent',
  anniversary: 'Anniversary',
  dormant_30d: 'Dormant (30 days)',
  dormant_60d: 'Dormant (60 days)',
  manual: 'Manual',
}

const TRIGGER_OPTIONS: TriggerType[] = [
  'post_inquiry',
  'post_event',
  'post_quote',
  'anniversary',
  'dormant_30d',
  'dormant_60d',
  'manual',
]

const TEMPLATE_VARIABLES = [
  { key: '{{client_name}}', label: 'Client Name' },
  { key: '{{client_email}}', label: 'Client Email' },
  { key: '{{chef_name}}', label: 'Chef/Business Name' },
  { key: '{{event_date}}', label: 'Event Date' },
  { key: '{{event_type}}', label: 'Event Type' },
  { key: '{{inquiry_date}}', label: 'Inquiry Date' },
  { key: '{{guest_count}}', label: 'Guest Count' },
]

// ============================================
// COMPONENT
// ============================================

export function SequenceBuilder({
  sequence,
  onSaved,
  onCancel,
}: SequenceBuilderProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(sequence?.name ?? '')
  const [triggerType, setTriggerType] = useState<TriggerType>(
    sequence?.trigger_type ?? 'post_inquiry'
  )
  const [isActive, setIsActive] = useState(sequence?.is_active ?? true)
  const [steps, setSteps] = useState<SequenceStep[]>(
    sequence?.email_sequence_steps ?? []
  )
  const [previewData, setPreviewData] = useState<{
    subject: string
    body: string
    stepId: string
  } | null>(null)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)

  // Track unsaved new steps (not yet persisted)
  const [draftStep, setDraftStep] = useState<StepInput | null>(null)

  const isEditing = !!sequence

  // ----------------------------------------
  // Save sequence header
  // ----------------------------------------
  function handleSaveHeader() {
    if (!name.trim()) {
      toast.error('Sequence name is required')
      return
    }

    const previousName = sequence?.name
    const previousTrigger = sequence?.trigger_type
    const previousActive = sequence?.is_active

    startTransition(async () => {
      try {
        const input: SequenceInput = {
          name: name.trim(),
          trigger_type: triggerType,
          is_active: isActive,
        }

        if (isEditing) {
          const result = await updateSequence(sequence.id, input)
          onSaved?.(result)
          toast.success('Sequence updated')
        } else {
          const result = await createSequence(input)
          onSaved?.(result)
          toast.success('Sequence created')
        }
      } catch {
        // Rollback on failure
        if (isEditing) {
          setName(previousName ?? '')
          setTriggerType(previousTrigger ?? 'post_inquiry')
          setIsActive(previousActive ?? true)
        }
        toast.error('Failed to save sequence')
      }
    })
  }

  // ----------------------------------------
  // Add step
  // ----------------------------------------
  function handleStartAddStep() {
    setDraftStep({
      step_number: steps.length + 1,
      delay_days: steps.length === 0 ? 0 : 3,
      subject_template: '',
      body_template: '',
    })
  }

  function handleSaveDraftStep() {
    if (!sequence?.id || !draftStep) return
    if (!draftStep.subject_template.trim() || !draftStep.body_template.trim()) {
      toast.error('Subject and body are required')
      return
    }

    const previousSteps = [...steps]

    startTransition(async () => {
      try {
        const result = await addStep(sequence.id, draftStep)
        setSteps((prev) => [...prev, result])
        setDraftStep(null)
        toast.success('Step added')
      } catch {
        setSteps(previousSteps)
        toast.error('Failed to add step')
      }
    })
  }

  // ----------------------------------------
  // Remove step
  // ----------------------------------------
  function handleRemoveStep(stepId: string) {
    const previousSteps = [...steps]

    setSteps((prev) => prev.filter((s) => s.id !== stepId))

    startTransition(async () => {
      try {
        await removeStep(stepId)
        toast.success('Step removed')
      } catch {
        setSteps(previousSteps)
        toast.error('Failed to remove step')
      }
    })
  }

  // ----------------------------------------
  // Update step inline
  // ----------------------------------------
  function handleUpdateStep(stepId: string, updates: Partial<StepInput>) {
    const previousSteps = [...steps]

    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    )

    startTransition(async () => {
      try {
        await updateStep(stepId, updates)
        setEditingStepId(null)
      } catch {
        setSteps(previousSteps)
        toast.error('Failed to update step')
      }
    })
  }

  // ----------------------------------------
  // Move step up/down
  // ----------------------------------------
  function handleMoveStep(index: number, direction: 'up' | 'down') {
    if (!sequence?.id) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= steps.length) return

    const previousSteps = [...steps]
    const reordered = [...steps]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    // Update step_numbers
    const updated = reordered.map((s, i) => ({
      ...s,
      step_number: i + 1,
    }))
    setSteps(updated)

    startTransition(async () => {
      try {
        await reorderSteps(
          sequence.id,
          updated.map((s) => s.id)
        )
      } catch {
        setSteps(previousSteps)
        toast.error('Failed to reorder steps')
      }
    })
  }

  // ----------------------------------------
  // Preview
  // ----------------------------------------
  function handlePreview(stepId: string) {
    if (!sequence?.id) return

    startTransition(async () => {
      try {
        // Preview with a placeholder client (uses the first available)
        const result = await previewStep(stepId, '')
        setPreviewData({ ...result, stepId })
      } catch {
        toast.error('Preview requires a client to be selected')
      }
    })
  }

  // ----------------------------------------
  // RENDER
  // ----------------------------------------
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-lg font-semibold">
          {isEditing ? 'Edit Sequence' : 'New Sequence'}
        </h3>

        <div className="space-y-3">
          <div>
            <Label htmlFor="seq-name">Sequence Name</Label>
            <Input
              id="seq-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome Series"
            />
          </div>

          <div>
            <Label htmlFor="seq-trigger">Trigger</Label>
            <select
              id="seq-trigger"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TRIGGER_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="seq-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="seq-active">Active</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSaveHeader} disabled={isPending}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Steps section (only when editing an existing sequence) */}
      {isEditing && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Steps</h3>
            <Button
              variant="secondary"
              onClick={handleStartAddStep}
              disabled={isPending || !!draftStep}
            >
              + Add Step
            </Button>
          </div>

          {/* Template variables reference */}
          <div className="text-xs text-muted-foreground rounded bg-muted p-2">
            <span className="font-medium">Available variables: </span>
            {TEMPLATE_VARIABLES.map((v) => (
              <code key={v.key} className="mx-1 bg-background px-1 rounded">
                {v.key}
              </code>
            ))}
          </div>

          {/* Step timeline */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="relative border rounded-lg p-4 space-y-2"
              >
                {/* Timeline connector */}
                {index > 0 && (
                  <div className="absolute -top-4 left-6 h-4 w-px bg-border" />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Step {step.step_number}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {step.delay_days === 0
                        ? 'Send immediately'
                        : `Wait ${step.delay_days} day${step.delay_days !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => handleMoveStep(index, 'up')}
                      disabled={index === 0 || isPending}
                    >
                      Up
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleMoveStep(index, 'down')}
                      disabled={index === steps.length - 1 || isPending}
                    >
                      Down
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handlePreview(step.id)}
                      disabled={isPending}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setEditingStepId(
                          editingStepId === step.id ? null : step.id
                        )
                      }
                    >
                      {editingStepId === step.id ? 'Close' : 'Edit'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleRemoveStep(step.id)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {editingStepId === step.id ? (
                  <StepEditor
                    step={step}
                    onSave={(updates) => handleUpdateStep(step.id, updates)}
                    isPending={isPending}
                  />
                ) : (
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Subject:</span>{' '}
                      {step.subject_template}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">
                      {step.body_template}
                    </p>
                  </div>
                )}

                {/* Preview panel */}
                {previewData?.stepId === step.id && (
                  <div className="mt-2 rounded bg-muted p-3 space-y-1 text-sm">
                    <p className="font-medium">Preview:</p>
                    <p>
                      <span className="text-muted-foreground">Subject:</span>{' '}
                      {previewData.subject}
                    </p>
                    <p className="whitespace-pre-wrap">{previewData.body}</p>
                    <Button
                      variant="ghost"
                      onClick={() => setPreviewData(null)}
                    >
                      Close Preview
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Draft step form */}
            {draftStep && (
              <div className="border border-dashed rounded-lg p-4 space-y-3">
                <h4 className="font-medium">
                  New Step {draftStep.step_number}
                </h4>

                <div>
                  <Label>Delay (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draftStep.delay_days}
                    onChange={(e) =>
                      setDraftStep({
                        ...draftStep,
                        delay_days: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Subject</Label>
                  <Input
                    value={draftStep.subject_template}
                    onChange={(e) =>
                      setDraftStep({
                        ...draftStep,
                        subject_template: e.target.value,
                      })
                    }
                    placeholder="e.g. Welcome, {{client_name}}!"
                  />
                </div>

                <div>
                  <Label>Body</Label>
                  <Textarea
                    value={draftStep.body_template}
                    onChange={(e) =>
                      setDraftStep({
                        ...draftStep,
                        body_template: e.target.value,
                      })
                    }
                    placeholder="Hi {{client_name}}, thanks for reaching out..."
                    rows={5}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleSaveDraftStep}
                    disabled={isPending}
                  >
                    Save Step
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDraftStep(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {steps.length === 0 && !draftStep && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No steps yet. Add your first step to start building the
                sequence.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// STEP EDITOR (inline)
// ============================================

function StepEditor({
  step,
  onSave,
  isPending,
}: {
  step: SequenceStep
  onSave: (updates: Partial<StepInput>) => void
  isPending: boolean
}) {
  const [delayDays, setDelayDays] = useState(step.delay_days)
  const [subject, setSubject] = useState(step.subject_template)
  const [body, setBody] = useState(step.body_template)

  return (
    <div className="space-y-3 pt-2">
      <div>
        <Label>Delay (days)</Label>
        <Input
          type="number"
          min={0}
          value={delayDays}
          onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
        />
      </div>

      <div>
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div>
        <Label>Body</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
        />
      </div>

      <Button
        variant="primary"
        onClick={() =>
          onSave({
            delay_days: delayDays,
            subject_template: subject,
            body_template: body,
          })
        }
        disabled={isPending}
      >
        Save Changes
      </Button>
    </div>
  )
}
