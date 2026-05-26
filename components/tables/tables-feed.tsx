'use client'

import type { TablesPost } from '@/lib/tables/feed-unification'

const sourceStyles: Record<string, { bg: string; text: string; label: string }> = {
  network: { bg: 'bg-purple-500/15', text: 'text-purple-300', label: 'Chef Network' },
  circle: { bg: 'bg-brand-500/15', text: 'text-brand-400', label: 'Dinner Circle' },
  'open-table': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', label: 'Open Table' },
  community: { bg: 'bg-blue-500/15', text: 'text-blue-300', label: 'Community' },
}

function PostCard({ post }: { post: TablesPost }) {
  const style = sourceStyles[post.source] || sourceStyles.network

  return (
    <div
      className="rounded-xl border border-stone-700/40 bg-surface-accent p-4 mb-3 transition-colors hover:border-stone-600"
      style={{
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-200 flex-shrink-0">
          {post.author.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            post.author.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-stone-100">{post.author.name}</div>
          <div className="text-xs text-stone-500">{formatTimeAgo(post.timestamp)}</div>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
      </div>

      {post.body && <p className="text-sm text-stone-300 leading-relaxed mb-3">{post.body}</p>}

      <div className="flex gap-4 pt-2 border-t border-stone-700/30">
        {post.reactions?.map((r) => (
          <span
            key={r.emoji}
            className="text-xs text-stone-400 cursor-pointer hover:text-stone-200 transition-colors"
          >
            {r.emoji} {r.count}
          </span>
        ))}
        <span className="text-xs text-stone-400 cursor-pointer hover:text-stone-200 transition-colors ml-auto">
          💬 Reply
        </span>
      </div>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function TablesFeed({ posts }: { posts: TablesPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-stone-700/40 bg-surface-accent p-8 text-center">
        <div className="text-3xl mb-3">🪑</div>
        <div className="text-sm font-medium text-stone-200 mb-1">Your feed is empty</div>
        <div className="text-xs text-stone-500">
          Join a table or follow a chef to see posts here
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
        Latest from your tables
      </div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
