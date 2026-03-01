'use client'

import Link from 'next/link'
import { Users, MessageCircle } from 'lucide-react'
import type { ClientHubGroup } from '@/lib/hub/client-hub-actions'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function HubGroupCard({ group }: { group: ClientHubGroup }) {
  return (
    <Link
      href={`/my-hub/g/${group.group_token}`}
      className="group relative block rounded-xl border border-stone-800 bg-stone-900/60 p-5 transition-all hover:border-stone-600 hover:bg-stone-900"
    >
      {/* Unread indicator */}
      {group.has_unread && (
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand-500" />
      )}

      {/* Header: emoji + name */}
      <div className="flex items-start gap-3">
        <span className="text-3xl">{group.emoji || '🍽️'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
            {group.name}
          </h3>
          {group.description && (
            <p className="mt-0.5 truncate text-sm text-stone-400">{group.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-4 text-sm text-stone-400">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          {group.message_count} {group.message_count === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {/* Last message preview */}
      {group.last_message_preview && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-stone-800/50 px-3 py-2">
          <p className="min-w-0 truncate text-sm text-stone-300">{group.last_message_preview}</p>
          <span className="shrink-0 text-xs text-stone-500">{timeAgo(group.last_message_at)}</span>
        </div>
      )}
    </Link>
  )
}
