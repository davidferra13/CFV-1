import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getNotifications, markAllAsRead } from '@/lib/notifications/actions'
import { NotificationsClient } from './notifications-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Notifications' }

export default async function MyNotificationsPage() {
  await requireClient()
  const notifications = await getNotifications(100, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Notifications</h1>
          <p className="text-stone-400 mt-1">Updates about your events, payments, and messages.</p>
        </div>
      </div>
      <NotificationsClient notifications={notifications} markAllAction={markAllAsRead} />
      <ActivityTracker
        eventType="page_viewed"
        metadata={{ notification_count: notifications.length }}
      />
    </div>
  )
}
