// Notification Settings Page
// Per-category channel overrides (email, push, SMS) and SMS phone setup.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getNotificationPreferences,
  getSmsSettings,
} from '@/lib/notifications/settings-actions'
import { NotificationSettingsForm } from '@/components/settings/notification-settings-form'

export const metadata: Metadata = { title: 'Notification Settings - ChefFlow' }

export default async function NotificationSettingsPage() {
  await requireChef()

  const [preferences, smsSettings] = await Promise.all([
    getNotificationPreferences(),
    getSmsSettings(),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Notification Settings</h1>
        <p className="text-stone-600 mt-1">
          Control how and where you receive alerts — email, browser push, and SMS.
        </p>
      </div>

      <NotificationSettingsForm
        initialPreferences={preferences}
        initialSmsSettings={smsSettings}
      />
    </div>
  )
}
