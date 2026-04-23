export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export type NormalizedRecurringRule =
  | {
      frequency: 'daily' | 'weekly' | 'monthly'
      days_of_week?: number[]
      day_of_month?: number
      end_date?: string
    }
  | null
  | undefined

export type NormalizedCreateTaskInput = {
  title: string
  description?: string
  assigned_to?: string | null
  station_id?: string | null
  due_date: string
  due_time?: string | null
  priority?: TaskPriority
  notes?: string
  recurring_rule?: NormalizedRecurringRule
}

export type NormalizedUpdateTaskInput = {
  title?: string
  description?: string | null
  assigned_to?: string | null
  station_id?: string | null
  due_date?: string
  due_time?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  notes?: string | null
  recurring_rule?: NormalizedRecurringRule
}

function isFormData(input: unknown): input is FormData {
  return typeof FormData !== 'undefined' && input instanceof FormData
}

function getRawString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getRequiredString(formData: FormData, key: string): string {
  return getRawString(formData, key)
}

function getOptionalString(formData: FormData, key: string): string | undefined {
  if (!formData.has(key)) return undefined
  const value = getRawString(formData, key)
  return value || undefined
}

function getNullableString(formData: FormData, key: string): string | null | undefined {
  if (!formData.has(key)) return undefined
  const value = getRawString(formData, key)
  return value || null
}

function parseRecurringRule(value: FormDataEntryValue | null): NormalizedRecurringRule {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = JSON.parse(trimmed) as Record<string, unknown>
  const frequency = parsed.frequency

  if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly') {
    return null
  }

  const normalized: Exclude<NormalizedRecurringRule, null | undefined> = { frequency }

  if (Array.isArray(parsed.days_of_week)) {
    normalized.days_of_week = parsed.days_of_week
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  }

  if (typeof parsed.day_of_month === 'number') {
    normalized.day_of_month = parsed.day_of_month
  }

  if (typeof parsed.end_date === 'string' && parsed.end_date.trim()) {
    normalized.end_date = parsed.end_date.trim()
  }

  return normalized
}

export function normalizeCreateTaskInput(
  input: NormalizedCreateTaskInput | FormData
): NormalizedCreateTaskInput {
  if (!isFormData(input)) return input

  return {
    title: getRequiredString(input, 'title'),
    description: getOptionalString(input, 'description'),
    assigned_to: getNullableString(input, 'assigned_to'),
    station_id: getNullableString(input, 'station_id'),
    due_date: getRequiredString(input, 'due_date'),
    due_time: getNullableString(input, 'due_time'),
    priority: getOptionalString(input, 'priority') as TaskPriority | undefined,
    notes: getOptionalString(input, 'notes'),
    recurring_rule: input.has('recurring_rule')
      ? parseRecurringRule(input.get('recurring_rule'))
      : undefined,
  }
}

export function normalizeUpdateTaskInput(
  input: NormalizedUpdateTaskInput | FormData
): NormalizedUpdateTaskInput {
  if (!isFormData(input)) return input

  return {
    title: getOptionalString(input, 'title'),
    description: getNullableString(input, 'description'),
    assigned_to: getNullableString(input, 'assigned_to'),
    station_id: getNullableString(input, 'station_id'),
    due_date: getOptionalString(input, 'due_date'),
    due_time: getNullableString(input, 'due_time'),
    priority: getOptionalString(input, 'priority') as TaskPriority | undefined,
    status: getOptionalString(input, 'status') as TaskStatus | undefined,
    notes: getNullableString(input, 'notes'),
    recurring_rule: input.has('recurring_rule')
      ? parseRecurringRule(input.get('recurring_rule'))
      : undefined,
  }
}
