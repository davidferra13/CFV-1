// ---------------------------------------------------------------------------
// Circle Reminder Cascade Types
// ---------------------------------------------------------------------------

export type ReminderType =
  | 'rsvp_deadline'
  | 'dietary_collection'
  | 'event_countdown'
  | 'payment_reminder'
  | 'day_of_prep'

export type ReminderStatus = 'pending' | 'sent' | 'skipped' | 'failed'

export type ReminderChannel = 'email' | 'sms' | 'in_app'

export type ReminderConfig = {
  id: string
  circleId: string
  tenantId: string
  reminderType: ReminderType
  daysBefore: number
  enabled: boolean
  channel: ReminderChannel
  createdAt: string
  updatedAt: string
}

export type ReminderSchedule = {
  reminderType: ReminderType
  daysBefore: number
  enabled: boolean
  channel: ReminderChannel
}

export type ReminderRecord = {
  id: string
  configId: string
  circleId: string
  eventId: string
  tenantId: string
  status: ReminderStatus
  scheduledFor: string
  sentAt: string | null
  recipientCount: number
  errorMessage: string | null
  createdAt: string
}
