// Client Hub Dashboard — Groups, friends, chef sharing

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientHubGroups, getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { getMyFriends, getPendingFriendRequests } from '@/lib/hub/friend-actions'
import { getHubTotalUnreadCount } from '@/lib/hub/notification-actions'
import { HubGroupCard } from '@/components/hub/hub-group-card'
import { Button } from '@/components/ui/button'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { Bell, CalendarPlus, Users, Utensils, Share2 } from 'lucide-react'

export const metadata: Metadata = { title: 'My Dinner Circle - ChefFlow' }

export default async function MyHubPage() {
  await requireClient()
  const profileToken = await getClientProfileToken()
  const [groups, friends, pendingRequests, totalUnread] = await Promise.all([
    getClientHubGroups(),
    getMyFriends().catch(() => []),
    getPendingFriendRequests().catch(() => []),
    getHubTotalUnreadCount(profileToken).catch(() => 0),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">My Dinner Circle</h1>
          <p className="mt-1 text-stone-400">
            Private planning space for your dinners, updates, and trusted invite-only circle.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/my-hub/notifications">
            <Button variant="secondary" className="relative">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {totalUnread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/my-hub/friends">
            <Button variant="secondary" className="relative">
              <Users className="mr-2 h-4 w-4" />
              Circle
              {pendingRequests.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                  {pendingRequests.length}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/my-hub/create">
            <Button variant="primary">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Plan a Dinner
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {(friends.length > 0 || groups.length > 0) && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{groups.length}</p>
            <p className="text-xs text-stone-400">Dinner Groups</p>
          </div>
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{friends.length}</p>
            <p className="text-xs text-stone-400">Circle Members</p>
          </div>
          <Link
            href="/my-hub/share-chef"
            className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 text-center hover:border-stone-600 transition-colors"
          >
            <Share2 className="mx-auto h-6 w-6 text-brand-400" />
            <p className="mt-1 text-xs text-stone-400">Share a Chef</p>
          </Link>
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-stone-200">Dinner Groups</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <HubGroupCard key={group.id} group={group} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-700 bg-stone-900/30 px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10">
            <Utensils className="h-8 w-8 text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-stone-200">No dinner groups yet</h2>
          <p className="mx-auto mt-2 max-w-md text-stone-400">
            Plan a dinner with friends — pick a date, invite your crew, and coordinate everything
            from menus to allergies in one shared space.
          </p>
          <Link href="/my-hub/create" className="mt-6">
            <Button variant="primary" className="px-6">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Plan Your First Dinner
            </Button>
          </Link>
        </div>
      )}

      {/* Friends Preview */}
      {friends.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-200">Circle Members</h2>
            <Link href="/my-hub/friends" className="text-sm text-brand-400 hover:text-brand-300">
              View all
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {friends.slice(0, 8).map((friend) => (
              <div
                key={friend.friendship_id}
                className="flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/60 py-1.5 pl-1.5 pr-3"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-400">
                  {friend.profile.avatar_url ? (
                    <Image
                      src={friend.profile.avatar_url}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    friend.profile.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-sm text-stone-300">{friend.profile.display_name}</span>
              </div>
            ))}
            {friends.length > 8 && (
              <Link
                href="/my-hub/friends"
                className="flex items-center rounded-full border border-stone-700 bg-stone-800/50 px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200"
              >
                +{friends.length - 8} more
              </Link>
            )}
          </div>
        </div>
      )}

      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

export const dynamic = 'force-dynamic'
