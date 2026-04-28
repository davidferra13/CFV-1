import type { NotificationCategory } from './types'

export type CategoryPreference = {
  category: NotificationCategory
  email_enabled: boolean | null
  push_enabled: boolean | null
  sms_enabled: boolean | null
}

export type SmsSettings = {
  sms_opt_in: boolean
  sms_notify_phone: string | null
}

export type NotificationExperienceSettings = {
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  digest_enabled: boolean
  digest_interval_minutes: number
}
