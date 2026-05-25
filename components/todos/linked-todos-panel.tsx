'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createTodo, toggleTodo, deleteTodo, type ChefTodo } from '@/lib/todos/actions'
import { Plus, Trash2, CheckCircle2, Circle, Calendar, AlertTriangle } from '@/components/ui/icons'

function isOverdue(todo: ChefTodo): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return todo.due_date < today
}

function formatShortDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tmrw'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PRIORITY_DOTS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-stone-500',
}

type Props = {
  todos: ChefTodo[]
  eventId?: string
  clientId?: string
}

export function LinkedTodosPanel({ todos: initialTodos, eventId, clientId }: Props) {
  const router = useRouter()
  const [todos, setTodos] = useState(initialTodos)
  const [isPending, startTransition] = useTransition()
  const [newText, setNewText] = useState('')

  const incomplete = todos.filter((t) => !t.completed)
  const completed = todos.filter((t) => t.completed)

  function handleToggle(id: string) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completed_at: t.completed ? null : new Date().toISOString(),
            }
          : t
      )
    )
    startTransition(async () => {
      const result = await toggleTodo(id)
      if (!result.success) {
        setTodos(initialTodos)
        toast.error(result.error || 'Failed to update')
      }
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    startTransition(async () => {
      const result = await deleteTodo(id)
      if (!result.success) {
        setTodos(initialTodos)
        toast.error(result.error || 'Failed to delete')
      }
      router.refresh()
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return

    const tempId = `temp-${Date.now()}`
    const optimistic: ChefTodo = {
      id: tempId,
      text,
      completed: false,
      completed_at: null,
      sort_order: todos.length,
      created_at: new Date().toISOString(),
      due_date: null,
      due_time: null,
      priority: 'medium',
      category: 'general',
      reminder_at: null,
      reminder_sent: false,
      notes: null,
      event_id: eventId || null,
      client_id: clientId || null,
    }
    setTodos((prev) => [...prev, optimistic])
    setNewText('')

    startTransition(async () => {
      const result = await createTodo({
        text,
        event_id: eventId || null,
        client_id: clientId || null,
      })
      if (!result.success) {
        setTodos((prev) => prev.filter((t) => t.id !== tempId))
        toast.error(result.error || 'Failed to add todo')
      }
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3">
      <h3 className="text-sm font-medium text-stone-300 mb-2">
        Linked Todos
        {incomplete.length > 0 && (
          <span className="text-stone-500 ml-1">({incomplete.length})</span>
        )}
      </h3>

      {todos.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {[...incomplete, ...completed].map((todo) => {
            const overdue = isOverdue(todo)
            return (
              <div
                key={todo.id}
                className={`group flex items-start gap-2 rounded px-1.5 py-1 transition-colors ${
                  todo.completed
                    ? 'opacity-50'
                    : overdue
                      ? 'bg-red-950/20'
                      : 'hover:bg-stone-700/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(todo.id)}
                  disabled={isPending}
                  className="mt-0.5 flex-shrink-0 text-stone-400 hover:text-brand-500 transition-colors"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-brand-500" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {todo.priority && todo.priority !== 'medium' && (
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOTS[todo.priority] || ''}`}
                      />
                    )}
                    <span
                      className={`text-xs leading-relaxed break-words ${todo.completed ? 'line-through text-stone-400' : 'text-stone-200'}`}
                    >
                      {todo.text}
                    </span>
                  </div>
                  {todo.due_date && !todo.completed && (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${overdue ? 'text-red-400' : 'text-stone-500'}`}
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
                  onClick={() => handleDelete(todo.id)}
                  disabled={isPending}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-1.5">
        <button
          type="submit"
          disabled={isPending || !newText.trim()}
          className="flex-shrink-0 text-stone-500 hover:text-brand-500 disabled:opacity-30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a linked todo..."
          disabled={isPending}
          className="flex-1 bg-transparent border-none text-xs text-stone-300 placeholder:text-stone-600 focus:outline-none"
        />
      </form>
    </div>
  )
}
