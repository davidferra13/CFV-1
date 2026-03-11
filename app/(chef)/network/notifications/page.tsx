import type { Metadata } from 'next'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import {
  getSocialNotifications,
  markSocialNotificationsRead,
} from '@/lib/social/chef-social-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Bell } from '@/components/ui/icons'
import { MarkAllReadButton } from './mark-all-read-button'

export const metadata: Metadata = { title: 'Notifications — Chef Community' }

const NOTIF_LABELS: Record<string, string> = {
  new_follower: 'started following you',
  post_reaction: 'reacted to your post',
  post_comment: 'commented on your post',
  comment_reply: 'replied to your comment',
  comment_reaction: 'reacted to your comment',
  post_share: 'shared your post',
  mention_post: 'mentioned you in a post',
  mention_comment: 'mentioned you in a comment',
  channel_post: 'posted in a channel you follow',
  story_reaction: 'reacted to your story',
  story_view: 'viewed your story',
  connection_accepted: 'accepted your connection request',
  collab_handoff_received: 'sent you a collaboration handoff',
  collab_handoff_accepted: 'accepted your collaboration handoff',
  collab_handoff_rejected: 'passed on your collaboration handoff',
  collab_handoff_converted: 'converted your collaboration handoff',
  collab_handoff_cancelled: 'cancelled a collaboration handoff',
}

export default async function NotificationsPage() {
  await requireChef()
  const notifications = await getSocialNotifications({ limit: 60 })

  const unread = notifications.filter((n) => !n.is_read)

  return (
    <div className="space-y-6">
      <Link
        href="/network"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Community
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-600" />
          <h1 className="text-2xl font-bold text-stone-100">Notifications</h1>
          {unread.length > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-stone-900 rounded-2xl border border-stone-700 p-12 text-center">
          <Bell className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="bg-stone-900 rounded-2xl border border-stone-700 divide-y divide-stone-800 overflow-hidden">
          {notifications.map((notif) => {
            const actorName = notif.actor
              ? (notif.actor.display_name ?? notif.actor.business_name)
              : 'Someone'
            const label = NOTIF_LABELS[notif.notification_type] ?? notif.notification_type
            const actionHref =
              notif.entity_type === 'handoff'
                ? `/network?tab=collab&handoff=${encodeURIComponent(notif.entity_id)}&notif=${encodeURIComponent(notif.id)}`
                : null

            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-4 ${!notif.is_read ? 'bg-amber-950/50' : ''}`}
              >
                {notif.actor ? (
                  <Link href={`/network/${notif.actor.id}`}>
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {notif.actor.profile_image_url && (
                        <AvatarImage src={notif.actor.profile_image_url} alt={actorName} />
                      )}
                      <AvatarFallback className="bg-amber-900 text-amber-200 text-xs font-semibold">
                        {actorName
                          .split(' ')
                          .map((w: string) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4 text-stone-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-200">
                    {notif.actor ? (
                      <Link
                        href={`/network/${notif.actor.id}`}
                        className="font-semibold hover:underline"
                      >
                        {actorName}
                      </Link>
                    ) : (
                      <span className="font-semibold">{actorName}</span>
                    )}{' '}
                    {label}
                    {notif.agg_count > 1 && (
                      <span className="text-stone-500"> and {notif.agg_count - 1} others</span>
                    )}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>

                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
                )}
                {actionHref && (
                  <Link
                    href={actionHref}
                    className="text-xs text-amber-200 font-medium hover:underline mt-1"
                  >
                    Open
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
