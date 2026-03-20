import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefPreferences } from '@/lib/chef/actions'
import { MenuEngineForm } from '@/components/settings/menu-engine-form'

export const metadata: Metadata = { title: 'Menu Engine - ChefFlow' }

export default async function MenuEngineSettingsPage() {
  await requireChef()
  const preferences = await getChefPreferences()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Menu Intelligence</h1>
          <p className="mt-1 text-stone-400">
            Enable or disable intelligence features shown alongside the menu editor. Disabled
            features won&apos;t load data or appear in the sidebar.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
        >
          Back to Settings
        </Link>
      </div>

      <MenuEngineForm initialFeatures={preferences.menu_engine_features} />
    </div>
  )
}
