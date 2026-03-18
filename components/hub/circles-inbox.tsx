'use client'

import { useState, useTransition, memo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { ChefCircleSummary } from '@/lib/hub/chef-circle-actions'
import { archiveCircle, createDinnerClub } from '@/lib/hub/chef-circle-actions'

interface CirclesInboxProps {
  circles: ChefCircleSummary[]
}

export function CirclesInbox({ circles }: CirclesInboxProps) {
  const [items, setItems] = useState(circles)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = filter === 'unread' ? items.filter((c) => c.unread_count > 0) : items
  const totalUnread = items.reduce((sum, c) => sum + c.unread_count, 0)

  const handleArchive = async (groupId: string) => {
    const prev = items
    setItems((items) => items.filter((c) => c.id !== groupId))
    try {
      await archiveCircle(groupId)
    } catch {
      setItems(prev)
      toast.error('Failed to archive circle')
    }
  }

  const emptyState = items.length === 0 && !showCreate

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Unread ({totalUnread})
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          + Dinner Club
        </button>
      </div>

      {showCreate && (
        <CreateDinnerClubForm
          onCreated={(token) => {
            setShowCreate(false)
            window.open(`/hub/g/${token}`, '_blank')
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {emptyState && (
        <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-12 text-center">
          <div className="mb-3 text-4xl">💬</div>
          <h3 className="text-lg font-semibold text-stone-200">No circles yet</h3>
          <p className="mt-1 text-sm text-stone-400">
            Your client circles live here. Each one is a private channel with your guests for
            coordinating menus, dietary alerts, quotes, and event updates. They're created
            automatically from inquiries and events.
          </p>
        </div>
      )}

      {/* Circle list */}
      <div className="space-y-2">
        {filtered.map((circle) => (
          <CircleRow key={circle.id} circle={circle} onArchive={handleArchive} />
        ))}

        {filtered.length === 0 && filter === 'unread' && (
          <div className="py-8 text-center text-sm text-stone-500">All caught up!</div>
        )}
      </div>
    </div>
  )
}

// Memoized: rendered in .map() for circle list. Receives stable circle data.
// Note: parent should wrap onArchive with useCallback.
const CircleRow = memo(function CircleRow({
  circle,
  onArchive,
}: {
  circle: ChefCircleSummary
  onArchive: (id: string) => void
}) {
  const timeAgo = circle.last_message_at ? formatTimeAgo(circle.last_message_at) : 'No messages'

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-stone-700/50 bg-stone-800/30 p-4 transition-colors hover:bg-stone-800/60">
      {/* Emoji avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-lg">
        {circle.emoji || '💬'}
      </div>

      {/* Content */}
      <Link
        href={`/hub/g/${circle.group_token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-stone-200">{circle.name}</span>
          {circle.group_type === 'dinner_club' && (
            <span className="flex-shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
              Club
            </span>
          )}
          {circle.unread_count > 0 && (
            <span className="flex-shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
              {circle.unread_count}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-stone-400">
          {circle.last_message_preview || 'No messages yet'}
        </p>
      </Link>

      {/* Meta */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-stone-500">{timeAgo}</span>
        <div className="flex items-center gap-1 text-xs text-stone-600">
          <span>{circle.member_count} members</span>
        </div>
      </div>

      {/* Archive button (hover) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onArchive(circle.id)
        }}
        className="flex-shrink-0 rounded p-1 text-stone-600 opacity-0 transition-opacity hover:text-stone-300 group-hover:opacity-100"
        title="Archive circle"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      </button>
    </div>
  )
})

function CreateDinnerClubForm({
  onCreated,
  onCancel,
}: {
  onCreated: (groupToken: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await createDinnerClub({
          name: name.trim(),
          description: description.trim() || undefined,
          emoji,
        })
        onCreated(result.groupToken)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create circle')
      }
    })
  }

  const emojiOptions = ['🍽️', '🥘', '🍷', '🎉', '🏠', '👨‍🍳', '🌮', '🍕', '🥂', '🎊', '☕', '🍰']

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-stone-200">New Dinner Club</h4>
      <div className="mb-3 flex gap-2">
        <div className="flex flex-wrap gap-1">
          {emojiOptions.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`rounded-lg p-1.5 text-lg ${emoji === e ? 'bg-stone-600 ring-1 ring-brand-500' : 'hover:bg-stone-700'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Circle name (e.g. Friday Night Dinners)"
        className="mb-2 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-brand-500"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="mb-3 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-brand-500"
      />
      {error && (
        <div className="mb-2 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-300">{error}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="flex-1 rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white disabled:opacity-30"
        >
          {isPending ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-stone-700 px-4 py-2 text-xs text-stone-300 hover:bg-stone-600"
        >
          Cancel
        </button>
      </div>
    </div>
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
