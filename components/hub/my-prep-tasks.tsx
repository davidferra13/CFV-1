'use client'

import { useEffect, useState } from 'react'
import { getMyMealAssignments } from '@/lib/hub/prep-assignment-actions'

interface MyPrepTasksProps {
  groupId: string
  groupToken: string
  profileToken: string
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: 'sunrise',
  lunch: 'sun',
  dinner: 'moon',
  snack: 'apple',
}

function formatMealDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function MyPrepTasks({ groupId, groupToken, profileToken }: MyPrepTasksProps) {
  const [assignments, setAssignments] = useState<
    Array<{
      id: string
      meal_date: string
      meal_type: string
      title: string
      description: string | null
      assignment_notes: string | null
      serving_time: string | null
      status: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMyMealAssignments({ groupId, groupToken, profileToken })
      .then((result) => {
        if (active) setAssignments(result.assignments)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [groupId, groupToken, profileToken])

  if (loading) return null
  if (assignments.length === 0) return null

  return (
    <div className="mx-4 mt-4 rounded-xl border border-blue-900/40 bg-blue-950/20 p-3">
      <h3 className="text-xs font-semibold text-blue-300">
        Your Prep Tasks ({assignments.length})
      </h3>
      <div className="mt-2 space-y-2">
        {assignments.map((task) => (
          <div key={task.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-500">{formatMealDate(task.meal_date)}</span>
                <span className="text-[10px] text-stone-600 capitalize">{task.meal_type}</span>
              </div>
              {task.status === 'served' && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-400">
                  done
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-stone-200">{task.title}</p>
            {task.description && (
              <p className="mt-0.5 text-[10px] text-stone-500">{task.description}</p>
            )}
            {task.assignment_notes && (
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                className="mt-1 text-[10px] text-blue-400 hover:text-blue-300"
              >
                {expandedId === task.id ? 'Hide instructions' : 'View instructions'}
              </button>
            )}
            {expandedId === task.id && task.assignment_notes && (
              <div className="mt-1.5 rounded bg-blue-950/40 border border-blue-900/30 px-2 py-1.5">
                <p className="text-[10px] text-blue-200/80 leading-relaxed whitespace-pre-line">
                  {task.assignment_notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
