'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, Inbox, ListChecks, Send, Sparkles } from '@/components/ui/icons'
import {
  createInstantNote,
  markInstantNoteReviewed,
  processInstantNote,
  recordInstantNoteCorrection,
} from '@/lib/quick-notes/intelligence-actions'

type ReviewQueueItem = {
  id: string
  quick_note_id: string
  raw_text: string
  confidence_score: number
  confidence_band: 'high' | 'medium' | 'low'
  status: string
  interpretation: any
  time_intelligence: any
  ambiguity_notes: string[]
  error: string | null
  created_at: string
}

type TrackedAction = {
  id: string
  title: string
  description: string | null
  action_type: string
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  status: string
  due_date: string | null
  routed_to: string | null
  routed_ref_id: string | null
  created_at: string
}

type CaptureState =
  | { status: 'idle' }
  | { status: 'saved'; noteId: string }
  | { status: 'processing'; noteId: string }
  | { status: 'done'; noteId: string; message: string }
  | { status: 'review'; noteId: string; message: string }
  | { status: 'error'; noteId?: string; message: string }

function confidenceVariant(confidence: string): 'success' | 'warning' | 'error' {
  if (confidence === 'high') return 'success'
  if (confidence === 'medium') return 'warning'
  return 'error'
}

function urgencyVariant(urgency: string): 'success' | 'warning' | 'error' | 'default' {
  if (urgency === 'urgent' || urgency === 'high') return 'error'
  if (urgency === 'normal') return 'warning'
  if (urgency === 'low') return 'success'
  return 'default'
}

export function InstantNotePanel({
  initialReviewQueue,
  initialTrackedActions,
}: {
  initialReviewQueue: ReviewQueueItem[]
  initialTrackedActions: TrackedAction[]
}) {
  const [input, setInput] = useState('')
  const [captureState, setCaptureState] = useState<CaptureState>({ status: 'idle' })
  const [reviewQueue, setReviewQueue] = useState(initialReviewQueue)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rawText = input
    if (!rawText.trim()) return

    setInput('')
    startTransition(async () => {
      const saved = await createInstantNote({ text: rawText })
      if (!saved.success || !saved.note) {
        setCaptureState({ status: 'error', message: saved.error ?? 'Failed to save note' })
        toast.error(saved.error ?? 'Failed to save note')
        return
      }

      setCaptureState({ status: 'processing', noteId: saved.note.id })

      const processed = await processInstantNote({ quickNoteId: saved.note.id })
      if (!processed.success) {
        setCaptureState({
          status: 'error',
          noteId: saved.note.id,
          message: processed.error ?? 'Saved, but interpretation failed',
        })
        toast.error(processed.error ?? 'Saved, but interpretation failed')
        router.refresh()
        return
      }

      const message = processed.reviewRequired
        ? 'Saved and sent to review with a follow-up task.'
        : `Saved, routed ${processed.components} component(s), and created tracked actions.`

      setCaptureState({
        status: processed.reviewRequired ? 'review' : 'done',
        noteId: saved.note.id,
        message,
      })
      toast.success(message)
      router.refresh()
    })
  }

  function markReviewed(item: ReviewQueueItem) {
    const previous = reviewQueue
    setReviewQueue(reviewQueue.filter((queued) => queued.id !== item.id))

    startTransition(async () => {
      const result = await markInstantNoteReviewed(item.id)
      if (!result.success) {
        setReviewQueue(previous)
        toast.error(result.error ?? 'Failed to mark reviewed')
        return
      }
      toast.success('Marked reviewed')
      router.refresh()
    })
  }

  function saveCorrection(item: ReviewQueueItem, correctionType: 'classification' | 'routing') {
    startTransition(async () => {
      const result = await recordInstantNoteCorrection({
        quickNoteId: item.quick_note_id,
        interpretationId: item.id,
        correctionType,
        originalValue: {
          interpretation: item.interpretation,
          confidence: item.confidence_band,
        },
        correctedValue: {
          needsHumanReview: true,
          correctionType,
        },
        notes:
          correctionType === 'classification'
            ? 'Chef flagged the classification for future interpretation.'
            : 'Chef flagged the routing for future interpretation.',
      })

      if (!result.success) {
        toast.error(result.error ?? 'Failed to save correction')
        return
      }
      setReviewQueue(reviewQueue.filter((queued) => queued.id !== item.id))
      toast.success('Correction saved')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-brand-400" />
            Instant Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Dump the thought here. ChefFlow saves the raw note first, then routes the work."
              className="h-44 w-full resize-y rounded-lg border border-stone-300 bg-white p-4 text-sm text-stone-900 placeholder-stone-400 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
              disabled={isPending}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" loading={isPending} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
                Capture
              </Button>
              {captureState.status !== 'idle' ? (
                <div className="text-sm text-stone-500 dark:text-stone-400">
                  {captureState.status === 'processing'
                    ? 'Raw note saved. Interpreting now.'
                    : null}
                  {captureState.status === 'done' || captureState.status === 'review'
                    ? captureState.message
                    : null}
                  {captureState.status === 'error' ? captureState.message : null}
                </div>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-5 w-5 text-amber-400" />
              Review Queue
              <Badge variant={reviewQueue.length > 0 ? 'warning' : 'success'}>
                {reviewQueue.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewQueue.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">No notes need review.</p>
            ) : (
              reviewQueue.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={confidenceVariant(item.confidence_band)}>
                      {item.confidence_score}% {item.confidence_band}
                    </Badge>
                    <Badge variant="default">{item.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-sm text-stone-900 dark:text-stone-100">{item.raw_text}</p>
                  {item.interpretation?.summary ? (
                    <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                      {item.interpretation.summary}
                    </p>
                  ) : null}
                  {item.ambiguity_notes?.length ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      {item.ambiguity_notes.join(' ')}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => markReviewed(item)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Reviewed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveCorrection(item, 'classification')}
                    >
                      Classification
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveCorrection(item, 'routing')}
                    >
                      Routing
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-5 w-5 text-emerald-400" />
              Tracked Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialTrackedActions.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Captured notes will create tasks and review prompts here.
              </p>
            ) : (
              initialTrackedActions.slice(0, 6).map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {action.title}
                    </p>
                    <Badge variant={urgencyVariant(action.urgency)}>{action.urgency}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span>{action.action_type.replace(/_/g, ' ')}</span>
                    {action.due_date ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {action.due_date}
                      </span>
                    ) : null}
                    <span>{action.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
