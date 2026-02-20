import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefPreferences } from '@/lib/chef/actions'
import { PrimaryNavForm } from '@/components/settings/primary-nav-form'

export const metadata: Metadata = { title: 'Primary Navigation - ChefFlow' }

export default async function NavigationSettingsPage() {
  await requireChef()
  const preferences = await getChefPreferences()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Primary Navigation</h1>
          <p className="mt-1 text-stone-600">
            Customize your always-visible bar without changing the underlying feature set.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Back to Settings
        </Link>
      </div>

      <PrimaryNavForm initialPrimaryNavHrefs={preferences.primary_nav_hrefs ?? []} />
    </div>
  )
}
