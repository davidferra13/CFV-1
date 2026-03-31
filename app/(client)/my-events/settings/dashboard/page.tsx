import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientDashboardPreferences } from '@/lib/client-dashboard/actions'
import { ClientDashboardLayoutForm } from '@/components/settings/client-dashboard-layout-form'

export const metadata: Metadata = { title: 'My Dashboard Layout' }

export default async function ClientDashboardLayoutSettingsPage() {
  await requireClient()
  const preferences = await getClientDashboardPreferences()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Dashboard Widgets</h1>
          <p className="mt-1 text-stone-400">
            Choose which widgets are visible and reorder enabled widgets to match your workflow.
          </p>
        </div>
        <Link
          href="/my-events"
          className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
        >
          Back to My Events
        </Link>
      </div>

      <ClientDashboardLayoutForm initialWidgets={preferences.dashboard_widgets} />
    </div>
  )
}
