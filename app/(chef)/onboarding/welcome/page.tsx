import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { OnboardingWelcomeClient } from './onboarding-welcome-client'

export const metadata = { title: 'Welcome' }

type PreferenceRow = {
  workspace_density?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function hasExplicitDensityChoice(preferences: PreferenceRow | null | undefined): boolean {
  if (!preferences?.workspace_density) return false
  if (preferences.workspace_density !== 'standard') return true

  return Boolean(
    preferences.created_at &&
    preferences.updated_at &&
    preferences.created_at !== preferences.updated_at
  )
}

export default async function OnboardingWelcomePage() {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_preferences')
    .select('workspace_density, created_at, updated_at')
    .eq('chef_id', user.entityId)
    .single()

  const alreadyChosen = hasExplicitDensityChoice(data as PreferenceRow | null)

  return <OnboardingWelcomeClient alreadyChosen={alreadyChosen} />
}
