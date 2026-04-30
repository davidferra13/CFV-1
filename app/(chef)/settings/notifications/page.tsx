// Notification Settings Page
// Per-category channel overrides (email, push, SMS), SMS phone setup, and tier customization.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getNotificationPreferences,
  getNotificationExperienceSettings,
  getSmsSettings,
} from '@/lib/notifications/settings-actions'
import { getNotificationTierMap } from '@/lib/notifications/tier-actions'
import { createSignalDashboardSnapshot } from '@/lib/notifications/signal-dashboard'
import { NotificationSettings } from '@/components/notifications/notification-settings'
import { NotificationTierSettings } from '@/components/settings/notification-tier-settings'
import { SignalMatrixReview } from '@/components/settings/signal-matrix-review'

export const metadata: Metadata = { title: 'Notification Settings' }

export default async function NotificationSettingsPage() {
  await requireChef()

  const [preferences, smsSettings, experienceSettings, tierMap] = await Promise.all([
    getNotificationPreferences(),
    getSmsSettings(),
    getNotificationExperienceSettings(),
    getNotificationTierMap(),
  ])
  const signalDashboardSnapshot = createSignalDashboardSnapshot()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <NotificationSettings
        initialPreferences={preferences}
        initialSmsSettings={smsSettings}
        initialExperienceSettings={experienceSettings}
      />
      <SignalMatrixReview snapshot={signalDashboardSnapshot} />
      <NotificationTierSettings initialTierMap={tierMap} />
    </div>
  )
}
