export type NotificationSeverity = 'critical' | 'important' | 'informational' | 'silent'
export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app'
export type InterruptionLevel = 'always' | 'business_hours' | 'urgent_only' | 'never'

export interface NotificationPreference {
  id: string
  tenantId: string
  category: string
  severity: NotificationSeverity
  channels: NotificationChannel[]
  interruptionLevel: InterruptionLevel
  mutedUntil: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationCategory {
  key: string
  label: string
  description: string
  defaultSeverity: NotificationSeverity
  defaultChannels: NotificationChannel[]
  allowMute: boolean
}

export interface QuietHours {
  id: string
  tenantId: string
  enabled: boolean
  startTime: string
  endTime: string
  timezone: string
  allowCritical: boolean
}
