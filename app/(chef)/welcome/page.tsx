import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { IntentPicker } from './intent-picker'

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

export default async function WelcomePage() {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_preferences')
    .select('workspace_density, created_at, updated_at')
    .eq('chef_id', user.entityId)
    .single()

  if (hasExplicitDensityChoice(data as PreferenceRow | null)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display text-stone-100 tracking-tight">
            How do you run your business?
          </h1>
          <p className="text-stone-400 mt-3 text-lg">
            This sets up your workspace. You can always change it later in Settings.
          </p>
        </div>
        <IntentPicker />
      </div>
    </div>
  )
}
