import type { CreateTaskInput, RecurringRule } from '@/lib/tasks/actions'

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>

const TASK_PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const

export type TaskCreateDraft = {
  title: string
  description: string
  assigned_to: string
  station_id: string
  due_date: string
  due_time: string
  priority: CreateTaskInput['priority']
  notes: string
  recurring_rule: string
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function hasSearchParam(input: SearchParamInput, key: string): boolean {
  if (input instanceof URLSearchParams) {
    return input.has(key)
  }
  return Object.prototype.hasOwnProperty.call(input, key)
}

function getSearchParamValue(input: SearchParamInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined
  }
  return firstValue(input[key])
}

function getFormDataValue(formData: FormData, key: string, fallback = ''): string {
  if (!formData.has(key)) return fallback
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : fallback
}

function coerceTaskPriority(value: string | undefined): TaskCreateDraft['priority'] {
  if (value && TASK_PRIORITY_VALUES.includes(value as TaskCreateDraft['priority'])) {
    return value as TaskCreateDraft['priority']
  }
  return 'medium'
}

function readDraftValue(
  input: SearchParamInput,
  key: keyof TaskCreateDraft,
  fallback = ''
): string {
  if (!hasSearchParam(input, key)) return fallback
  return (getSearchParamValue(input, key) ?? '').trim()
}

export function buildDefaultTaskCreateDraft(defaultDate: string): TaskCreateDraft {
  return {
    title: '',
    description: '',
    assigned_to: '',
    station_id: '',
    due_date: defaultDate,
    due_time: '',
    priority: 'medium',
    notes: '',
    recurring_rule: '',
  }
}

export function buildTaskCreateDraftFromFormData(
  formData: FormData,
  defaultDate: string
): TaskCreateDraft {
  return {
    title: getFormDataValue(formData, 'title'),
    description: getFormDataValue(formData, 'description'),
    assigned_to: getFormDataValue(formData, 'assigned_to'),
    station_id: getFormDataValue(formData, 'station_id'),
    due_date: getFormDataValue(formData, 'due_date', defaultDate),
    due_time: getFormDataValue(formData, 'due_time'),
    priority: coerceTaskPriority(getFormDataValue(formData, 'priority', 'medium')),
    notes: getFormDataValue(formData, 'notes'),
    recurring_rule: getFormDataValue(formData, 'recurring_rule'),
  }
}

export function readTaskCreateDraftFromSearchParams(
  input: SearchParamInput,
  defaultDate: string
): TaskCreateDraft {
  const fallback = buildDefaultTaskCreateDraft(defaultDate)

  return {
    title: readDraftValue(input, 'title'),
    description: readDraftValue(input, 'description'),
    assigned_to: readDraftValue(input, 'assigned_to'),
    station_id: readDraftValue(input, 'station_id'),
    due_date: readDraftValue(input, 'due_date', fallback.due_date),
    due_time: readDraftValue(input, 'due_time'),
    priority: coerceTaskPriority(
      hasSearchParam(input, 'priority') ? getSearchParamValue(input, 'priority')?.trim() : undefined
    ),
    notes: readDraftValue(input, 'notes'),
    recurring_rule: readDraftValue(input, 'recurring_rule'),
  }
}

export function readTaskCreateErrorFromSearchParams(input: SearchParamInput): string | null {
  if (!hasSearchParam(input, 'error')) return null
  const value = (getSearchParamValue(input, 'error') ?? '').trim()
  return value || null
}

function setDraftParam(params: URLSearchParams, key: keyof TaskCreateDraft, value: string) {
  params.set(key, value)
}

export function buildTaskCreateHref({
  date,
  draft,
  error,
}: {
  date: string
  draft?: TaskCreateDraft
  error?: string | null
}): string {
  const params = new URLSearchParams()
  params.set('date', date)
  params.set('new', '1')

  if (error?.trim()) {
    params.set('error', error.trim())
  }

  if (draft) {
    setDraftParam(params, 'title', draft.title)
    setDraftParam(params, 'description', draft.description)
    setDraftParam(params, 'assigned_to', draft.assigned_to)
    setDraftParam(params, 'station_id', draft.station_id)
    setDraftParam(params, 'due_date', draft.due_date)
    setDraftParam(params, 'due_time', draft.due_time)
    setDraftParam(params, 'priority', draft.priority)
    setDraftParam(params, 'notes', draft.notes)
    setDraftParam(params, 'recurring_rule', draft.recurring_rule)
  }

  return `/tasks?${params.toString()}`
}

export function parseTaskCreateRecurringRule(value: string): RecurringRule | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const frequency = parsed.frequency

    if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly') {
      return null
    }

    const rule: NonNullable<RecurringRule> = { frequency }

    if (Array.isArray(parsed.days_of_week)) {
      const days = parsed.days_of_week
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      if (days.length > 0) {
        rule.days_of_week = days
      }
    }

    if (typeof parsed.day_of_month === 'number' && Number.isInteger(parsed.day_of_month)) {
      rule.day_of_month = parsed.day_of_month
    }

    if (typeof parsed.end_date === 'string' && parsed.end_date.trim()) {
      rule.end_date = parsed.end_date.trim()
    }

    return rule
  } catch {
    return null
  }
}
