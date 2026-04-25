'use client'

import { useState, useTransition, useRef, memo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  AlertTriangle,
  ArrowRight,
} from '@/components/ui/icons'
import { createTodo, toggleTodo, deleteTodo, type ChefTodo } from '@/lib/todos/actions'

// ─── HELPERS ────────────────────────────────────────────

function isOverdue(todo: ChefTodo): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return todo.due_date < today
}

function isDueToday(todo: ChefTodo): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return todo.due_date === today
}

function formatShortDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tmrw'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── PRIORITY DOT ───────────────────────────────────────

const PRIORITY_DOTS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-stone-500',
}

// ─── TODO ITEM ROW ──────────────────────────────────────

const TodoRow = memo(function TodoRow({
  todo,
  onToggle,
  onDelete,
  disabled,
}: {
  todo: ChefTodo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  disabled: boolean
}) {
  const overdue = isOverdue(todo)
  const dueToday = isDueToday(todo)

  return (
    <div
      className={`group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors ${
        todo.completed ? 'opacity-50' : overdue ? 'bg-red-950/20' : 'hover:bg-stone-800'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        disabled={disabled}
        className="mt-0.5 flex-shrink-0 text-stone-400 hover:text-brand-600 transition-colors disabled:cursor-not-allowed"
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed ? (
          <CheckCircle2 className="h-5 w-5 text-brand-500" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {todo.priority && todo.priority !== 'medium' && (
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOTS[todo.priority] || ''}`}
            />
          )}
          <span
            className={`text-sm leading-relaxed break-words ${
              todo.completed ? 'line-through text-stone-400' : 'text-stone-200'
            }`}
          >
            {todo.text}
          </span>
        </div>
        {todo.due_date && !todo.completed && (
          <span
            className={`flex items-center gap-1 text-[11px] mt-0.5 ${
              overdue ? 'text-red-400' : dueToday ? 'text-yellow-400' : 'text-stone-500'
            }`}
          >
            {overdue ? (
              <AlertTriangle className="h-2.5 w-2.5" />
            ) : (
              <Calendar className="h-2.5 w-2.5" />
            )}
            {formatShortDate(todo.due_date)}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        disabled={disabled}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 text-stone-300 hover:text-red-500 transition-all disabled:cursor-not-allowed"
        aria-label="Delete todo"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
})

// ─── ADD TODO FORM ──────────────────────────────────────

function AddTodoForm({
  onAdd,
  disabled,
}: {
  onAdd: (text: string) => Promise<void>
  disabled: boolean
}) {
  const [value, setValue] = useState('')
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = value.trim()
    if (!text) return

    setValue('')
    startTransition(async () => {
      try {
        await onAdd(text)
        inputRef.current?.focus()
      } catch (err) {
        setValue(text)
        toast.error('Failed to add task')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-800"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task..."
        maxLength={500}
        disabled={disabled || pending}
        className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-stone-400 text-stone-200 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled || pending || !value.trim()}
        className="flex-shrink-0 p-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Add task"
      >
        <Plus className="h-4 w-4" />
      </button>
    </form>
  )
}

// ─── MAIN WIDGET ────────────────────────────────────────

export function ChefTodoWidget({ initialTodos }: { initialTodos: ChefTodo[] }) {
  const [todos, setTodos] = useState<ChefTodo[]>(initialTodos)
  const [isPending, startTransition] = useTransition()

  const incomplete = todos.filter((t) => !t.completed)
  const completed = todos.filter((t) => t.completed)
  const sortedTodos = [...incomplete, ...completed]
  const overdueCount = todos.filter(isOverdue).length

  async function handleAdd(text: string) {
    const tempId = `temp-${Date.now()}`
    const optimisticTodo: ChefTodo = {
      id: tempId,
      text,
      completed: false,
      completed_at: null,
      sort_order: incomplete.length,
      created_at: new Date().toISOString(),
      due_date: null,
      due_time: null,
      priority: 'medium',
      category: 'general',
      reminder_at: null,
      reminder_sent: false,
      notes: null,
      event_id: null,
      client_id: null,
    }

    setTodos((prev) => [...prev, optimisticTodo])

    const result = await createTodo(text)

    if (result.success && result.id) {
      setTodos((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: result.id! } : t)))
    } else {
      setTodos((prev) => prev.filter((t) => t.id !== tempId))
    }
  }

  function handleToggle(id: string) {
    const original = todos.find((t) => t.id === id)
    if (!original) return

    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completed_at: !t.completed ? new Date().toISOString() : null,
            }
          : t
      )
    )

    startTransition(async () => {
      try {
        const result = await toggleTodo(id)
        if (!result.success) {
          setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
        }
      } catch (err) {
        setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
        toast.error('Failed to update task')
      }
    })
  }

  function handleDelete(id: string) {
    const original = todos.find((t) => t.id === id)
    setTodos((prev) => prev.filter((t) => t.id !== id))

    startTransition(async () => {
      try {
        const result = await deleteTodo(id)
        if (!result.success && original) {
          setTodos((prev) =>
            [...prev, original].sort((a, b) =>
              a.sort_order !== b.sort_order
                ? a.sort_order - b.sort_order
                : a.created_at.localeCompare(b.created_at)
            )
          )
        }
      } catch (err) {
        if (original) {
          setTodos((prev) =>
            [...prev, original].sort((a, b) =>
              a.sort_order !== b.sort_order
                ? a.sort_order - b.sort_order
                : a.created_at.localeCompare(b.created_at)
            )
          )
        }
        toast.error('Failed to delete task')
      }
    })
  }

  const completedCount = completed.length
  const totalCount = todos.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>To Do</CardTitle>
          <div className="flex items-center gap-3">
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} overdue
              </span>
            )}
            {totalCount > 0 && (
              <span className="text-xs text-stone-400 tabular-nums">
                {completedCount}/{totalCount} done
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTodos.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">
            Nothing on the list. Add a task below.
          </p>
        ) : (
          <div className="space-y-0.5">
            {sortedTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onDelete={handleDelete}
                disabled={isPending}
              />
            ))}
          </div>
        )}
        <AddTodoForm onAdd={handleAdd} disabled={isPending} />

        {/* Link to full reminders page */}
        <div className="mt-3 pt-2 border-t border-stone-800">
          <Link
            href="/reminders"
            className="flex items-center justify-center gap-1.5 text-xs text-stone-400 hover:text-brand-400 transition-colors py-1"
          >
            Manage reminders
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
