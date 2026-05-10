// Reminder types for the ChefFlow reminders system
// Pure types, no server directives

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ReminderCategory =
  | 'general'
  | 'prep'
  | 'shopping'
  | 'client'
  | 'admin'
  | 'follow_up'
  | 'personal'

export type SnoozeOption = {
  label: string
  value: string
  getUntil: () => Date
}

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  {
    label: '1 hour',
    value: '1h',
    getUntil: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    label: '4 hours',
    value: '4h',
    getUntil: () => new Date(Date.now() + 4 * 60 * 60 * 1000),
  },
  {
    label: 'Tomorrow',
    value: 'tomorrow',
    getUntil: () => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
  {
    label: 'Next week',
    value: 'next_week',
    getUntil: () => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
]

export type RecurringRule = {
  frequency: 'daily' | 'weekly' | 'monthly'
  days_of_week?: number[] // 0=Sun, 6=Sat
  day_of_month?: number
  end_date?: string
}

export type LocationTrigger = {
  label: string
  lat: number
  lng: number
  radius_m: number
}

export interface ChefReminder {
  id: string
  chef_id: string
  text: string
  completed: boolean
  completed_at: string | null
  sort_order: number
  due_date: string | null
  due_time: string | null
  priority: ReminderPriority
  category: ReminderCategory
  reminder_at: string | null
  reminder_sent: boolean
  notes: string | null
  event_id: string | null
  client_id: string | null
  snoozed_until: string | null
  recurring_rule: RecurringRule | null
  location_trigger: LocationTrigger | null
  created_at: string
}

export type CreateReminderInput = {
  text: string
  due_date?: string | null
  due_time?: string | null
  priority?: ReminderPriority
  category?: ReminderCategory
  reminder_at?: string | null
  notes?: string | null
  event_id?: string | null
  client_id?: string | null
  recurring_rule?: RecurringRule | null
  location_trigger?: LocationTrigger | null
}

export type UpdateReminderInput = {
  text?: string
  due_date?: string | null
  due_time?: string | null
  priority?: ReminderPriority
  category?: ReminderCategory
  reminder_at?: string | null
  notes?: string | null
  event_id?: string | null
  client_id?: string | null
  recurring_rule?: RecurringRule | null
  location_trigger?: LocationTrigger | null
  snoozed_until?: string | null
}
