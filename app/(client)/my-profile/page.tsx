// Client Profile - Self-service profile editing

import { requireClient } from '@/lib/auth/get-user'
import {
  getMyProfile,
  getMyFunQA,
  getMyMealCollaborationData,
} from '@/lib/clients/client-profile-actions'
import { getClientSignalNotificationPref } from '@/lib/calendar/signal-settings-actions'
import { ClientProfileForm } from './client-profile-form'
import { FunQAForm } from '@/components/clients/fun-qa-form'
import { ClientSignalNotificationToggle } from '@/components/calendar/client-signal-notification-toggle'
import { FeedbackForm } from '@/components/feedback/feedback-form'
import type { Metadata } from 'next'
import { MealCollaborationPanel } from './meal-collaboration-panel'

export const metadata: Metadata = {
  title: 'My Profile',
}

export default async function MyProfilePage() {
  await requireClient()
  const [profile, funQAAnswers, signalNotifEnabled, mealCollab] = await Promise.all([
    getMyProfile() as Promise<Parameters<typeof ClientProfileForm>[0]['profile']>,
    getMyFunQA(),
    getClientSignalNotificationPref(),
    getMyMealCollaborationData(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Profile</h1>
        <p className="text-stone-400 mt-1">
          Keep your info up to date so your chef can deliver the best experience.
        </p>
      </div>

      <div data-tour="client-update-profile">
        <ClientProfileForm profile={profile} />
      </div>

      <MealCollaborationPanel
        history={mealCollab.history}
        requests={mealCollab.requests}
        recommendations={mealCollab.recommendations}
      />

      <FunQAForm initialAnswers={funQAAnswers} />

      {/* Notification Preferences */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-100">Notification Preferences</h2>
        <ClientSignalNotificationToggle initialEnabled={signalNotifEnabled} />
      </div>

      {/* Feedback */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Share Feedback</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Tell us what you love, what frustrates you, or anything in between. We read every
            submission.
          </p>
        </div>
        <FeedbackForm pageContext="/my-profile" />
      </div>
    </div>
  )
}
