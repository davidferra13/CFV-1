'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getRecurringSchedules,
  deleteRecurringSchedule,
  updateRecurringSchedule,
  generateUpcomingEvents,
  type RecurringSchedule,
} from '@/lib/scheduling/recurring-actions'

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface RecurringSchedulesListProps {
  clientId?: string
  onEdit?: (schedule: RecurringSchedule) => void
}

export function RecurringSchedulesList({ clientId, onEdit }: RecurringSchedulesListProps) {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  async function loadSchedules() {
    try {
      setError(null)
      const data = await getRecurringSchedules(clientId)
      setSchedules(data)
    } catch (err) {
      setError('Failed to load recurring schedules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [clientId])

  function handleToggleActive(schedule: RecurringSchedule) {
    const previous = [...schedules]
    // Optimistic update
    setSchedules((prev) =>
      prev.map((s) => (s.id === schedule.id ? { ...s, isActive: !s.isActive } : s))
    )

    startTransition(async () => {
      try {
        await updateRecurringSchedule(schedule.id, { isActive: !schedule.isActive })
        setActionFeedback(schedule.isActive ? 'Schedule deactivated' : 'Schedule reactivated')
        setTimeout(() => setActionFeedback(null), 3000)
      } catch (err) {
        setSchedules(previous) // rollback
        setActionFeedback('Failed to update schedule')
        setTimeout(() => setActionFeedback(null), 3000)
      }
    })
  }

  function handleDelete(id: string) {
    const previous = [...schedules]
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: false } : s)))

    startTransition(async () => {
      try {
        await deleteRecurringSchedule(id)
        setActionFeedback('Schedule deactivated')
        setTimeout(() => setActionFeedback(null), 3000)
      } catch (err) {
        setSchedules(previous) // rollback
        setActionFeedback('Failed to deactivate schedule')
        setTimeout(() => setActionFeedback(null), 3000)
      }
    })
  }

  function handleGenerate(scheduleId: string, title: string) {
    startTransition(async () => {
      try {
        const result = await generateUpcomingEvents(scheduleId, 4)
        setActionFeedback(`Created ${result.created} draft events for "${title}"`)
        setTimeout(() => setActionFeedback(null), 5000)
        loadSchedules() // refresh to show updated dates
      } catch (err) {
        setActionFeedback(err instanceof Error ? err.message : 'Failed to generate events')
        setTimeout(() => setActionFeedback(null), 5000)
      }
    })
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading recurring schedules...</div>
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  const filtered = showInactive ? schedules : schedules.filter((s) => s.isActive)

  if (filtered.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4">
        {schedules.length > 0
          ? 'No active recurring schedules. Toggle "Show inactive" to see all.'
          : 'No recurring schedules yet. Create one to automate meal prep scheduling.'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Action feedback */}
      {actionFeedback && (
        <div className="rounded-md bg-blue-50 p-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          {actionFeedback}
        </div>
      )}

      {/* Filter toggle */}
      {schedules.some((s) => !s.isActive) && (
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={() => setShowInactive(!showInactive)}
          />
          Show inactive schedules
        </label>
      )}

      {/* Schedules table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 dark:text-gray-400">
              <th className="pb-2 pr-4">Client</th>
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4">Frequency</th>
              <th className="pb-2 pr-4">Day</th>
              <th className="pb-2 pr-4">Next Date</th>
              <th className="pb-2 pr-4">Menu</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((schedule) => (
              <tr key={schedule.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">{schedule.clientName ?? 'Unknown'}</td>
                <td className="py-3 pr-4">{schedule.title}</td>
                <td className="py-3 pr-4">
                  {FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}
                </td>
                <td className="py-3 pr-4">
                  {schedule.dayOfWeek !== null ? DAY_NAMES[schedule.dayOfWeek] : '-'}
                </td>
                <td className="py-3 pr-4">{formatDate(schedule.nextOccurrence)}</td>
                <td className="py-3 pr-4">{schedule.menuName ?? 'None'}</td>
                <td className="py-3 pr-4">
                  <Badge variant={schedule.isActive ? 'success' : 'default'}>
                    {schedule.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="py-3">
                  <div className="flex gap-1 flex-wrap">
                    {schedule.isActive && (
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerate(schedule.id, schedule.title)}
                        disabled={isPending}
                      >
                        Generate Events
                      </Button>
                    )}
                    {onEdit && (
                      <Button variant="ghost" onClick={() => onEdit(schedule)} disabled={isPending}>
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleActive(schedule)}
                      disabled={isPending}
                    >
                      {schedule.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
