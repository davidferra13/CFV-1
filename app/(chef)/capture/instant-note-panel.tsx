'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  GitBranch,
  Inbox,
  Layers,
  Link,
  ListChecks,
  Mic,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
} from '@/components/ui/icons'
import {
  createInstantNote,
  markInstantNotesReviewed,
  markInstantNoteReviewed,
  recordInstantNoteCorrection,
  retireInstantNoteLearningRule,
  runInstantNoteWatchdog,
  updateInstantNoteContextBinding,
  updateInstantNoteLearningRule,
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
  review_reason?: string | null
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
  calendar_entry_id?: string | null
  dedupe_key?: string | null
  created_at: string
}

type TraceLink = {
  id: string
  quick_note_id: string
  link_kind: string
  derived_type: string
  derived_ref_id: string | null
  route_layer: string | null
  confidence_score: number | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

type LearningRule = {
  id: string
  rule_type: string
  pattern: string
  instruction: string
  weight: number
  status?: string
  created_at: string
}

type NoteThread = {
  id: string
  thread_key: string
  title: string
  summary: string | null
  status: string
  latest_quick_note_id: string | null
  note_count: number
  first_captured_at: string
  last_captured_at: string
}

type DigestItem = {
  id: string
  quick_note_id: string | null
  interpretation_id: string | null
  item_kind: string
  title: string
  detail: string | null
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  status: string
  created_at: string
}

type WatchdogEvent = {
  id: string
  quick_note_id: string | null
  interpretation_id: string | null
  watchdog_type: string
  title: string
  detail: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  due_at: string | null
  created_at: string
}

type ContextBinding = {
  id: string
  binding_type: string
  target_table: string | null
  target_id: string | null
  label: string
  confidence_score: number
  status: 'suggested' | 'confirmed' | 'rejected'
  created_at: string
}

type RouteAdapter = {
  id: string
  adapter_key: string
  target_layer: string
  target_table: string | null
  target_id: string | null
  status: string
  error: string | null
  created_at: string
}

type SeasonalityWindow = {
  id: string
  ingredient_name: string | null
  window_label: string
  start_date: string | null
  end_date: string | null
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  urgency_reason: string | null
  status: string
  created_at: string
}

type NoteSummary = {
  totalNotes: number
  queuedNotes: number
  reviewCount: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  openActions: number
  urgentActions: number
}

type CaptureState =
  | { status: 'idle' }
  | { status: 'queued'; noteId: string; message: string }
  | { status: 'processing'; noteId: string }
  | { status: 'done'; noteId: string; message: string }
  | { status: 'review'; noteId: string; message: string }
  | { status: 'error'; noteId?: string; message: string }

type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void)
    | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

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

function confidenceBandFromScore(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

export function InstantNotePanel({
  initialReviewQueue,
  initialTrackedActions,
  initialTraceLinks,
  initialLearningRules,
  initialThreads,
  initialDigestItems,
  initialWatchdogEvents,
  initialContextBindings,
  initialRouteAdapters,
  initialSeasonalityWindows,
  initialSummary,
}: {
  initialReviewQueue: ReviewQueueItem[]
  initialTrackedActions: TrackedAction[]
  initialTraceLinks: TraceLink[]
  initialLearningRules: LearningRule[]
  initialThreads: NoteThread[]
  initialDigestItems: DigestItem[]
  initialWatchdogEvents: WatchdogEvent[]
  initialContextBindings: ContextBinding[]
  initialRouteAdapters: RouteAdapter[]
  initialSeasonalityWindows: SeasonalityWindow[]
  initialSummary: NoteSummary | null
}) {
  const [input, setInput] = useState('')
  const [captureState, setCaptureState] = useState<CaptureState>({ status: 'idle' })
  const [reviewQueue, setReviewQueue] = useState(initialReviewQueue)
  const [activeView, setActiveView] = useState<
    'capture' | 'review' | 'digest' | 'trace' | 'context' | 'watchdog' | 'confidence'
  >('capture')
  const [selectedTrace, setSelectedTrace] = useState<TraceLink | null>(null)
  const [contextBindings, setContextBindings] = useState(initialContextBindings)
  const [listening, setListening] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rawText = input
    if (!rawText.trim()) return

    setInput('')
    startTransition(async () => {
      const saved = await createInstantNote({
        text: rawText,
        commandSource: 'capture_page',
      })
      if (!saved.success || !saved.note) {
        setCaptureState({ status: 'error', message: saved.error ?? 'Failed to save note' })
        toast.error(saved.error ?? 'Failed to save note')
        setInput(rawText)
        return
      }

      if (saved.processingMode === 'inline_fallback' && saved.inlineResult?.success === false) {
        setCaptureState({
          status: 'error',
          noteId: saved.note.id,
          message: saved.inlineResult.error ?? 'Saved, but interpretation failed',
        })
        toast.error(saved.inlineResult.error ?? 'Saved, but interpretation failed')
        router.refresh()
        return
      }

      const message =
        saved.processingMode === 'inline_fallback'
          ? 'Saved and processed with an immediate fallback.'
          : 'Raw note saved. Background interpretation is queued.'

      setCaptureState({
        status: saved.processingMode === 'inline_fallback' ? 'done' : 'queued',
        noteId: saved.note.id,
        message,
      })
      toast.success(message)
      router.refresh()
    })
  }

  function startVoiceCapture() {
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      toast.info('Voice capture is not available in this browser.')
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    setListening(true)

    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = 0; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript
      }
      setInput((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript))
    }
    recognition.onerror = () => {
      setListening(false)
      toast.error('Voice capture stopped before a note was captured.')
    }
    recognition.onend = () => setListening(false)
    recognition.start()
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

  function markVisibleReviewed() {
    const visibleIds = reviewQueue.slice(0, 10).map((item) => item.id)
    if (visibleIds.length === 0) return
    const previous = reviewQueue
    setReviewQueue(reviewQueue.filter((queued) => !visibleIds.includes(queued.id)))

    startTransition(async () => {
      const result = await markInstantNotesReviewed({ interpretationIds: visibleIds })
      if (!result.success) {
        setReviewQueue(previous)
        toast.error(result.error ?? 'Failed to mark notes reviewed')
        return
      }
      toast.success(`Marked ${result.count ?? visibleIds.length} note(s) reviewed`)
      router.refresh()
    })
  }

  function updateBinding(binding: ContextBinding, status: 'confirmed' | 'rejected') {
    const previous = contextBindings
    setContextBindings((current) =>
      current.map((item) => (item.id === binding.id ? { ...item, status } : item))
    )

    startTransition(async () => {
      const result = await updateInstantNoteContextBinding({ bindingId: binding.id, status })
      if (!result.success) {
        setContextBindings(previous)
        toast.error(result.error ?? 'Failed to update binding')
        return
      }
      toast.success(status === 'confirmed' ? 'Binding confirmed' : 'Binding rejected')
      router.refresh()
    })
  }

  function bumpRule(rule: LearningRule) {
    startTransition(async () => {
      const result = await updateInstantNoteLearningRule({
        ruleId: rule.id,
        weight: Math.min(rule.weight + 2, 100),
      })
      if (!result.success) {
        toast.error(result.error ?? 'Failed to update rule')
        return
      }
      toast.success('Learning rule weight increased')
      router.refresh()
    })
  }

  function retireRule(rule: LearningRule) {
    startTransition(async () => {
      const result = await retireInstantNoteLearningRule({
        ruleId: rule.id,
        retiredReason: 'Retired from confidence console',
      })
      if (!result.success) {
        toast.error(result.error ?? 'Failed to retire rule')
        return
      }
      toast.success('Learning rule retired')
      router.refresh()
    })
  }

  function scanWatchdog() {
    startTransition(async () => {
      const result = await runInstantNoteWatchdog()
      if (!result.success) {
        toast.error(result.error ?? 'Watchdog scan failed')
        return
      }
      toast.success(`Watchdog created ${result.created ?? 0} issue(s)`)
      router.refresh()
    })
  }

  function saveCorrection(
    item: ReviewQueueItem,
    correctionType: 'classification' | 'routing',
    correctedValue: Record<string, unknown> = { needsHumanReview: true, correctionType }
  ) {
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
          ...correctedValue,
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
      <div className="flex flex-wrap gap-2">
        {[
          ['capture', 'Capture'],
          ['review', `Review ${reviewQueue.length}`],
          ['digest', 'Digest'],
          ['trace', 'Trace'],
          ['context', 'Context'],
          ['watchdog', `Watchdog ${initialWatchdogEvents.length}`],
          ['confidence', 'Confidence'],
        ].map(([view, label]) => (
          <Button
            key={view}
            variant={activeView === view ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView(view as typeof activeView)}
          >
            {label}
          </Button>
        ))}
      </div>

      {initialSummary ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryTile label="Queued" value={initialSummary.queuedNotes} tone="info" />
          <SummaryTile label="Review" value={initialSummary.reviewCount} tone="warning" />
          <SummaryTile label="Actions" value={initialSummary.openActions} tone="success" />
          <SummaryTile label="Urgent" value={initialSummary.urgentActions} tone="error" />
        </div>
      ) : null}

      {activeView === 'capture' ? (
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
                <Button
                  type="submit"
                  variant="primary"
                  loading={isPending}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                  Capture
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={startVoiceCapture}
                  disabled={isPending || listening}
                >
                  <Mic className="h-4 w-4" />
                  {listening ? 'Listening' : 'Voice'}
                </Button>
                {captureState.status !== 'idle' ? (
                  <div className="text-sm text-stone-500 dark:text-stone-400">
                    {captureState.status === 'processing'
                      ? 'Raw note saved. Interpreting now.'
                      : null}
                    {captureState.status === 'queued' ||
                    captureState.status === 'done' ||
                    captureState.status === 'review'
                      ? captureState.message
                      : null}
                    {captureState.status === 'error' ? captureState.message : null}
                  </div>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeView === 'review' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Inbox className="h-5 w-5 text-amber-400" />
                  Review Queue
                  <Badge variant={reviewQueue.length > 0 ? 'warning' : 'success'}>
                    {reviewQueue.length}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markVisibleReviewed}
                  disabled={reviewQueue.length === 0 || isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Batch
                </Button>
              </div>
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
                    {item.review_reason ? (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {item.review_reason}
                      </p>
                    ) : null}
                    {item.time_intelligence?.isTimeSensitive ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{item.time_intelligence.urgency} time sensitivity</span>
                      </div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          saveCorrection(item, 'classification', {
                            classification: 'recipe_concept',
                          })
                        }
                      >
                        Recipe
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          saveCorrection(item, 'classification', {
                            classification: 'task',
                          })
                        }
                      >
                        Task
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          saveCorrection(item, 'classification', {
                            classification: 'seasonal_sourcing_insight',
                          })
                        }
                      >
                        Seasonal
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
      ) : null}

      {activeView === 'digest' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Inbox className="h-5 w-5 text-brand-400" />
                Note Digest
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialDigestItems.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Captured, routed, urgent, and failed note events will collect here.
                </p>
              ) : (
                initialDigestItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="info">{item.item_kind.replace(/_/g, ' ')}</Badge>
                      <Badge variant={urgencyVariant(item.urgency)}>{item.urgency}</Badge>
                      <Badge variant="default">{item.status}</Badge>
                    </div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {item.title}
                    </p>
                    {item.detail ? (
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-emerald-400" />
                Thought Threads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialThreads.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Repeated or related notes will merge into threads here.
                </p>
              ) : (
                initialThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="default">{thread.note_count} note(s)</Badge>
                      <Badge variant={thread.status === 'active' ? 'success' : 'warning'}>
                        {thread.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {thread.title}
                    </p>
                    {thread.summary ? (
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        {thread.summary}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-5 w-5 text-amber-400" />
                Seasonality Resolver
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {initialSeasonalityWindows.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Time-sensitive harvest and sourcing windows will appear here.
                </p>
              ) : (
                initialSeasonalityWindows.map((window) => (
                  <div
                    key={window.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={urgencyVariant(window.urgency)}>{window.urgency}</Badge>
                      <Badge variant="default">{window.status}</Badge>
                    </div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {window.window_label}
                    </p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {[window.start_date, window.end_date].filter(Boolean).join(' to ') ||
                        'Seasonal window inferred from note'}
                    </p>
                    {window.urgency_reason ? (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        {window.urgency_reason}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeView === 'trace' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-brand-400" />
              Note Trace Graph
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialTraceLinks.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Captured notes will show their derived tasks, calendar blocks, ingredients, and
                workflow notes here.
              </p>
            ) : (
              initialTraceLinks.slice(0, 12).map((link) => (
                <button
                  type="button"
                  key={link.id}
                  className="flex w-full flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-left text-sm dark:border-stone-700 dark:bg-stone-800/50"
                  onClick={() => setSelectedTrace(link)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{link.link_kind.replace(/_/g, ' ')}</Badge>
                    <Badge variant="default">{link.derived_type}</Badge>
                    {link.confidence_score != null ? (
                      <Badge variant={link.confidence_score >= 80 ? 'success' : 'warning'}>
                        {link.confidence_score}%
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {link.route_layer ?? 'Trace'} - {new Date(link.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
            {selectedTrace ? (
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-100">
                    <GitBranch className="h-4 w-4 text-brand-400" />
                    Trace Detail
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTrace(null)}>
                    Close
                  </Button>
                </div>
                <div className="grid gap-2 text-xs text-stone-600 dark:text-stone-300 sm:grid-cols-2">
                  <TraceField label="Raw Note" value={selectedTrace.quick_note_id} />
                  <TraceField label="Kind" value={selectedTrace.link_kind} />
                  <TraceField label="Derived Type" value={selectedTrace.derived_type} />
                  <TraceField
                    label="Derived Ref"
                    value={selectedTrace.derived_ref_id ?? 'Pending'}
                  />
                  <TraceField label="Route Layer" value={selectedTrace.route_layer ?? 'Unknown'} />
                  <TraceField
                    label="Confidence"
                    value={
                      selectedTrace.confidence_score != null
                        ? `${selectedTrace.confidence_score}%`
                        : 'Not scored'
                    }
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeView === 'context' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link className="h-5 w-5 text-brand-400" />
                Context Bindings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contextBindings.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Event, ingredient, inventory, and thread context will appear here.
                </p>
              ) : (
                contextBindings.slice(0, 10).map((binding) => (
                  <div
                    key={binding.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="info">{binding.binding_type}</Badge>
                      <Badge
                        variant={confidenceVariant(
                          confidenceBandFromScore(binding.confidence_score)
                        )}
                      >
                        {binding.confidence_score}%
                      </Badge>
                      <Badge
                        variant={
                          binding.status === 'confirmed'
                            ? 'success'
                            : binding.status === 'rejected'
                              ? 'error'
                              : 'warning'
                        }
                      >
                        {binding.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {binding.label}
                    </p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {binding.target_table ?? 'Unbound target'}
                    </p>
                    {binding.status === 'suggested' ? (
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateBinding(binding, 'confirmed')}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateBinding(binding, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-emerald-400" />
                Route Adapters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialRouteAdapters.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Component adapters will show route targets and failures here.
                </p>
              ) : (
                initialRouteAdapters.slice(0, 12).map((adapter) => (
                  <div
                    key={adapter.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="info">{adapter.adapter_key.replace(/_/g, ' ')}</Badge>
                      <Badge variant={adapter.status === 'failed' ? 'error' : 'default'}>
                        {adapter.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {adapter.target_layer}
                    </p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {adapter.target_table ?? 'No table assigned'}
                    </p>
                    {adapter.error ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{adapter.error}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeView === 'watchdog' ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                Execution Watchdog
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={scanWatchdog} loading={isPending}>
                Scan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialWatchdogEvents.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No open execution gaps are currently tracked.
              </p>
            ) : (
              initialWatchdogEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        event.severity === 'critical' || event.severity === 'high'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      {event.severity}
                    </Badge>
                    <Badge variant="default">{event.watchdog_type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {event.title}
                  </p>
                  {event.detail ? (
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {event.detail}
                    </p>
                  ) : null}
                  {event.due_at ? (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Due {new Date(event.due_at).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeView === 'confidence' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-5 w-5 text-emerald-400" />
                Confidence Calibration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialSummary ? (
                <>
                  <ConfidenceRow label="High" value={initialSummary.highConfidence} />
                  <ConfidenceRow label="Medium" value={initialSummary.mediumConfidence} />
                  <ConfidenceRow label="Low" value={initialSummary.lowConfidence} />
                </>
              ) : (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Confidence data could not be loaded.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Learning Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialLearningRules.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Corrections will become reusable interpretation rules here.
                </p>
              ) : (
                initialLearningRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="info">{rule.rule_type}</Badge>
                      <Badge variant="default">Weight {rule.weight}</Badge>
                    </div>
                    <p className="text-sm text-stone-900 dark:text-stone-100">{rule.instruction}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => bumpRule(rule)}>
                        Increase Weight
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => retireRule(rule)}>
                        Retire
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'warning' | 'error' | 'info'
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-stone-500 dark:text-stone-400">{label}</span>
        <Badge variant={tone}>{value}</Badge>
      </div>
    </div>
  )
}

function ConfidenceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
      <span className="text-sm text-stone-700 dark:text-stone-200">{label}</span>
      <Badge variant={label === 'High' ? 'success' : label === 'Medium' ? 'warning' : 'error'}>
        {value}
      </Badge>
    </div>
  )
}

function TraceField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-brand-100 bg-white p-2 dark:border-brand-900 dark:bg-stone-900">
      <div className="text-[11px] uppercase text-stone-400">{label}</div>
      <div className="mt-1 break-all text-xs text-stone-800 dark:text-stone-100">{value}</div>
    </div>
  )
}
