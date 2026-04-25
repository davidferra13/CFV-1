'use client'

import type { PrivateThread } from '@/lib/hub/types'

interface PrivateThreadListProps {
  threads: PrivateThread[]
  currentProfileId: string
  onSelectThread: (thread: PrivateThread) => void
  selectedThreadId?: string | null
}

function relativeTime(value: string | null) {
  if (!value) return 'No messages'

  const diffSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.345, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ]

  let duration = diffSeconds
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }

  return new Date(value).toLocaleDateString()
}

export function PrivateThreadList({
  threads,
  currentProfileId,
  onSelectThread,
  selectedThreadId,
}: PrivateThreadListProps) {
  const sortedThreads = [...threads].sort((a, b) => {
    const aUnread =
      a.chef_profile_id === currentProfileId ? a.chef_unread_count : a.member_unread_count
    const bUnread =
      b.chef_profile_id === currentProfileId ? b.chef_unread_count : b.member_unread_count

    if (aUnread > 0 && bUnread === 0) return -1
    if (bUnread > 0 && aUnread === 0) return 1

    return (
      new Date(b.last_message_at ?? b.updated_at).getTime() -
      new Date(a.last_message_at ?? a.updated_at).getTime()
    )
  })

  if (sortedThreads.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-8 text-center">
        <p className="text-sm text-stone-400">
          No private conversations yet. Members can reach you from their circle view.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sortedThreads.map((thread) => {
        const otherParticipant =
          thread.chef_profile_id === currentProfileId ? thread.member_profile : thread.chef_profile
        const displayName = otherParticipant?.display_name ?? 'Unknown member'
        const unreadCount =
          thread.chef_profile_id === currentProfileId
            ? thread.chef_unread_count
            : thread.member_unread_count
        const avatarUrl = otherParticipant?.avatar_url

        return (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelectThread(thread)}
            className={`flex w-full items-center gap-3 rounded-lg border bg-stone-900 p-3 text-left transition-colors hover:bg-stone-800 ${
              selectedThreadId === thread.id ? 'border-amber-600' : 'border-stone-700'
            }`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700 text-sm font-semibold text-stone-200">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-stone-100">{displayName}</p>
                <span className="shrink-0 text-xs text-stone-500">
                  {relativeTime(thread.last_message_at)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-stone-400">
                {thread.last_message_preview ?? 'No messages yet'}
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
