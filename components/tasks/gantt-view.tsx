'use client'

// Gantt View - Visual timeline of tasks with dependency arrows.
// Shows critical path highlighting and task scheduling.
// Uses deterministic critical path analysis (no AI).

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getCriticalPath, getTasksWithDependencies } from '@/lib/tasks/dependency-actions'
import type { TaskWithDeps } from '@/lib/tasks/dependency-actions'
import type { CriticalPathResult } from '@/lib/formulas/critical-path'
import Link from 'next/link'

interface GanttViewProps {
  dateFilter?: string
  className?: string
}

export function GanttView({ dateFilter, className = '' }: GanttViewProps) {
  const [isPending, startTransition] = useTransition()
  const [tasks, setTasks] = useState<TaskWithDeps[]>([])
  const [criticalPath, setCriticalPath] = useState<CriticalPathResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const [taskData, cpData] = await Promise.all([
          getTasksWithDependencies({ dateFilter }),
          getCriticalPath({ dateFilter }),
        ])
        setTasks(taskData)
        setCriticalPath(cpData)
        setError(null)
      } catch (err) {
        console.error('[GanttView] Load failed:', err)
        setError('Could not load task timeline')
      }
    })
  }, [dateFilter])

  if (error) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-4 ${className}`}>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    )
  }

  if (isPending && tasks.length === 0) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-700 rounded w-1/3" />
          <div className="h-8 bg-stone-700 rounded w-full" />
          <div className="h-8 bg-stone-700 rounded w-4/5" />
          <div className="h-8 bg-stone-700 rounded w-3/5" />
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div
        className={`rounded-lg border border-stone-700 bg-stone-800/50 p-6 text-center ${className}`}
      >
        <p className="text-sm text-stone-400">No tasks to show in timeline.</p>
        <p className="text-xs text-stone-500 mt-1">
          Add tasks with time estimates and dependencies to see the Gantt chart.
        </p>
      </div>
    )
  }

  const totalMinutes = criticalPath?.totalDurationMinutes ?? 0
  const schedule = criticalPath?.taskSchedule ?? {}
  const criticalIds = new Set(criticalPath?.criticalPath ?? [])

  // Format minutes to human-readable
  const formatDuration = (mins: number): string => {
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
  }

  return (
    <div
      className={`rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-stone-200">Task Timeline</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Total: {formatDuration(totalMinutes)}
            {criticalPath?.criticalPath && criticalPath.criticalPath.length > 0 && (
              <span className="ml-2">
                Critical path: {criticalPath.criticalPath.length} task
                {criticalPath.criticalPath.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {criticalPath?.hasCycle && <Badge variant="error">Circular dependency detected</Badge>}
      </div>

      {/* Cycle error */}
      {criticalPath?.hasCycle && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-300">
            {criticalPath.cycleError ??
              'Circular dependency detected. Remove cycles to see the timeline.'}
          </p>
        </div>
      )}

      {/* Gantt bars */}
      {!criticalPath?.hasCycle && (
        <div className="px-4 py-3 space-y-1.5">
          {tasks.map((task) => {
            const sched = schedule[task.id]
            const isCritical = criticalIds.has(task.id)
            // estimated_minutes is not in the tasks schema; 30 min is the heuristic default
            const duration = task.estimated_minutes ?? 30
            const barWidth = totalMinutes > 0 ? Math.max((duration / totalMinutes) * 100, 5) : 100
            const barOffset =
              totalMinutes > 0 && sched ? (sched.earliestStart / totalMinutes) * 100 : 0

            return (
              <div key={task.id} className="flex items-center gap-3 group">
                {/* Task name */}
                <div className="w-40 shrink-0 truncate">
                  <span
                    className={`text-xs ${
                      task.completed
                        ? 'text-stone-600 line-through'
                        : isCritical
                          ? 'text-red-300 font-medium'
                          : 'text-stone-300'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Timeline bar area */}
                <div className="flex-1 relative h-6 bg-stone-900/50 rounded overflow-hidden">
                  <div
                    className={`absolute top-0.5 bottom-0.5 rounded transition-all ${
                      task.completed
                        ? 'bg-stone-700'
                        : isCritical
                          ? 'bg-red-500/60 border border-red-500/40'
                          : 'bg-brand-500/40 border border-brand-500/30'
                    }`}
                    style={{
                      left: `${barOffset}%`,
                      width: `${barWidth}%`,
                    }}
                  >
                    <span className="text-xxs text-stone-200 px-1 leading-5 truncate block">
                      {formatDuration(duration)} (est.)
                    </span>
                  </div>
                </div>

                {/* Slack indicator */}
                <div className="w-16 shrink-0 text-right">
                  {sched && !task.completed && (
                    <span
                      className={`text-xxs ${
                        sched.slack === 0 ? 'text-red-400' : 'text-stone-500'
                      }`}
                    >
                      {sched.slack === 0 ? 'Critical' : `+${formatDuration(sched.slack)}`}
                    </span>
                  )}
                  {task.completed && <span className="text-xxs text-emerald-500">Done</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-stone-700 flex items-center gap-4 text-xxs text-stone-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded bg-red-500/60 border border-red-500/40" />
          <span>Critical path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded bg-brand-500/40 border border-brand-500/30" />
          <span>Has slack</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded bg-stone-700" />
          <span>Completed</span>
        </div>
      </div>
    </div>
  )
}
