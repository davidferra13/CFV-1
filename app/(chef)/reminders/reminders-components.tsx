'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
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

const PRIORITY_CONFIG: Record<ReminderPriority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-400', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-400', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-500' },
  low: { label: 'Low', color: 'text-stone-400', dot: 'bg-stone-500' },
}

const CATEGORY_CONFIG: Record<ReminderCategory, { label: string; emoji: string }> = {
  general: { label: 'General', emoji: 'ðŸ“‹' },
  prep: { label: 'Prep', emoji: 'ðŸ”ª' },
  shopping: { label: 'Shopping', emoji: 'ðŸ›’' },
  client: { label: 'Client', emoji: 'ðŸ‘¤' },
  admin: { label: 'Admin', emoji: 'ðŸ“' },
  follow_up: { label: 'Follow Up', emoji: 'ðŸ“ž' },
  personal: { label: 'Personal', emoji: 'ðŸ ' },
}

export type FilterView = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'snoozed'

// ── HELPERS ────────────────────────────────────────────

export function isOverdue(todo: ChefReminder): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return todo.due_date < today
}

export function isSnoozed(todo: ChefReminder): boolean {
  if (!todo.snoozed_until || todo.completed) return false
  return new Date(todo.snoozed_until) > new Date()
}

export function isDueToday(todo: ChefReminder): boolean {
  if (!todo.due_date || todo.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return todo.due_date === today
}

export function isDueThisWeek(todo: ChefReminder): boolean {
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

export function sortTodos(todos: ChefReminder[]): ChefReminder[] {
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

export function ReminderRow({
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

export function QuickAddBar({
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

export function ReminderForm({
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
