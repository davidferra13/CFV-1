import { NotificationSettingsForm } from '@/components/settings/notification-settings-form'
import type {
  CategoryPreference,
  NotificationExperienceSettings,
  SmsSettings,
} from '@/lib/notifications/settings-actions'

type NotificationSettingsProps = {
  initialPreferences: CategoryPreference[]
  initialSmsSettings: SmsSettings
  initialExperienceSettings: NotificationExperienceSettings
}

export function NotificationSettings({
  initialPreferences,
  initialSmsSettings,
  initialExperienceSettings,
}: NotificationSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Notification Settings</h1>
        <p className="text-stone-400 mt-1">
          Control email, push, and SMS preferences for your chef workspace.
        </p>
      </div>

      <NotificationSettingsForm
        initialPreferences={initialPreferences}
        initialSmsSettings={initialSmsSettings}
        initialExperienceSettings={initialExperienceSettings}
      />
    </div>
  )
}
