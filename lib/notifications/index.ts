// Notifications module - public API

// Send convenience wrapper (non-blocking dispatch)
export { sendNotification } from './send'
export type { SendNotificationInput } from './send'

// Types
export type { Notification, NotificationCategory, NotificationAction } from './types'
