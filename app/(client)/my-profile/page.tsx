// Client Profile - Self-service profile editing

import { requireClient } from '@/lib/auth/get-user'
import { getMyProfile, getMyFunQA } from '@/lib/clients/client-profile-actions'
import { getClientSignalNotificationPref } from '@/lib/calendar/signal-settings-actions'
import { ClientProfileForm } from './client-profile-form'
import { FunQAForm } from '@/components/clients/fun-qa-form'
import { ClientSignalNotificationToggle } from '@/components/calendar/client-signal-notification-toggle'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile - ChefFlow',
}

export default async function MyProfilePage() {
  await requireClient()
  const [profile, funQAAnswers, signalNotifEnabled] = await Promise.all([
    getMyProfile() as Promise<Parameters<typeof ClientProfileForm>[0]['profile']>,
    getMyFunQA(),
    getClientSignalNotificationPref(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">My Profile</h1>
        <p className="text-stone-600 mt-1">
          Keep your info up to date so your chef can deliver the best experience.
        </p>
      </div>

      <ClientProfileForm profile={profile} />

      <FunQAForm initialAnswers={funQAAnswers} />

      {/* Notification Preferences */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">Notification Preferences</h2>
        <ClientSignalNotificationToggle initialEnabled={signalNotifEnabled} />
      </div>
    </div>
  )
}
