'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleCleaningTask, type CleaningLogEntry } from '@/lib/haccp/compliance-log-actions'

type Props = {
  date: string
  initialTasks: CleaningLogEntry[]
}

const AREA_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  foh: 'Front of House',
  restroom: 'Restroom',
  storage: 'Storage',
  exterior: 'Exterior',
}

export function CleaningChecklist({ date, initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Group by area
  const byArea = new Map<string, CleaningLogEntry[]>()
  for (const task of tasks) {
    const group = byArea.get(task.area) ?? []
    group.push(task)
    byArea.set(task.area, group)
  }

  function handleToggle(taskId: string) {
    setError(null)
    const previous = [...tasks]

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null,
            }
          : t
      )
    )

    startTransition(async () => {
      try {
        const updated = await toggleCleaningTask(taskId)
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      } catch (err: any) {
        setTasks(previous)
        setError(err.message || 'Failed to update task')
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded px-3 py-2">
          {error}
        </p>
      )}

      {Array.from(byArea.entries()).map(([area, areaTasks]) => {
        const completed = areaTasks.filter((t) => t.completed).length
        const total = areaTasks.length
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0

        return (
          <Card key={area} className="border-stone-800 bg-stone-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-stone-100 text-base">
                  {AREA_LABELS[area] ?? area}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {completed}/{total}
                  </span>
                  <div className="w-20 h-2 bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct === 100 ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {areaTasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-stone-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task.id)}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-green-500 focus:ring-green-500"
                  />
                  <span
                    className={`text-sm ${
                      task.completed ? 'text-stone-500 line-through' : 'text-stone-200'
                    }`}
                  >
                    {task.taskName}
                  </span>
                  {task.completed && task.completedAt && (
                    <span className="ml-auto text-xs text-stone-600">
                      {new Date(task.completedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </label>
              ))}
            </CardContent>
          </Card>
        )
      })}

      {tasks.length === 0 && (
        <p className="text-stone-500 text-sm text-center py-8">
          No cleaning tasks for {date}. Tasks will be auto-generated when you first load a date.
        </p>
      )}
    </div>
  )
}
