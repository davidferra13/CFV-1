'use client'

// Task Page Client — wraps the task board with date navigation, create form toggle, and editing
// Server page passes data down; this component handles client-side interactivity.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskBoard } from './task-board'
import { TaskForm } from './task-form'
import type { Task } from '@/lib/tasks/actions'

type StaffOption = { id: string; name: string; role: string }
type StationOption = { id: string; name: string }

type GroupedTasks = Record<string, { staffName: string; staffRole: string; tasks: Task[] }>

type Props = {
  grouped: GroupedTasks
  unassigned: Task[]
  staff: StaffOption[]
  stations: StationOption[]
  selectedDate: string
  today: string
}

export function TaskPageClient({
  grouped,
  unassigned,
  staff,
  stations,
  selectedDate,
  today,
}: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  function handleDateChange(newDate: string) {
    router.push(`/tasks?date=${newDate}`)
  }

  function navigateDate(offset: number) {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + offset)
    const newDate = current.toISOString().split('T')[0]
    router.push(`/tasks?date=${newDate}`)
  }

  function handleEditTask(task: Task) {
    setEditingTask(task)
    setShowCreate(false)
  }

  function handleFormDone() {
    setShowCreate(false)
    setEditingTask(null)
  }

  // Count total tasks
  const totalTasks =
    Object.values(grouped).reduce((sum, g) => sum + g.tasks.length, 0) + unassigned.length
  const doneTasks =
    Object.values(grouped).reduce(
      (sum, g) => sum + g.tasks.filter((t) => t.status === 'done').length,
      0
    ) + unassigned.filter((t) => t.status === 'done').length

  const isToday = selectedDate === today

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigateDate(-1)}
          className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm"
        >
          Previous
        </button>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />

        <button
          type="button"
          onClick={() => navigateDate(1)}
          className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm"
        >
          Next
        </button>

        {!isToday && (
          <button
            type="button"
            onClick={() => handleDateChange(today)}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm"
          >
            Today
          </button>
        )}

        {/* Summary */}
        <span className="ml-auto text-sm text-stone-400">
          {totalTasks === 0 ? 'No tasks' : `${doneTasks}/${totalTasks} completed`}
        </span>
      </div>

      {/* Create / Edit form */}
      {editingTask ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              task={editingTask}
              staff={staff}
              stations={stations}
              defaultDate={selectedDate}
              onDone={handleFormDone}
            />
          </CardContent>
        </Card>
      ) : showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              staff={staff}
              stations={stations}
              defaultDate={selectedDate}
              onDone={handleFormDone}
            />
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
      )}

      {/* Task board */}
      <TaskBoard
        grouped={grouped}
        unassigned={unassigned}
        selectedDate={selectedDate}
        onEditTask={handleEditTask}
      />
    </div>
  )
}
