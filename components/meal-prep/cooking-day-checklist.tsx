'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, CheckCircle, Clock, ChevronDown, ChevronUp, Users } from '@/components/ui/icons'
import type {
  CookingDayPlan,
  CookingTask,
  CookingTaskPhase,
} from '@/lib/meal-prep/cooking-day-actions'
import { toggleCookingTask } from '@/lib/meal-prep/cooking-day-actions'

interface CookingDayChecklistProps {
  plan: CookingDayPlan
}

const PHASE_LABELS: Record<CookingTaskPhase, string> = {
  prep: 'Prep',
  cook: 'Cook',
  portion: 'Portion',
  label: 'Label',
  pack: 'Pack',
}

const PHASE_DESCRIPTIONS: Record<CookingTaskPhase, string> = {
  prep: 'Wash, chop, marinate, season (all raw prep)',
  cook: 'Proteins first, then grains, then vegetables',
  portion: 'Divide into containers per client',
  label: 'Print and apply labels',
  pack: 'Organize by client for delivery',
}

const PHASE_COLORS: Record<CookingTaskPhase, string> = {
  prep: 'text-blue-400',
  cook: 'text-orange-400',
  portion: 'text-green-400',
  label: 'text-purple-400',
  pack: 'text-amber-400',
}

export function CookingDayChecklist({ plan: initialPlan }: CookingDayChecklistProps) {
  const [plan, setPlan] = useState(initialPlan)
  const [pending, startTransition] = useTransition()
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const completed = plan.tasks.filter((t) => t.completed).length
  const total = plan.tasks.length
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const totalMinutes = plan.tasks
    .filter((t) => !t.completed)
    .reduce((sum, t) => sum + t.estimatedMinutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  // Group tasks by phase
  const phases: CookingTaskPhase[] = ['prep', 'cook', 'portion', 'label', 'pack']
  const tasksByPhase = new Map<CookingTaskPhase, CookingTask[]>()
  for (const phase of phases) {
    tasksByPhase.set(
      phase,
      plan.tasks.filter((t) => t.phase === phase)
    )
  }

  function handleToggle(taskKey: string) {
    const previous = { ...plan, tasks: [...plan.tasks] }

    // Optimistic update
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.taskKey === taskKey ? { ...t, completed: !t.completed } : t)),
    }))

    startTransition(async () => {
      try {
        await toggleCookingTask(plan.weekStartDate, taskKey)
      } catch {
        setPlan(previous)
      }
    })
  }

  function toggleExpanded(taskKey: string) {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskKey)) {
        next.delete(taskKey)
      } else {
        next.add(taskKey)
      }
      return next
    })
  }

  function getPhaseProgress(phase: CookingTaskPhase): {
    completed: number
    total: number
  } {
    const phaseTasks = tasksByPhase.get(phase) || []
    return {
      completed: phaseTasks.filter((t) => t.completed).length,
      total: phaseTasks.length,
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-stone-200">
              {completed}/{total} Tasks
            </span>
            <span className="text-sm text-stone-500">({progressPct}%)</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-stone-400">
            <Clock className="w-4 h-4" />
            <span>
              {totalMinutes > 0
                ? hours > 0
                  ? `~${hours}h ${mins}m remaining`
                  : `~${mins}m remaining`
                : 'All done!'}
            </span>
          </div>
        </div>
        <div className="w-full bg-stone-700 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </Card>

      {/* Tasks by phase */}
      {phases.map((phase) => {
        const phaseTasks = tasksByPhase.get(phase) || []
        if (phaseTasks.length === 0) return null

        const phaseProgress = getPhaseProgress(phase)
        const phaseComplete = phaseProgress.completed === phaseProgress.total

        return (
          <div key={phase} className="space-y-2">
            {/* Phase header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${PHASE_COLORS[phase]}`}>
                  {PHASE_LABELS[phase]}
                </h3>
                <span className="text-xs text-stone-500">{PHASE_DESCRIPTIONS[phase]}</span>
              </div>
              <div className="flex items-center gap-2">
                {phaseComplete && <CheckCircle className="w-4 h-4 text-green-400" />}
                <Badge variant={phaseComplete ? 'success' : 'default'}>
                  {phaseProgress.completed}/{phaseProgress.total}
                </Badge>
              </div>
            </div>

            {/* Tasks */}
            {phaseTasks.map((task) => {
              const isExpanded = expandedTasks.has(task.taskKey)

              return (
                <Card
                  key={task.taskKey}
                  className={`p-3 transition-all ${
                    task.completed ? 'opacity-60 bg-stone-800/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(task.taskKey)}
                      disabled={pending}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-stone-600 hover:border-stone-400'
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            task.completed ? 'text-stone-500 line-through' : 'text-stone-200'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-stone-500 whitespace-nowrap">
                            ~{task.estimatedMinutes}m
                          </span>
                          {task.clients.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(task.taskKey)}
                              className="text-stone-500 hover:text-stone-300"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {task.notes && !task.completed && (
                        <p className="text-xs text-stone-500 mt-1">{task.notes}</p>
                      )}

                      {/* Expanded client list */}
                      {isExpanded && (
                        <div className="mt-2 pl-1 space-y-1">
                          <div className="flex items-center gap-1 text-xs text-stone-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>Clients:</span>
                          </div>
                          {task.clients.map((client) => (
                            <p key={client} className="text-xs text-stone-400 pl-5">
                              {client}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      })}

      {/* Complete cooking day */}
      {total > 0 && completed === total && (
        <Card className="p-4 text-center border-green-600/30 bg-green-900/10">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-lg font-semibold text-green-400">Cooking Day Complete!</p>
          <p className="text-sm text-stone-400 mt-1">
            All {total} tasks finished. Ready for delivery.
          </p>
        </Card>
      )}
    </div>
  )
}
