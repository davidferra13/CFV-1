import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyPreferences } from '@/lib/preferences/client-preference-actions'
import { canRevisitOnboarding } from '@/lib/onboarding/client-revisit-actions'
import { PreferencesClient } from './preferences-client'
import { OnboardingRevisitCard } from './onboarding-revisit-card'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Preferences' }

export default async function MyPreferencesPage() {
  await requireClient()
  const [preferences, canRevisit] = await Promise.all([
    getMyPreferences(),
    canRevisitOnboarding().catch(() => false),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Food Preferences</h1>
        <p className="text-stone-400 mt-1">
          Your chef will see these preferences when planning menus for your events.
        </p>
      </div>
      {canRevisit && <OnboardingRevisitCard />}
      <PreferencesClient initialPreferences={preferences} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
