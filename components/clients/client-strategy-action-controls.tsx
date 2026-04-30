'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScheduleMessageForm } from '@/components/communication/schedule-message-form'
import { createTodo, type TodoPriority } from '@/lib/todos/actions'
import {
  recordClientStrategyOutcome,
  recordClientStrategyReplyIntake,
} from '@/lib/clients/client-strategy-actions'
import { buildStrategyRecommendationNote } from '@/lib/clients/client-strategy-note'
import type {
  ClientStrategyActionStatus,
  ClientStrategyActionStatusRecord,
} from '@/lib/clients/client-strategy-ops'
import type {
  ClientStrategyPriority,
  ClientStrategyRecommendation,
} from '@/lib/clients/client-strategy-brief'

type Props = {
  clientId: string
  clientName: string
  recommendation: ClientStrategyRecommendation
  initialStatus?: ClientStrategyActionStatusRecord
}

type OutcomeValue =
  | 'booked'
  | 'no_response'
  | 'profile_updated'
  | 'wrong_recommendation'
  | 'dismissed'

const STATUS_COPY: Record<
  ClientStrategyActionStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  new: { label: 'New', variant: 'default' },
  needs_client: { label: 'Needs client', variant: 'warning' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  reply_review: { label: 'Reply review', variant: 'warning' },
  done: { label: 'Done', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'default' },
  wrong_recommendation: { label: 'Wrong', variant: 'error' },
}

const OUTCOME_OPTIONS: Array<{ value: OutcomeValue; label: string }> = [
  { value: 'booked', label: 'Booked' },
  { value: 'no_response', label: 'No response' },
  { value: 'profile_updated', label: 'Profile updated' },
  { value: 'wrong_recommendation', label: 'Wrong recommendation' },
  { value: 'dismissed', label: 'Dismissed' },
]

export function ClientStrategyActionControls({
  clientId,
  clientName,
  recommendation,
  initialStatus,
}: Props) {
  const needsClient =
    Boolean(recommendation.workflow.messageDraft) ||
    recommendation.id.includes('confirm') ||
    recommendation.id.includes('feedback') ||
    recommendation.id.includes('profile')
  const [status, setStatus] = useState<ClientStrategyActionStatus>(
    initialStatus?.status ?? (needsClient ? 'needs_client' : 'new')
  )
  const [detail, setDetail] = useState(
    initialStatus?.detail ??
      (needsClient
        ? 'This recommendation needs chef-approved client confirmation.'
        : 'No linked reminder or scheduled message exists yet.')
  )
  const [draftOpen, setDraftOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [proposedUpdates, setProposedUpdates] = useState('')
  const [outcome, setOutcome] = useState<OutcomeValue>('profile_updated')
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const dueDate = useMemo(
    () => formatDateForInput(addDays(new Date(), recommendation.workflow.dueInDays)),
    [recommendation.workflow.dueInDays]
  )
  const statusCopy = STATUS_COPY[status]

  function handleCreateTask() {
    startTransition(async () => {
      try {
        const result = await createTodo({
          text: recommendation.workflow.taskText,
          due_date: dueDate,
          priority: priorityToTodo(recommendation.priority),
          category: recommendation.workflow.taskCategory,
          client_id: clientId,
          notes: [
            buildStrategyRecommendationNote(recommendation.id),
            `Client: ${clientName}`,
            `Evidence: ${recommendation.dataUsed.join(' | ')}`,
            `Next step: ${recommendation.nextStep}`,
          ].join('\n'),
        })

        if (!result.success) {
          toast.error(result.error ?? 'Failed to create strategy reminder')
          return
        }

        setStatus('scheduled')
        setDetail('Open reminder exists for this recommendation.')
        toast.success('Strategy reminder created')
      } catch {
        toast.error('Failed to create strategy reminder')
      }
    })
  }

  function handleReplyIntake() {
    const trimmed = replyText.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        const result = await recordClientStrategyReplyIntake({
          clientId,
          recommendationId: recommendation.id,
          recommendationTitle: recommendation.title,
          replyText: trimmed,
          proposedUpdates,
        })

        if (!result.success) {
          toast.error(result.error ?? 'Failed to create reply review')
          return
        }

        setStatus('reply_review')
        setDetail('Client reply needs chef review before profile updates.')
        setReplyText('')
        setProposedUpdates('')
        setReplyOpen(false)
        toast.success('Reply review task created')
      } catch {
        toast.error('Failed to create reply review')
      }
    })
  }

  function handleOutcomeCapture() {
    startTransition(async () => {
      try {
        const result = await recordClientStrategyOutcome({
          clientId,
          recommendationId: recommendation.id,
          recommendationTitle: recommendation.title,
          outcome,
          notes: outcomeNotes,
        })

        if (!result.success) {
          toast.error(result.error ?? 'Failed to record outcome')
          return
        }

        if (outcome === 'wrong_recommendation') {
          setStatus('wrong_recommendation')
          setDetail('Chef marked this recommendation as wrong.')
        } else if (outcome === 'dismissed') {
          setStatus('dismissed')
          setDetail('Chef dismissed this recommendation.')
        } else {
          setStatus('done')
          setDetail(`Outcome recorded: ${outcome.replace(/_/g, ' ')}.`)
        }

        setOutcomeNotes('')
        setOutcomeOpen(false)
        toast.success('Recommendation outcome recorded')
      } catch {
        toast.error('Failed to record outcome')
      }
    })
  }

  function toggleReplyOpen() {
    setReplyOpen((open) => !open)
    setOutcomeOpen(false)
  }

  function toggleOutcomeOpen() {
    setOutcomeOpen((open) => !open)
    setReplyOpen(false)
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950/40 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusCopy.variant}>{statusCopy.label}</Badge>
            {initialStatus?.taskIds.length ? (
              <span className="text-xs text-stone-500">
                {initialStatus.taskIds.length} linked reminder
                {initialStatus.taskIds.length === 1 ? '' : 's'}
              </span>
            ) : null}
            {initialStatus?.replyReviewTaskIds.length ? (
              <span className="text-xs text-stone-500">
                {initialStatus.replyReviewTaskIds.length} reply review
                {initialStatus.replyReviewTaskIds.length === 1 ? '' : 's'}
              </span>
            ) : null}
            {initialStatus?.outcomes.length ? (
              <span className="text-xs text-stone-500">
                {initialStatus.outcomes.length} outcome
                {initialStatus.outcomes.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-stone-500">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={isPending}
            disabled={status === 'done' || status === 'dismissed'}
            onClick={handleCreateTask}
          >
            Create Reminder
          </Button>
          {recommendation.workflow.messageDraft ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraftOpen(true)}>
              Draft Message
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={toggleReplyOpen}>
            Intake Reply
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={toggleOutcomeOpen}>
            Record Outcome
          </Button>
        </div>
      </div>

      {replyOpen ? (
        <div className="mt-4 space-y-3 rounded-lg border border-stone-800 bg-stone-900 p-4">
          <div>
            <label className="block text-xs font-medium text-stone-500">Client reply</label>
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={4}
              maxLength={3000}
              className="mt-1 w-full resize-none rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500">
              Proposed profile updates for chef review
            </label>
            <textarea
              value={proposedUpdates}
              onChange={(event) => setProposedUpdates(event.target.value)}
              rows={2}
              maxLength={1500}
              className="mt-1 w-full resize-none rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200 outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setReplyOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={isPending}
              disabled={!replyText.trim()}
              onClick={handleReplyIntake}
            >
              Create Review Task
            </Button>
          </div>
        </div>
      ) : null}

      {outcomeOpen ? (
        <div className="mt-4 space-y-3 rounded-lg border border-stone-800 bg-stone-900 p-4">
          <div>
            <label className="block text-xs font-medium text-stone-500">Outcome</label>
            <select
              value={outcome}
              onChange={(event) => setOutcome(event.target.value as OutcomeValue)}
              className="mt-1 w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200 outline-none focus:border-brand-500"
            >
              {OUTCOME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500">Notes</label>
            <textarea
              value={outcomeNotes}
              onChange={(event) => setOutcomeNotes(event.target.value)}
              rows={3}
              maxLength={1500}
              className="mt-1 w-full resize-none rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200 outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOutcomeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" loading={isPending} onClick={handleOutcomeCapture}>
              Save Outcome
            </Button>
          </div>
        </div>
      ) : null}

      {draftOpen && recommendation.workflow.messageDraft ? (
        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900 p-4">
          <ScheduleMessageForm
            recipientId={clientId}
            recipientName={clientName}
            contextType="client"
            contextId={clientId}
            defaultSubject={recommendation.workflow.messageDraft.subject}
            defaultBody={recommendation.workflow.messageDraft.body}
            onCancel={() => setDraftOpen(false)}
            onSuccess={() => {
              setDraftOpen(false)
              setStatus('scheduled')
              setDetail('Chef-approved message is scheduled for this recommendation.')
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function priorityToTodo(priority: ClientStrategyPriority): TodoPriority {
  if (priority === 'critical') return 'urgent'
  if (priority === 'high') return 'high'
  if (priority === 'low') return 'low'
  return 'medium'
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}
