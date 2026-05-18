'use client'

import { useState, useTransition, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createReminder,
  toggleReminder,
  deleteReminder,
  updateReminder,
  snoozeReminder,
  unsnoozeReminder,
} from '@/lib/reminders/actions'
import type { ChefReminder, CreateReminderInput } from '@/lib/reminders/types'
import { SNOOZE_OPTIONS } from '@/lib/reminders/types'
import type { ParsedReminder } from '@/lib/reminders/natural-language'
import {
  QuickAddBar,
  ReminderForm,
  ReminderRow,
  isDueThisWeek,
  isDueToday,
  isOverdue,
  isSnoozed,
  sortTodos,
  type FilterView,
} from './reminders-components'

export function RemindersClient({ initialTodos }: { initialTodos: ChefReminder[] }) {
  const [todos, setTodos] = useState<ChefReminder[]>(initialTodos)
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<FilterView>('all')
  const [editingTodo, setEditingTodo] = useState<ChefReminder | null>(null)

  // ── Counts ──
  const overdueCount = todos.filter(isOverdue).length
  const todayCount = todos.filter(isDueToday).length
  const upcomingCount = todos.filter(isDueThisWeek).length
  const completedCount = todos.filter((t) => t.completed).length
  const activeCount = todos.filter((t) => !t.completed).length
  const snoozedCount = todos.filter(isSnoozed).length

  // ── Filtered list ──
  const filtered = useMemo(
    () =>
      sortTodos(
        todos.filter((t) => {
          switch (view) {
            case 'today':
              return isDueToday(t) || isOverdue(t)
            case 'upcoming':
              return isDueThisWeek(t) && !t.completed
            case 'overdue':
              return isOverdue(t)
            case 'completed':
              return t.completed
            case 'snoozed':
              return isSnoozed(t)
            default:
              return true
          }
        })
      ),
    [todos, view]
  )

  // ── Handlers ──
  const handleCreate = useCallback(
    async (input: CreateReminderInput) => {
      const tempId = `temp-${Date.now()}`
      const optimistic: ChefReminder = {
        id: tempId,
        chef_id: '',
        text: input.text,
        completed: false,
        completed_at: null,
        sort_order: todos.length,
        created_at: new Date().toISOString(),
        due_date: input.due_date ?? null,
        due_time: input.due_time ?? null,
        priority: input.priority ?? 'medium',
        category: input.category ?? 'general',
        reminder_at: input.reminder_at ?? null,
        reminder_sent: false,
        notes: input.notes ?? null,
        event_id: input.event_id ?? null,
        client_id: input.client_id ?? null,
        snoozed_until: null,
        recurring_rule: input.recurring_rule ?? null,
        location_trigger: input.location_trigger ?? null,
      }

      setTodos((prev) => [...prev, optimistic])

      const result = await createReminder(input)
      if (result.success && result.id) {
        setTodos((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: result.id! } : t)))
        toast.success('Reminder added')
      } else {
        setTodos((prev) => prev.filter((t) => t.id !== tempId))
        toast.error(result.error || 'Failed to add reminder')
      }
    },
    [todos.length]
  )

  const handleUpdate = useCallback(
    async (input: CreateReminderInput) => {
      if (!editingTodo) return
      const id = editingTodo.id

      // Optimistic update
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                text: input.text,
                due_date: input.due_date ?? null,
                due_time: input.due_time ?? null,
                priority: input.priority ?? t.priority,
                category: input.category ?? t.category,
                reminder_at: input.reminder_at ?? null,
                reminder_sent:
                  input.reminder_at !== editingTodo.reminder_at ? false : t.reminder_sent,
                notes: input.notes ?? null,
                recurring_rule: input.recurring_rule ?? null,
              }
            : t
        )
      )

      setEditingTodo(null)

      const result = await updateReminder(id, input)
      if (result.success) {
        toast.success('Reminder updated')
      } else {
        // Revert
        setTodos((prev) => prev.map((t) => (t.id === id ? editingTodo : t)))
        toast.error(result.error || 'Failed to update')
      }
    },
    [editingTodo]
  )

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
        const result = await toggleReminder(id)
        if (!result.success) {
          setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
        }
      } catch {
        setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
        toast.error('Failed to update')
      }
    })
  }

  function handleDelete(id: string) {
    const original = todos.find((t) => t.id === id)
    setTodos((prev) => prev.filter((t) => t.id !== id))

    startTransition(async () => {
      try {
        const result = await deleteReminder(id)
        if (!result.success && original) {
          setTodos((prev) => sortTodos([...prev, original]))
        }
      } catch {
        if (original) setTodos((prev) => sortTodos([...prev, original]))
        toast.error('Failed to delete')
      }
    })
  }

  function handleSnooze(id: string, optionKey: string) {
    const original = todos.find((t) => t.id === id)
    if (!original) return

    const option = SNOOZE_OPTIONS.find((o) => o.value === optionKey)
    if (!option) return

    // Optimistic
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, snoozed_until: option.getUntil().toISOString() } : t))
    )

    startTransition(async () => {
      try {
        const result = await snoozeReminder(id, optionKey)
        if (!result.success) {
          setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
          toast.error(result.error || 'Failed to snooze')
        } else {
          toast.success(`Snoozed for ${option.label.toLowerCase()}`)
        }
      } catch {
        setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
        toast.error('Failed to snooze')
      }
    })
  }

  function handleUnsnooze(id: string) {
    const original = todos.find((t) => t.id === id)
    if (!original) return

    // Optimistic
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, snoozed_until: null } : t)))

    startTransition(async () => {
      try {
        const result = await unsnoozeReminder(id)
        if (!result.success) {
          setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
          toast.error(result.error || 'Failed to unsnooze')
        }
      } catch {
        setTodos((prev) => prev.map((t) => (t.id === id ? original : t)))
        toast.error('Failed to unsnooze')
      }
    })
  }

  function handleQuickAdd(parsed: ParsedReminder) {
    if (!parsed.text.trim()) return
    const input: CreateReminderInput = {
      text: parsed.text,
      due_date: parsed.due_date || null,
      due_time: parsed.due_time || null,
      category: parsed.category || 'general',
      recurring_rule: parsed.recurring_rule || null,
    }
    handleCreate(input)
  }

  // ── View tabs ──
  const tabs: { key: FilterView; label: string; count?: number; warn?: boolean }[] = [
    { key: 'all', label: 'All', count: activeCount },
    { key: 'today', label: 'Today', count: todayCount + overdueCount, warn: overdueCount > 0 },
    { key: 'upcoming', label: 'This Week', count: upcomingCount },
    { key: 'overdue', label: 'Overdue', count: overdueCount, warn: overdueCount > 0 },
    { key: 'snoozed', label: 'Snoozed', count: snoozedCount },
    { key: 'completed', label: 'Done', count: completedCount },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100">Reminders</h1>
          <p className="text-sm text-stone-400 mt-1">
            Personal reminders, due dates, and follow-ups
          </p>
        </div>
      </div>

      {/* Quick add bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <QuickAddBar onSubmit={handleQuickAdd} disabled={isPending} />
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-stone-800 pb-px overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`px-3 py-2 text-sm rounded-t-md transition-colors whitespace-nowrap ${
              view === tab.key
                ? 'bg-stone-800 text-stone-100 border-b-2 border-brand-500'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1.5 text-xs tabular-nums ${
                  tab.warn ? 'text-red-400 font-medium' : 'text-stone-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {editingTodo ? 'Edit Reminder' : 'New Reminder'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReminderForm
            editingTodo={editingTodo}
            onSave={editingTodo ? handleUpdate : handleCreate}
            onCancel={() => setEditingTodo(null)}
            disabled={isPending}
          />
        </CardContent>
      </Card>

      {/* Reminder list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-stone-400 text-center">
                {view === 'overdue'
                  ? 'No overdue reminders. Nice work!'
                  : view === 'completed'
                    ? 'No completed reminders yet.'
                    : view === 'today'
                      ? 'Nothing due today.'
                      : view === 'snoozed'
                        ? 'No snoozed reminders.'
                        : view === 'upcoming'
                          ? 'Nothing due this week.'
                          : 'No reminders. Add one above.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((todo) => (
            <ReminderRow
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={setEditingTodo}
              onSnooze={handleSnooze}
              onUnsnooze={handleUnsnooze}
              disabled={isPending}
            />
          ))
        )}
      </div>
    </div>
  )
}
