import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefPreferences } from '@/lib/chef/actions'
import { DashboardLayoutForm } from '@/components/settings/dashboard-layout-form'

export const metadata: Metadata = { title: 'Dashboard Layout - ChefFlow' }

export default async function DashboardLayoutSettingsPage() {
  await requireChef()
  const preferences = await getChefPreferences()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Dashboard Widgets</h1>
          <p className="mt-1 text-stone-400">
            Choose which widgets are enabled. Reorder enabled widgets directly from the dashboard
            corner settings.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
        >
          Back to Settings
        </Link>
      </div>

      <DashboardLayoutForm initialWidgets={preferences.dashboard_widgets} />
    </div>
  )
}
