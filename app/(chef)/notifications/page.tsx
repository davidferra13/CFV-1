// Notifications Page - Full notification history for the chef
// Server component with metadata. Renders either the triage inbox (default)
// or the classic notification list, toggled via ?view= query param.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { NotificationListClient } from './notification-list-client'
import { TriageInbox } from './triage-inbox'

export const metadata: Metadata = {
  title: 'Notifications',
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  // Auth gate - requireChef ensures only authenticated chefs can access
  await requireChef()
  const params = await searchParams
  const view = params.view ?? 'triage'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100">Notifications</h1>
          <p className="text-sm text-stone-400 mt-1">All your alerts and updates in one place.</p>
        </div>
        <div className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-lg p-0.5">
          <a
            href="/notifications?view=triage"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'triage' ? 'bg-brand-600 text-white' : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            Triage
          </a>
          <a
            href="/notifications?view=list"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'list' ? 'bg-brand-600 text-white' : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            All
          </a>
        </div>
      </div>

      {view === 'triage' ? <TriageInbox /> : <NotificationListClient />}
    </div>
  )
}
