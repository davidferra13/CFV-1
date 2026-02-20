'use client'

import { useState, useTransition, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { createTodo, toggleTodo, deleteTodo, type ChefTodo } from '@/lib/todos/actions'

// ============================================
// TODO ITEM ROW
// ============================================

function TodoRow({
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
  return (
    <div
      className={`group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors ${
        todo.completed ? 'opacity-50' : 'hover:bg-stone-50'
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

      <span
        className={`flex-1 text-sm leading-relaxed break-words ${
          todo.completed ? 'line-through text-stone-400' : 'text-stone-800'
        }`}
      >
        {todo.text}
      </span>

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
}

// ============================================
// ADD TODO FORM
// ============================================

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
      await onAdd(text)
      inputRef.current?.focus()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Add a task…"
        maxLength={500}
        disabled={disabled || pending}
        className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-stone-400 text-stone-800 disabled:cursor-not-allowed"
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

// ============================================
// MAIN WIDGET
// ============================================

export function ChefTodoWidget({ initialTodos }: { initialTodos: ChefTodo[] }) {
  const [todos, setTodos] = useState<ChefTodo[]>(initialTodos)
  const [isPending, startTransition] = useTransition()

  // Sort: incomplete first (by sort_order), completed last
  const incomplete = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)
  const sortedTodos = [...incomplete, ...completed]

  // Add: show immediately with a temp ID, then swap in real ID on confirm
  async function handleAdd(text: string) {
    const tempId = `temp-${Date.now()}`
    const optimisticTodo: ChefTodo = {
      id: tempId,
      text,
      completed: false,
      completed_at: null,
      sort_order: incomplete.length,
      created_at: new Date().toISOString(),
    }

    setTodos(prev => [...prev, optimisticTodo])

    const result = await createTodo(text)

    if (result.success && result.id) {
      // Swap temp ID for the real database ID so subsequent toggle/delete work
      setTodos(prev => prev.map(t => t.id === tempId ? { ...t, id: result.id! } : t))
    } else {
      // Revert on failure
      setTodos(prev => prev.filter(t => t.id !== tempId))
    }
  }

  // Toggle: show immediately, revert to original state on failure
  function handleToggle(id: string) {
    const original = todos.find(t => t.id === id)
    if (!original) return

    setTodos(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null }
          : t
      )
    )

    startTransition(async () => {
      const result = await toggleTodo(id)
      if (!result.success) {
        setTodos(prev => prev.map(t => t.id === id ? original : t))
      }
    })
  }

  // Delete: remove immediately, restore on failure
  function handleDelete(id: string) {
    const original = todos.find(t => t.id === id)
    setTodos(prev => prev.filter(t => t.id !== id))

    startTransition(async () => {
      const result = await deleteTodo(id)
      if (!result.success && original) {
        setTodos(prev =>
          [...prev, original].sort((a, b) =>
            a.sort_order !== b.sort_order
              ? a.sort_order - b.sort_order
              : a.created_at.localeCompare(b.created_at)
          )
        )
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
          {totalCount > 0 && (
            <span className="text-xs text-stone-400 tabular-nums">
              {completedCount}/{totalCount} done
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedTodos.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">
            Nothing on the list. Add a task below.
          </p>
        ) : (
          <div className="space-y-0.5">
            {sortedTodos.map(todo => (
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
      </CardContent>
    </Card>
  )
}
