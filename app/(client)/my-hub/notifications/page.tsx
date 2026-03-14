import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireClient } from '@/lib/auth/get-user'
import { getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { getHubUnreadCounts } from '@/lib/hub/notification-actions'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { NotificationsPanel } from './notifications-panel'

export const metadata: Metadata = { title: 'Dinner Circle Notifications - ChefFlow' }

export default async function MyHubNotificationsPage() {
  await requireClient()
  const profileToken = await getClientProfileToken()
  const unread = await getHubUnreadCounts(profileToken).catch(() => [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/my-hub"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Hub
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-100">Dinner Circle Notifications</h1>
        <p className="mt-1 text-stone-400">Private unread updates from your own dinner groups.</p>
      </div>

      <NotificationsPanel initialUnread={unread} />

      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

export const dynamic = 'force-dynamic'
