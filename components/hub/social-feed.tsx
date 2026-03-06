'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { SocialFeedItem } from '@/lib/hub/social-feed-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'

interface SocialFeedProps {
  initialItems: SocialFeedItem[]
  initialCursor: string | null
}

export function SocialFeed({ initialItems, initialCursor }: SocialFeedProps) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [isPending, startTransition] = useTransition()

  const loadMore = () => {
    if (!cursor || isPending) return
    startTransition(async () => {
      try {
        const result = await getChefSocialFeed({ cursor })
        setItems((prev) => [...prev, ...result.items])
        setCursor(result.nextCursor)
      } catch {
        toast.error('Failed to load more activity')
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-12 text-center">
        <div className="mb-3 text-4xl">📡</div>
        <h3 className="text-lg font-semibold text-stone-200">No activity yet</h3>
        <p className="mt-1 text-sm text-stone-400">
          Messages from your circles will appear here as a unified feed.
        </p>
      </div>
    )
  }

  // Group items by date
  const grouped: { date: string; items: SocialFeedItem[] }[] = []
  for (const item of items) {
    const dateStr = new Date(item.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    const lastGroup = grouped[grouped.length - 1]
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.items.push(item)
    } else {
      grouped.push({ date: dateStr, items: [item] })
    }
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.date}>
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-500">
            {group.date}
          </div>
          <div className="space-y-2">
            {group.items.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}

      {cursor && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="rounded-full bg-stone-800 px-4 py-1.5 text-xs text-stone-400 hover:bg-stone-700"
          >
            {isPending ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

function FeedCard({ item }: { item: SocialFeedItem }) {
  const time = new Date(item.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <Link
      href={`/hub/g/${item.group_token}`}
      target="_blank"
      className="block rounded-xl border border-stone-700/50 bg-stone-800/30 p-4 transition-colors hover:bg-stone-800/60"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{item.group_emoji || '💬'}</span>
          <span className="text-xs font-medium text-stone-400">{item.group_name}</span>
        </div>
        <span className="text-xs text-stone-500">{time}</span>
      </div>

      <div className="flex items-start gap-3">
        {item.author_avatar_url ? (
          <img src={item.author_avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-700 text-xs font-bold text-stone-300">
            {item.author_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-stone-200">{item.author_name}</span>

          {item.message_type === 'poll' && (
            <p className="mt-0.5 text-sm text-stone-300">📊 {item.body}</p>
          )}

          {item.message_type === 'image' && item.media_urls.length > 0 && (
            <div className="mt-1">
              <p className="text-sm text-stone-300">{item.body}</p>
              <div className="mt-1 flex gap-1">
                {item.media_urls.slice(0, 3).map((url, i) => (
                  <div key={i} className="h-16 w-16 overflow-hidden rounded-lg bg-stone-700">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(item.message_type === 'text' || item.message_type === 'note') && (
            <p className="mt-0.5 line-clamp-3 text-sm text-stone-300">{item.body}</p>
          )}

          {!['text', 'note', 'poll', 'image'].includes(item.message_type) && item.body && (
            <p className="mt-0.5 text-sm text-stone-300">{item.body}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
