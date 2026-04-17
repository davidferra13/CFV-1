'use client'

import Link from 'next/link'
import type { PublicCircleResult } from '@/lib/hub/community-circle-actions'

interface CommunityCircleCardProps {
  circle: PublicCircleResult
}

export function CommunityCircleCard({ circle }: CommunityCircleCardProps) {
  const timeAgo = circle.last_message_at ? formatTimeAgo(circle.last_message_at) : 'New'

  return (
    <Link
      href={`/hub/g/${circle.group_token}`}
      className="group flex flex-col rounded-xl border border-stone-700/50 bg-stone-800/30 p-4 transition-colors hover:bg-stone-800/60 hover:border-stone-600"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-lg">
          {circle.emoji || '💬'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-stone-200 group-hover:text-stone-100">
            {circle.name}
          </h3>
          {circle.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-stone-400">{circle.description}</p>
          )}
        </div>
      </div>

      {/* Topics */}
      {circle.display_vibe && circle.display_vibe.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {circle.display_vibe.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400"
            >
              {tag}
            </span>
          ))}
          {circle.display_vibe.length > 4 && (
            <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-xs text-stone-500">
              +{circle.display_vibe.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
        <span>
          {circle.member_count} {circle.member_count === 1 ? 'member' : 'members'}
        </span>
        <span className="text-stone-700">|</span>
        <span>{circle.message_count} messages</span>
        <span className="ml-auto">{timeAgo}</span>
      </div>
    </Link>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
