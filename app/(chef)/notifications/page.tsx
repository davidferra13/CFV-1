// Notifications Page — Full notification history for the chef
// Server component with metadata. Renders the client-side notification list
// which handles filtering, pagination, and mark-as-read interactions.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { NotificationListClient } from './notification-list-client'

export const metadata: Metadata = {
  title: 'Notifications - ChefFlow',
}

export default async function NotificationsPage() {
  // Auth gate — requireChef ensures only authenticated chefs can access
  await requireChef()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-100">Notifications</h1>
        <p className="text-sm text-stone-400 mt-1">All your alerts and updates in one place.</p>
      </div>

      <NotificationListClient />
    </div>
  )
}
