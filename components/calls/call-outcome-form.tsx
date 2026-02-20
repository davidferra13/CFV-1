// CallOutcomeForm — log what happened after a call ends

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logCallOutcome, updateCallStatus, type ScheduledCall } from '@/lib/calls/actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

export function CallOutcomeForm({ call }: { call: ScheduledCall }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [outcomeSummary, setOutcomeSummary] = useState(call.outcome_summary ?? '')
  const [callNotes, setCallNotes] = useState(call.call_notes ?? '')
  const [nextAction, setNextAction] = useState(call.next_action ?? '')
  const [nextActionDueAt, setNextActionDueAt] = useState(
    call.next_action_due_at
      ? new Date(call.next_action_due_at).toISOString().slice(0, 10)
      : ''
  )
  const [actualDuration, setActualDuration] = useState(
    call.actual_duration_minutes ? String(call.actual_duration_minutes) : ''
  )

  const isTerminal = call.status === 'completed' || call.status === 'cancelled' || call.status === 'no_show'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        await logCallOutcome(call.id, {
          outcome_summary: outcomeSummary.trim() || null,
          call_notes: callNotes.trim() || null,
          next_action: nextAction.trim() || null,
          next_action_due_at: nextActionDueAt ? new Date(nextActionDueAt).toISOString() : null,
          actual_duration_minutes: actualDuration ? parseInt(actualDuration) : null,
        })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  async function handleNoShow() {
    setError(null)
    startTransition(async () => {
      try {
        await updateCallStatus(call.id, 'no_show')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  if (isTerminal && call.status !== 'completed') {
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="font-semibold text-gray-900">
        {isTerminal ? 'Call Outcome' : 'Log Outcome'}
      </h3>

      {/* Outcome summary */}
      <div className="space-y-1.5">
        <Label htmlFor="outcome_summary">Summary <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Textarea
          id="outcome_summary"
          value={outcomeSummary}
          onChange={e => setOutcomeSummary(e.target.value)}
          placeholder="What was decided? What's the status after this call?"
          rows={3}
          maxLength={2000}
          disabled={isTerminal}
        />
      </div>

      {/* Call notes */}
      <div className="space-y-1.5">
        <Label htmlFor="call_notes">Detailed notes <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Textarea
          id="call_notes"
          value={callNotes}
          onChange={e => setCallNotes(e.target.value)}
          placeholder="Anything else worth capturing — preferences, concerns, ideas discussed…"
          rows={4}
          maxLength={5000}
          disabled={isTerminal}
        />
      </div>

      {/* Next action */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="next_action">Next action <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="next_action"
            value={nextAction}
            onChange={e => setNextAction(e.target.value)}
            placeholder="e.g. Send draft menu by Friday"
            maxLength={500}
            disabled={isTerminal}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next_action_due">Due date <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="next_action_due"
            type="date"
            value={nextActionDueAt}
            onChange={e => setNextActionDueAt(e.target.value)}
            disabled={isTerminal}
          />
        </div>
      </div>

      {/* Actual duration */}
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="actual_duration">Actual call duration (minutes) <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Input
          id="actual_duration"
          type="number"
          min={1}
          max={600}
          value={actualDuration}
          onChange={e => setActualDuration(e.target.value)}
          placeholder={String(call.duration_minutes)}
          disabled={isTerminal}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-3 flex-wrap">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Mark complete & save'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={handleNoShow}
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
          >
            Mark as no-show
          </Button>
        </div>
      )}
    </form>
  )
}
