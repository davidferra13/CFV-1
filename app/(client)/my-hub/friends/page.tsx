// My Friends — add, manage, and discover friends

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { getMyFriends, getPendingFriendRequests } from '@/lib/hub/friend-actions'
import { FriendsList } from '@/components/hub/friends-list'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Dinner Circle - ChefFlow' }

export default async function MyFriendsPage() {
  await requireClient()

  const [friends, pendingRequests, profileToken] = await Promise.all([
    getMyFriends(),
    getPendingFriendRequests(),
    getClientProfileToken(),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/my-hub"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Hub
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-100">Dinner Circle</h1>
        <p className="mt-1 text-stone-400">
          Private, invite-only circle for people you already know and plan dinners with.
        </p>
      </div>

      <FriendsList
        initialFriends={friends}
        initialRequests={pendingRequests}
        inviteProfileToken={profileToken}
      />

      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

export const dynamic = 'force-dynamic'
