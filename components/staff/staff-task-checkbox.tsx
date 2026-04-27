// Staff Task Checkbox - Toggle task completion from the staff portal
// Queues actions in localStorage when offline, replays on reconnect.
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { completeMyTask, uncompleteMyTask } from '@/lib/staff/staff-portal-actions'
import { enqueueTaskAction, isTaskQueued } from '@/lib/staff/offline-task-queue'

type Props = {
  taskId: string
  isCompleted: boolean
}

export function StaffTaskCheckbox({ taskId, isCompleted }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(isCompleted)
  const [queued, setQueued] = useState(false)

  // Check if this task already has a queued offline action
  useEffect(() => {
    setQueued(isTaskQueued(taskId))
  }, [taskId])

  async function handleToggle() {
    const newChecked = !checked

    // If offline, queue the action and update UI optimistically
    if (!navigator.onLine) {
      setChecked(newChecked)
      enqueueTaskAction(taskId, newChecked ? 'complete' : 'uncomplete')
      setQueued(true)
      return
    }

    setLoading(true)
    try {
      if (checked) {
        await uncompleteMyTask(taskId)
        setChecked(false)
      } else {
        await completeMyTask(taskId)
        setChecked(true)
      }
      setQueued(false)
      router.refresh()
    } catch (err) {
      // If the call failed (possibly went offline mid-request), queue it
      if (!navigator.onLine) {
        setChecked(newChecked)
        enqueueTaskAction(taskId, newChecked ? 'complete' : 'uncomplete')
        setQueued(true)
      } else {
        // Revert on genuine server error
        setChecked(isCompleted)
        console.error('Failed to toggle task:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
          checked ? 'bg-emerald-600 border-emerald-600' : 'border-stone-500 hover:border-stone-400'
        } ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        aria-label={checked ? 'Mark task as incomplete' : 'Mark task as complete'}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      {queued && (
        <span className="text-xs text-amber-400 font-medium" title="Will sync when back online">
          (queued)
        </span>
      )}
    </span>
  )
}
