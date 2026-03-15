'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  generatePrepTimeline,
  generatePrepTimelinePdf,
  CATEGORY_LABELS,
  type PrepTimeline,
  type PrepCategory,
  type PrepTask,
} from '@/lib/events/prep-timeline'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Category colors for the visual blocks
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<
  PrepCategory,
  { bg: string; border: string; badge: string; text: string }
> = {
  'day-before': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800',
    text: 'text-purple-900',
  },
  morning: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-900',
  },
  afternoon: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    text: 'text-amber-900',
  },
  'final-hour': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-900',
  },
  plating: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    text: 'text-red-900',
  },
}

const CATEGORY_ORDER: PrepCategory[] = [
  'day-before',
  'morning',
  'afternoon',
  'final-hour',
  'plating',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrepTimelineView({ eventId }: { eventId: string }) {
  const [timeline, setTimeline] = useState<PrepTimeline | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)

  // Load timeline on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await generatePrepTimeline(eventId)
        if (!cancelled) {
          setTimeline(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load prep timeline')
        }
      }
    }

    startTransition(() => {
      load()
    })

    return () => {
      cancelled = true
    }
  }, [eventId])

  // Toggle task completion
  const toggleTask = useCallback((taskKey: string) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskKey)) {
        next.delete(taskKey)
      } else {
        next.add(taskKey)
      }
      return next
    })
  }, [])

  // Download PDF
  const handleDownloadPdf = useCallback(async () => {
    setIsDownloading(true)
    try {
      const buffer = await generatePrepTimelinePdf(eventId)
      const blob = new Blob([buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prep-timeline-${eventId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
  }, [eventId])

  // Build a unique key for each task
  const taskKey = (task: PrepTask, index: number) =>
    `${task.category}-${task.courseName}-${task.componentName}-${index}`

  // Loading state
  if (isPending && !timeline) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading prep timeline...
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">Could not load prep timeline</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!timeline) return null

  // Group tasks by category
  const grouped = new Map<PrepCategory, PrepTask[]>()
  for (const task of timeline.tasks) {
    const list = grouped.get(task.category) ?? []
    list.push(task)
    grouped.set(task.category, list)
  }

  const completedCount = checkedTasks.size
  const totalCount = timeline.tasks.length

  // Format serve time for display
  function formatServeTime(time: string): string {
    const parts = time.split(':').map(Number)
    let h = parts[0] ?? 0
    const m = parts[1] ?? 0
    const ampm = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prep Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Service at {formatServeTime(timeline.serveTime)} &middot; {timeline.guestCount} guests
            &middot; {timeline.totalPrepMinutes} min total prep
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} done
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Empty state */}
      {timeline.tasks.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>No prep tasks to show.</p>
          <p className="text-sm mt-1">
            Add recipes with prep/cook times to your menu components to generate a timeline.
          </p>
        </div>
      )}

      {/* Time blocks */}
      {CATEGORY_ORDER.map((cat) => {
        const catTasks = grouped.get(cat)
        if (!catTasks || catTasks.length === 0) return null

        const colors = CATEGORY_COLORS[cat]
        const blockMinutes = catTasks.reduce((sum, t) => sum + t.durationMinutes, 0)

        return (
          <div key={cat} className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
            {/* Block header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {catTasks.length} task{catTasks.length !== 1 ? 's' : ''} &middot; {blockMinutes}{' '}
                  min
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {catTasks.map((task, idx) => {
                const key = taskKey(task, idx)
                const checked = checkedTasks.has(key)

                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-md p-2 cursor-pointer transition-colors ${
                      checked ? 'bg-white/60 opacity-60' : 'hover:bg-white/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTask(key)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`font-medium text-sm ${
                            checked ? 'line-through' : ''
                          } ${colors.text}`}
                        >
                          {task.recipeName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {task.durationMinutes} min
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {task.startTime} &middot; {task.courseName} &middot; {task.componentName}
                      </div>
                      {task.executionNotes && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {task.executionNotes}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
