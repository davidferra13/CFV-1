'use client'

// DopMobileView - Mobile-optimized day-of protocol view.
// Step-by-step progression with large touch targets.
// Works with the existing DOPSchedule / task_key completion model.

import { useState, useTransition } from 'react'
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toggleDOPTaskCompletion } from '@/lib/scheduling/dop-completions'
import { toast } from 'sonner'
import type { DOPSchedule, DOPTask } from '@/lib/scheduling/types'

// Flatten all applicable phases of a DOPSchedule into a single list of tasks
// that the mobile step-through UI can consume.

interface FlatTask {
  taskKey: string
  label: string
  description: string
  category: string
  isMandatory: boolean
  isAutoComplete: boolean // completed via event flags (cannot be toggled)
  isManuallyComplete: boolean // completed via dop_task_completions record
}

function flattenDOPSchedule(schedule: DOPSchedule, manualKeys: Set<string>): FlatTask[] {
  const phaseOrder: (keyof DOPSchedule['schedule'])[] = [
    'atBooking',
    'dayBefore',
    'morningOf',
    'preDeparture',
    'postService',
  ]

  const tasks: FlatTask[] = []

  for (const phase of phaseOrder) {
    const p = schedule.schedule[phase]
    if (p.status === 'not_applicable') continue

    for (const t of p.tasks) {
      tasks.push({
        taskKey: t.id,
        label: t.label,
        description: t.description,
        category: t.category,
        isMandatory: t.category === 'packing' || t.category === 'admin',
        isAutoComplete: t.isComplete,
        isManuallyComplete: manualKeys.has(t.id),
      })
    }
  }

  return tasks
}

interface DopMobileViewProps {
  eventId: string
  schedule: DOPSchedule
  manualCompletionKeys: Set<string>
  eventTitle: string
  serveTime: string
}

export function DopMobileView({
  eventId,
  schedule,
  manualCompletionKeys: initialManualKeys,
  eventTitle,
  serveTime,
}: DopMobileViewProps) {
  const [manualKeys, setManualKeys] = useState<Set<string>>(initialManualKeys)
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState(0)

  const tasks = flattenDOPSchedule(schedule, manualKeys)
  const completedCount = tasks.filter((t) => t.isAutoComplete || manualKeys.has(t.taskKey)).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const currentTask = tasks[currentStep] ?? null

  function isTaskComplete(task: FlatTask): boolean {
    return task.isAutoComplete || manualKeys.has(task.taskKey)
  }

  function handleToggle(task: FlatTask) {
    if (task.isAutoComplete) {
      toast.info('This task is completed automatically by the system.')
      return
    }

    const wasComplete = manualKeys.has(task.taskKey)

    // Optimistic update
    setManualKeys((prev) => {
      const next = new Set(prev)
      if (wasComplete) {
        next.delete(task.taskKey)
      } else {
        next.add(task.taskKey)
      }
      return next
    })

    startTransition(async () => {
      try {
        await toggleDOPTaskCompletion(eventId, task.taskKey)
      } catch {
        // Revert on error
        setManualKeys((prev) => {
          const next = new Set(prev)
          if (wasComplete) {
            next.add(task.taskKey)
          } else {
            next.delete(task.taskKey)
          }
          return next
        })
        toast.error('Failed to save. Check your connection.')
      }
    })
  }

  const CATEGORY_COLORS: Record<string, string> = {
    documents: 'bg-purple-950 text-purple-700',
    shopping: 'bg-green-950 text-green-700',
    prep: 'bg-brand-950 text-brand-400',
    packing: 'bg-yellow-950 text-yellow-700',
    reset: 'bg-orange-950 text-orange-700',
    admin: 'bg-stone-800 text-stone-300',
  }

  return (
    <div className="min-h-screen bg-stone-800 flex flex-col">
      {/* Header */}
      <div className="bg-stone-900 text-white px-4 pt-6 pb-4">
        <h1 className="text-lg font-bold truncate">{eventTitle}</h1>
        <p className="text-stone-400 text-sm">Service: {serveTime}</p>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>
              {completedCount} of {totalCount} complete
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-stone-700 rounded-full h-2">
            <div
              className="bg-stone-900 rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current task - large, touch-friendly */}
      {currentTask ? (
        <div className="p-4 flex-1">
          <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[currentTask.category] ?? 'bg-stone-800 text-stone-300'}`}
              >
                {currentTask.category}
              </span>
              {currentTask.isAutoComplete && <Badge variant="info">Auto-detected</Badge>}
            </div>

            <h2 className="text-xl font-semibold text-stone-100 mt-3">{currentTask.label}</h2>
            <p className="text-sm text-stone-500 mt-1 mb-6">{currentTask.description}</p>

            {/* Big complete button */}
            {currentTask.isAutoComplete ? (
              <div className="w-full py-5 rounded-xl text-lg font-semibold bg-green-900 border-2 border-green-500 text-green-700 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Auto-Completed
              </div>
            ) : (
              <button
                onClick={() => handleToggle(currentTask)}
                disabled={isPending}
                className={`w-full py-5 rounded-xl text-lg font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                  isTaskComplete(currentTask)
                    ? 'bg-green-900 border-2 border-green-500 text-green-700'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {isTaskComplete(currentTask) ? '✓ Completed - tap to undo' : 'Mark Complete'}
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="secondary"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-stone-500">
              {currentStep + 1} / {totalCount}
            </span>
            <Button
              variant="secondary"
              onClick={() => setCurrentStep(Math.min(totalCount - 1, currentStep + 1))}
              disabled={currentStep === totalCount - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Compressed warning */}
          {schedule.isCompressed && (
            <div className="mt-4 bg-amber-950 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">
                Compressed timeline - less than 48 hours notice. Day-before steps may be skipped.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 flex-1 flex items-center justify-center">
          <p className="text-stone-500 text-sm">No tasks available for this event.</p>
        </div>
      )}

      {/* All tasks scrollable list */}
      <div className="border-t border-stone-700 bg-stone-900 p-4 max-h-72 overflow-y-auto">
        <p className="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">All Tasks</p>
        {tasks.map((task, i) => {
          const complete = isTaskComplete(task)
          return (
            <button
              key={task.taskKey}
              onClick={() => setCurrentStep(i)}
              className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-lg text-left transition-colors ${
                i === currentStep ? 'bg-stone-800' : 'hover:bg-stone-800'
              }`}
            >
              {complete ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-stone-300" />
              )}
              <span
                className={`text-sm truncate flex-1 ${complete ? 'line-through text-stone-400' : 'text-stone-300'}`}
              >
                {task.label}
              </span>
              {i === currentStep && (
                <span className="text-xs text-stone-400 flex-shrink-0">current</span>
              )}
            </button>
          )
        })}

        {tasks.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-2">No tasks generated.</p>
        )}
      </div>
    </div>
  )
}
