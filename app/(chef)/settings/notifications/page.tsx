// Notification Settings Page
// Per-category channel overrides (email, push, SMS) and SMS phone setup.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getNotificationPreferences,
  getNotificationExperienceSettings,
  getSmsSettings,
} from '@/lib/notifications/settings-actions'
import { NotificationSettings } from '@/components/notifications/notification-settings'

export const metadata: Metadata = { title: 'Notification Settings - ChefFlow' }

export default async function NotificationSettingsPage() {
  await requireChef()

  const [preferences, smsSettings, experienceSettings] = await Promise.all([
    getNotificationPreferences(),
    getSmsSettings(),
    getNotificationExperienceSettings(),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <NotificationSettings
        initialPreferences={preferences}
        initialSmsSettings={smsSettings}
        initialExperienceSettings={experienceSettings}
      />
    </div>
  )
}
