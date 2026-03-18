'use client'

// Task Page Client - wraps the task board with date navigation, create form toggle, and editing.
// Phase 1: Shows carried-over tasks from previous days.
// Phase 7: Includes quick-assign support.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskBoard } from './task-board'
import { TaskForm } from './task-form'
import type { Task } from '@/lib/tasks/actions'
import type { CarriedTask } from '@/lib/tasks/carry-forward'
import { completeTask, updateTask } from '@/lib/tasks/actions'

type StaffOption = { id: string; name: string; role: string }
type StationOption = { id: string; name: string }

type GroupedTasks = Record<string, { staffName: string; staffRole: string; tasks: Task[] }>

type Props = {
  grouped: GroupedTasks
  unassigned: Task[]
  carriedOver?: CarriedTask[]
  staff: StaffOption[]
  stations: StationOption[]
  selectedDate: string
  today: string
}

export function TaskPageClient({
  grouped,
  unassigned,
  carriedOver = [],
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
          {carriedOver.length > 0 && (
            <Badge variant="warning" className="ml-2 text-xxs">
              {carriedOver.length} overdue
            </Badge>
          )}
        </span>
      </div>

      {/* Carried-over tasks (Phase 1) */}
      {isToday && carriedOver.length > 0 && (
        <CarriedOverSection tasks={carriedOver} onEditTask={handleEditTask} />
      )}

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
        staff={staff}
      />
    </div>
  )
}

// ============================================
// CARRIED-OVER TASKS SECTION (Phase 1)
// ============================================

function CarriedOverSection({
  tasks,
  onEditTask,
}: {
  tasks: CarriedTask[]
  onEditTask: (task: Task) => void
}) {
  const router = useRouter()
  const [completing, setCompleting] = useState<string | null>(null)

  async function handleComplete(taskId: string) {
    setCompleting(taskId)
    try {
      await completeTask(taskId)
      router.refresh()
    } catch (err) {
      console.error('Failed to complete carried task:', err)
    } finally {
      setCompleting(null)
    }
  }

  return (
    <Card className="border-amber-900/40 bg-amber-950/10">
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base text-amber-400">Carried Over</CardTitle>
          <Badge variant="warning">{tasks.length}</Badge>
          <span className="text-xs text-stone-500 ml-auto">
            Incomplete tasks from previous days
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 pb-3">
        {tasks.map((task) => {
          const isCompleting = completing === task.id
          return (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-lg bg-amber-950/20 border border-amber-900/30 px-3 py-2.5"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Complete button */}
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleting}
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border bg-stone-800 border-stone-600 ring-1 ring-inset ring-stone-500 hover:bg-stone-700 disabled:opacity-40"
                  title="Mark as done"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-200">{task.title}</span>
                    <Badge
                      variant={
                        task.priority === 'urgent'
                          ? 'error'
                          : task.priority === 'high'
                            ? 'warning'
                            : 'default'
                      }
                      className="text-xxs"
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-amber-500">{task.daysOverdue}d overdue</span>
                  </div>
                  {task.staff_member && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      {(task.staff_member as any).name}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEditTask(task)}
                className="text-xs text-stone-400 hover:text-stone-200 px-1.5 py-0.5 flex-shrink-0"
              >
                Edit
              </button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
