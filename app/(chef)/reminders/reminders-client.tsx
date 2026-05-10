'use client'

import { useState, useTransition, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Bell,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Tag,
  AlertTriangle,
  Repeat,
  Timer,
  Link2,
} from '@/components/ui/icons'
import {
  createReminder,
  toggleReminder,
  deleteReminder,
  updateReminder,
  snoozeReminder,
  unsnoozeReminder,
} from '@/lib/reminders/actions'
import type {
  ChefReminder,
  CreateReminderInput,
  RecurringRule,
  ReminderPriority,
  ReminderCategory,
} from '@/lib/reminders/types'
import { SNOOZE_OPTIONS } from '@/lib/reminders/types'
import { parseNaturalLanguageReminder } from '@/lib/reminders/natural-language'
import type { ParsedReminder } from '@/lib/reminders/natural-language'

// ── CONSTANTS ──────────────────────────────────────────

const PRIORITY_CONFIG: Record<ReminderPriority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-400', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-400', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-500' },
  low: { label: 'Low', color: 'text-stone-400', dot: 'bg-stone-500' },
}

const CATEGORY_CONFIG: Record<ReminderCategory, { label: string; emoji: string }> = {
  general: { label: 'General', emoji: '📋' },
  prep: { label: 'Prep', emoji: '🔪' },
  shopping: { label: 'Shopping', emoji: '🛒' },
  client: { label: 'Client', emoji: '👤' },
  admin: { label: 'Admin', emoji: '📁' },
  follow_up: { label: 'Follow Up', emoji: '📞' },
  personal: { label: 'Personal', emoji: '🏠' },
}

type FilterView = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'snoozed'

// ── HELPERS ────────────────────────────────────────────

function isOverdue(todo: ChefReminder): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return todo.due_date < today
}

function isSnoozed(todo: ChefReminder): boolean {
  if (!todo.snoozed_until || todo.completed) return false
  return new Date(todo.snoozed_until) > new Date()
}

function isDueToday(todo: ChefReminder): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return todo.due_date === today
}

function isDueThisWeek(todo: ChefReminder): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date()
  const weekOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  return (
    todo.due_date > today.toISOString().split('T')[0] &&
    todo.due_date <= weekOut.toISOString().split('T')[0]
  )
}

function formatDueDate(dateStr: string, timeStr?: string | null): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  let label = ''
  if (dateStr === today) label = 'Today'
  else if (dateStr === tomorrow) label = 'Tomorrow'
  else {
    const d = new Date(dateStr + 'T00:00:00')
    label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (timeStr) {
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    label += ` at ${h12}:${m} ${ampm}`
  }

  return label
}

function formatSnoozeUntil(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return 'less than 1 hour'
  if (diffHours < 24) return `${diffHours}h`

  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

function formatRecurringRule(rule: RecurringRule): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (rule.frequency === 'daily') return 'Daily'

  if (rule.frequency === 'weekly' && rule.days_of_week?.length) {
    const days = rule.days_of_week.map((d) => dayNames[d]).join(', ')
    return `Weekly (${days})`
  }

  if (rule.frequency === 'monthly' && rule.day_of_month) {
    const suffix =
      rule.day_of_month === 1 || rule.day_of_month === 21 || rule.day_of_month === 31
        ? 'st'
        : rule.day_of_month === 2 || rule.day_of_month === 22
          ? 'nd'
          : rule.day_of_month === 3 || rule.day_of_month === 23
            ? 'rd'
            : 'th'
    return `Monthly (${rule.day_of_month}${suffix})`
  }

  return rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1)
}

function sortTodos(todos: ChefReminder[]): ChefReminder[] {
  const priorityOrder: Record<ReminderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  return [...todos].sort((a, b) => {
    // Completed last
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    // Snoozed after active, before completed
    const aSnoozed = isSnoozed(a)
    const bSnoozed = isSnoozed(b)
    if (aSnoozed !== bSnoozed) return aSnoozed ? 1 : -1
    // Overdue first
    const aOverdue = isOverdue(a)
    const bOverdue = isOverdue(b)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    // Due today next
    const aToday = isDueToday(a)
    const bToday = isDueToday(b)
    if (aToday !== bToday) return aToday ? -1 : 1
    // Priority
    if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority]
    // Due date (earlier first, null last)
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return a.sort_order - b.sort_order
  })
}

// ── SNOOZE DROPDOWN ─────────────────────────────────────

function SnoozeDropdown({
  reminderId,
  onSnooze,
  disabled,
}: {
  reminderId: string
  onSnooze: (id: string, option: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="p-1 text-stone-400 hover:text-blue-400 transition-colors disabled:cursor-not-allowed"
        title="Snooze"
      >
        <Timer className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-stone-900 border border-stone-700 rounded-md shadow-lg py-1 min-w-[140px]">
          {SNOOZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSnooze(reminderId, opt.value)
                setOpen(false)
              }}
              className="block w-full text-left px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800 hover:text-stone-100 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── REMINDER ROW ───────────────────────────────────────

function ReminderRow({
  todo,
  onToggle,
  onDelete,
  onEdit,
  onSnooze,
  onUnsnooze,
  disabled,
}: {
  todo: ChefReminder
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (todo: ChefReminder) => void
  onSnooze: (id: string, option: string) => void
  onUnsnooze: (id: string) => void
  disabled: boolean
}) {
  const overdue = isOverdue(todo)
  const snoozed = isSnoozed(todo)
  const dueToday = isDueToday(todo)
  const prio = PRIORITY_CONFIG[todo.priority]
  const cat = CATEGORY_CONFIG[todo.category]

  return (
    <div
      className={`group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors border ${
        todo.completed
          ? 'opacity-50 border-stone-800'
          : snoozed
            ? 'border-blue-900/40 bg-blue-950/10 opacity-70'
            : overdue
              ? 'border-red-900/50 bg-red-950/20'
              : dueToday
                ? 'border-yellow-900/30 bg-yellow-950/10'
                : 'border-stone-800 hover:bg-stone-800/50'
      }`}
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        disabled={disabled}
        className="mt-0.5 flex-shrink-0 text-stone-400 hover:text-brand-600 transition-colors disabled:cursor-not-allowed"
      >
        {todo.completed ? (
          <CheckCircle2 className="h-5 w-5 text-brand-500" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          {/* Priority dot */}
          <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${prio.dot}`} />
          <span
            className={`text-sm leading-relaxed break-words ${
              todo.completed ? 'line-through text-stone-400' : 'text-stone-200'
            }`}
          >
            {todo.text}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {todo.due_date && (
            <span
              className={`flex items-center gap-1 text-xs ${
                overdue
                  ? 'text-red-400 font-medium'
                  : dueToday
                    ? 'text-yellow-400'
                    : 'text-stone-400'
              }`}
            >
              {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {overdue ? 'Overdue: ' : ''}
              {formatDueDate(todo.due_date, todo.due_time)}
            </span>
          )}
          {todo.reminder_at && !todo.reminder_sent && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <Bell className="h-3 w-3" />
              Reminder set
            </span>
          )}
          {todo.category !== 'general' && (
            <span className="text-xs text-stone-500">
              {cat.emoji} {cat.label}
            </span>
          )}
          {/* Recurring badge */}
          {todo.recurring_rule && (
            <span className="flex items-center gap-1 text-xs text-purple-400">
              <Repeat className="h-3 w-3" />
              {formatRecurringRule(todo.recurring_rule)}
            </span>
          )}
          {/* Snoozed badge */}
          {snoozed && todo.snoozed_until && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <Timer className="h-3 w-3" />
              Snoozed until {formatSnoozeUntil(todo.snoozed_until)}
              <button
                type="button"
                onClick={() => onUnsnooze(todo.id)}
                disabled={disabled}
                className="ml-1 text-blue-400 hover:text-blue-300 underline"
              >
                wake
              </button>
            </span>
          )}
          {/* Event link */}
          {todo.event_id && (
            <a
              href={`/events/${todo.event_id}`}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Link2 className="h-3 w-3" />
              Linked event
            </a>
          )}
          {/* Client link */}
          {todo.client_id && (
            <a
              href={`/clients/${todo.client_id}`}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-300 transition-colors"
            >
              👤 Client
            </a>
          )}
          {todo.notes && (
            <span className="text-xs text-stone-500 truncate max-w-[200px]">{todo.notes}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
        {!todo.completed && !snoozed && (
          <SnoozeDropdown reminderId={todo.id} onSnooze={onSnooze} disabled={disabled} />
        )}
        <button
          type="button"
          onClick={() => onEdit(todo)}
          disabled={disabled}
          title="Edit"
          className="p-1 text-stone-400 hover:text-stone-200 transition-colors disabled:cursor-not-allowed"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          disabled={disabled}
          title="Delete"
          className="p-1 text-stone-400 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── QUICK ADD (NATURAL LANGUAGE) ────────────────────────

function QuickAddBar({
  onSubmit,
  disabled,
}: {
  onSubmit: (parsed: ParsedReminder) => void
  disabled: boolean
}) {
  const [quickText, setQuickText] = useState('')
  const [parsed, setParsed] = useState<ParsedReminder | null>(null)

  function handleChange(value: string) {
    setQuickText(value)
    if (value.trim().length > 2) {
      setParsed(parseNaturalLanguageReminder(value))
    } else {
      setParsed(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quickText.trim() || !parsed) return
    onSubmit(parsed)
    setQuickText('')
    setParsed(null)
  }

  const hasMeta =
    parsed && (parsed.due_date || parsed.due_time || parsed.recurring_rule || parsed.category)

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={quickText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder='Quick add: "call Sarah Thursday at 3pm" or "every Monday review prep"'
            disabled={disabled}
            className="w-full text-sm bg-stone-900 border border-stone-700 rounded-md px-3 py-2 outline-none focus:border-brand-500 placeholder:text-stone-600 text-stone-200 disabled:cursor-not-allowed"
          />
        </div>
        <Button type="submit" size="sm" disabled={disabled || !quickText.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {/* Preview of parsed result */}
      {parsed && hasMeta && (
        <div className="flex items-center gap-3 px-1 flex-wrap">
          {parsed.due_date && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Calendar className="h-3 w-3" />
              {parsed.due_date}
            </span>
          )}
          {parsed.due_time && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Clock className="h-3 w-3" />
              {parsed.due_time}
            </span>
          )}
          {parsed.recurring_rule && (
            <span className="flex items-center gap-1 text-xs text-purple-400">
              <Repeat className="h-3 w-3" />
              {formatRecurringRule(parsed.recurring_rule)}
            </span>
          )}
          {parsed.category && (
            <span className="text-xs text-stone-400">
              {CATEGORY_CONFIG[parsed.category].emoji} {CATEGORY_CONFIG[parsed.category].label}
            </span>
          )}
          {parsed.text && (
            <span className="text-xs text-stone-500 italic truncate max-w-[300px]">
              &quot;{parsed.text}&quot;
            </span>
          )}
        </div>
      )}
    </form>
  )
}

// ── CREATE / EDIT FORM ─────────────────────────────────

function ReminderForm({
  editingTodo,
  onSave,
  onCancel,
  disabled,
}: {
  editingTodo: ChefReminder | null
  onSave: (input: CreateReminderInput) => Promise<void>
  onCancel: () => void
  disabled: boolean
}) {
  const [text, setText] = useState(editingTodo?.text ?? '')
  const [dueDate, setDueDate] = useState(editingTodo?.due_date ?? '')
  const [dueTime, setDueTime] = useState(editingTodo?.due_time?.slice(0, 5) ?? '')
  const [priority, setPriority] = useState<ReminderPriority>(editingTodo?.priority ?? 'medium')
  const [category, setCategory] = useState<ReminderCategory>(editingTodo?.category ?? 'general')
  const [reminderAt, setReminderAt] = useState(
    editingTodo?.reminder_at ? editingTodo.reminder_at.slice(0, 16) : ''
  )
  const [notes, setNotes] = useState(editingTodo?.notes ?? '')
  const [recurringFreq, setRecurringFreq] = useState<string>(
    editingTodo?.recurring_rule?.frequency ?? 'none'
  )
  const [showAdvanced, setShowAdvanced] = useState(
    !!(
      editingTodo?.notes ||
      editingTodo?.reminder_at ||
      editingTodo?.category !== 'general' ||
      editingTodo?.recurring_rule
    )
  )
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function buildRecurringRule(): RecurringRule | null {
    if (recurringFreq === 'none') return null
    const rule: RecurringRule = { frequency: recurringFreq as RecurringRule['frequency'] }
    if (recurringFreq === 'weekly') {
      // Default to current day of week
      rule.days_of_week = [new Date().getDay()]
    }
    if (recurringFreq === 'monthly') {
      rule.day_of_month = new Date().getDate()
    }
    return rule
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        await onSave({
          text: trimmed,
          due_date: dueDate || null,
          due_time: dueTime || null,
          priority,
          category,
          reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
          notes: notes.trim() || null,
          recurring_rule: buildRecurringRule(),
        })
        if (!editingTodo) {
          setText('')
          setDueDate('')
          setDueTime('')
          setPriority('medium')
          setCategory('general')
          setReminderAt('')
          setNotes('')
          setRecurringFreq('none')
          inputRef.current?.focus()
        }
      } catch {
        toast.error('Failed to save reminder')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Main input row */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={editingTodo ? 'Edit reminder...' : 'Add a reminder...'}
          maxLength={500}
          disabled={disabled || pending}
          className="flex-1 text-sm bg-stone-900 border border-stone-700 rounded-md px-3 py-2 outline-none focus:border-brand-500 placeholder:text-stone-500 text-stone-200 disabled:cursor-not-allowed"
        />
      </div>

      {/* Quick fields row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-stone-400" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={disabled || pending}
            title="Due date"
            className="text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-300 outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-stone-400" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={disabled || pending}
            title="Due time"
            className="text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-300 outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as ReminderPriority)}
          disabled={disabled || pending}
          title="Priority"
          className="text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-300 outline-none focus:border-brand-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          More
        </button>
      </div>

      {/* Advanced fields */}
      {showAdvanced && (
        <div className="space-y-2 pl-1">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReminderCategory)}
              disabled={disabled || pending}
              title="Category"
              className="text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-300 outline-none focus:border-brand-500"
            >
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.emoji} {cfg.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Repeat className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={recurringFreq}
              onChange={(e) => setRecurringFreq(e.target.value)}
              disabled={disabled || pending}
              title="Repeat frequency"
              className="text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-300 outline-none focus:border-brand-500"
            >
              <option value="none">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-stone-400" />
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              disabled={disabled || pending}
              placeholder="Remind me at..."
              className="text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-300 outline-none focus:border-brand-500"
            />
            <span className="text-xs text-stone-500">Notification reminder</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            maxLength={2000}
            rows={2}
            disabled={disabled || pending}
            className="w-full text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-stone-300 outline-none focus:border-brand-500 resize-none placeholder:text-stone-500"
          />
        </div>
      )}

      {/* Submit row */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={disabled || pending || !text.trim()} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {editingTodo ? 'Save' : 'Add Reminder'}
        </Button>
        {editingTodo && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────

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
