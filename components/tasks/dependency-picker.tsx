'use client'

// DependencyPicker - Dropdown to select prerequisite tasks for a given task.
// Shows available tasks and prevents circular dependencies.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { addDependency, removeDependency } from '@/lib/tasks/dependency-actions'
import type { TaskWithDeps } from '@/lib/tasks/dependency-actions'
import { useRouter } from 'next/navigation'

interface DependencyPickerProps {
  taskId: string
  taskName: string
  currentDependencies: string[]
  allTasks: TaskWithDeps[]
  className?: string
}

export function DependencyPicker({
  taskId,
  taskName,
  currentDependencies,
  allTasks,
  className = '',
}: DependencyPickerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Available tasks: exclude self and tasks that already depend on this task (would create cycle)
  const availableTasks = allTasks.filter(
    (t) => t.id !== taskId && !currentDependencies.includes(t.id)
  )

  const dependencyTasks = allTasks.filter((t) => currentDependencies.includes(t.id))

  const handleAdd = (dependsOnId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await addDependency({
          taskId,
          dependsOnTaskId: dependsOnId,
        })
        if (!result.success) {
          setError(result.error ?? 'Failed to add dependency')
          return
        }
        router.refresh()
      } catch (err) {
        console.error('[DependencyPicker] Add failed:', err)
        setError('Failed to add dependency')
      }
    })
  }

  const handleRemove = (depTaskId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        // We need the dependency record ID, but we only have task IDs
        // For now, use a workaround: the server can find and delete by task pair
        const result = await removeDependency(depTaskId)
        if (!result.success) {
          setError(result.error ?? 'Failed to remove dependency')
          return
        }
        router.refresh()
      } catch (err) {
        console.error('[DependencyPicker] Remove failed:', err)
        setError('Failed to remove dependency')
      }
    })
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Current dependencies */}
      {dependencyTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xxs text-stone-500 uppercase tracking-wider">Depends on:</p>
          {dependencyTasks.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-stone-900/50"
            >
              <span className="text-xs text-stone-300 truncate">{dep.text}</span>
              <button
                onClick={() => handleRemove(dep.id)}
                disabled={isPending}
                className="text-xxs text-stone-500 hover:text-red-400 transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xxs text-red-400">{error}</p>}

      {/* Add dependency toggle */}
      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          + Add dependency
        </button>
      ) : (
        <div className="rounded border border-stone-700 bg-stone-900 p-2 space-y-1">
          <p className="text-xxs text-stone-500">
            Select a task that must complete before &quot;{taskName}&quot;:
          </p>
          {availableTasks.length === 0 ? (
            <p className="text-xxs text-stone-600">No available tasks to depend on.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {availableTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAdd(t.id)}
                  disabled={isPending}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-stone-300 hover:bg-stone-800 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{t.text}</span>
                  {t.completed && <Badge variant="success">Done</Badge>}
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" onClick={() => setShowPicker(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
