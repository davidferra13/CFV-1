'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScheduleMessageForm } from '@/components/communication/schedule-message-form'
import { createTodo, type TodoPriority } from '@/lib/todos/actions'
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

const STATUS_COPY: Record<
  ClientStrategyActionStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  new: { label: 'New', variant: 'default' },
  needs_client: { label: 'Needs client', variant: 'warning' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  done: { label: 'Done', variant: 'success' },
}

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
  const [isPending, startTransition] = useTransition()
  const dueDate = useMemo(
    () => formatDateForInput(addDays(new Date(), recommendation.workflow.dueInDays)),
    [recommendation.workflow.dueInDays]
  )
  const statusCopy = STATUS_COPY[status]

  function handleCreateTask() {
    startTransition(async () => {
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
    })
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
          </div>
          <p className="mt-1 text-xs text-stone-500">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={isPending}
            disabled={status === 'done'}
            onClick={handleCreateTask}
          >
            Create Reminder
          </Button>
          {recommendation.workflow.messageDraft ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraftOpen(true)}>
              Draft Message
            </Button>
          ) : null}
        </div>
      </div>

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
