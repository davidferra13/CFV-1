// Staff Task Checkbox — Toggle task completion from the staff portal
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeMyTask, uncompleteMyTask } from '@/lib/staff/staff-portal-actions'

type Props = {
  taskId: string
  isCompleted: boolean
}

export function StaffTaskCheckbox({ taskId, isCompleted }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(isCompleted)

  async function handleToggle() {
    setLoading(true)
    try {
      if (checked) {
        await uncompleteMyTask(taskId)
        setChecked(false)
      } else {
        await completeMyTask(taskId)
        setChecked(true)
      }
      router.refresh()
    } catch (err) {
      // Revert on error
      setChecked(isCompleted)
      console.error('Failed to toggle task:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
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
  )
}
