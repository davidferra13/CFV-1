// Staff Notifications Page
// Lists virtual notifications derived from recent task assignments and schedule changes.
// Read/unread state is tracked client-side via localStorage.

import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyNotifications } from '@/lib/staff/staff-portal-actions'
import { StaffNotificationList } from '@/components/staff/staff-notification-list'

export const metadata: Metadata = { title: 'Notifications' }

export default async function StaffNotificationsPage() {
  await requireStaff()
  const notifications = await getMyNotifications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Notifications</h1>
        <p className="text-stone-400 mt-1">Recent activity from the last 7 days</p>
      </div>

      <StaffNotificationList notifications={notifications} />
    </div>
  )
}
