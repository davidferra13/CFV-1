# Tables Social Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified social hub at `/tables` that aggregates all 7 social features behind one nav button, with a hybrid feed-first + stats-grid layout.

**Architecture:** Pure unification layer. Zero new DB tables. One new route (`/tables`), one new lib module (`lib/tables/`), three new components (`components/tables/`). Modifies nav config, shell budget, route policy, and notification routing. All social features stay at existing URLs; Tables links into them.

**Tech Stack:** Next.js server components, Suspense streaming, existing Supabase queries, Tailwind CSS with ChefFlow design tokens, lucide-react icons.

**Spec:** `docs/specs/tables-social-hub.md`

---

## File Map

### Create:

- `lib/tables/feed-unification.ts` -- normalize two feed sources into unified `TablesPost` type
- `components/tables/tables-strip.tsx` -- active tables bubble strip (horizontal scroll)
- `components/tables/tables-stats-row.tsx` -- 4 stat cards with live counts
- `components/tables/tables-feed.tsx` -- unified feed + sidebar layout (client component for tab state)
- `app/(chef)/tables/page.tsx` -- hub page (server component, Suspense streaming)
- `app/(chef)/tables/loading.tsx` -- loading skeleton

### Modify:

- `lib/interface/surface-governance.ts` -- add `/tables` to surface mode + shell budget
- `lib/auth/route-policy.ts` -- add `/tables` to CHEF_PROTECTED_PATHS
- `components/navigation/nav-config.tsx` -- remove `network` group, add Circles as standalone
- `components/navigation/chef-nav.tsx` -- replace community rail link with Tables button
- `lib/social/chef-social/notifications.ts` -- add `revalidatePath('/tables')`

---

## Task 1: Feed Unification Types and Logic

**Files:**

- Create: `lib/tables/feed-unification.ts`
- Create: `tests/unit/tables-feed-unification.test.ts`

- [ ] **Step 1: Write the failing test for `normalizeHubFeedItem`**

```ts
// tests/unit/tables-feed-unification.test.ts
import { describe, it, expect } from 'vitest'
import {
  normalizeHubFeedItem,
  normalizeChefSocialPost,
  unifyFeeds,
  type TablesPost,
} from '@/lib/tables/feed-unification'

describe('normalizeHubFeedItem', () => {
  it('converts a hub social feed item to TablesPost', () => {
    const item = {
      id: 'msg-1',
      group_id: 'g1',
      group_name: 'Johnson Dinner',
      group_emoji: '🍝',
      group_token: 'tok-abc',
      author_name: 'Sarah Johnson',
      author_avatar_url: null,
      message_type: 'text',
      body: 'Menu looks great!',
      media_urls: [],
      created_at: '2026-05-25T10:00:00Z',
    }

    const result = normalizeHubFeedItem(item)

    expect(result).toEqual({
      id: 'hub-msg-1',
      source: 'circle',
      author: { name: 'Sarah Johnson', avatarUrl: null },
      body: 'Menu looks great!',
      media: [],
      reactions: null,
      timestamp: '2026-05-25T10:00:00Z',
      sourceLabel: 'Johnson Dinner',
      sourceHref: '/hub/g/tok-abc',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/tables-feed-unification.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the TablesPost type and normalizeHubFeedItem**

```ts
// lib/tables/feed-unification.ts
import type { SocialFeedItem } from '@/lib/hub/social-feed-actions'
import type { SocialPost } from '@/lib/social/chef-social/types'

export type TablesPostSource = 'circle' | 'network' | 'open-table' | 'community'

export type TablesPost = {
  id: string
  source: TablesPostSource
  author: { name: string; avatarUrl: string | null }
  body: string | null
  media: string[]
  reactions: { emoji: string; count: number }[] | null
  timestamp: string
  sourceLabel: string
  sourceHref: string
}

export function normalizeHubFeedItem(item: SocialFeedItem): TablesPost {
  return {
    id: `hub-${item.id}`,
    source: 'circle',
    author: { name: item.author_name, avatarUrl: item.author_avatar_url },
    body: item.body,
    media: item.media_urls,
    reactions: null,
    timestamp: item.created_at,
    sourceLabel: item.group_name,
    sourceHref: `/hub/g/${item.group_token}`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/tables-feed-unification.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for `normalizeChefSocialPost`**

Add to `tests/unit/tables-feed-unification.test.ts`:

```ts
describe('normalizeChefSocialPost', () => {
  it('converts a chef social post to TablesPost', () => {
    const post = {
      id: 'post-1',
      chef_id: 'chef-abc',
      author_name: 'Chef Maria',
      author_avatar_url: '/avatars/maria.jpg',
      body: 'Great risotto tip',
      media_urls: ['/img/risotto.jpg'],
      post_type: 'text' as const,
      visibility: 'public' as const,
      reaction_counts: { fire: 12, clap: 3 },
      comment_count: 4,
      created_at: '2026-05-25T08:00:00Z',
    }

    const result = normalizeChefSocialPost(post as any)

    expect(result.id).toBe('social-post-1')
    expect(result.source).toBe('network')
    expect(result.author.name).toBe('Chef Maria')
    expect(result.body).toBe('Great risotto tip')
    expect(result.reactions).toEqual([
      { emoji: '🔥', count: 12 },
      { emoji: '👏', count: 3 },
    ])
    expect(result.sourceLabel).toBe('Chef Network')
    expect(result.sourceHref).toBe('/network')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/tables-feed-unification.test.ts`
Expected: FAIL on normalizeChefSocialPost

- [ ] **Step 7: Implement normalizeChefSocialPost**

Add to `lib/tables/feed-unification.ts`:

```ts
const REACTION_EMOJI: Record<string, string> = {
  like: '👍',
  fire: '🔥',
  clap: '👏',
  wow: '😮',
  hungry: '🤤',
  insightful: '💡',
}

export function normalizeChefSocialPost(post: SocialPost): TablesPost {
  const reactions = post.reaction_counts
    ? Object.entries(post.reaction_counts)
        .filter(([, count]) => count > 0)
        .map(([emoji, count]) => ({
          emoji: REACTION_EMOJI[emoji] || emoji,
          count,
        }))
    : null

  return {
    id: `social-${post.id}`,
    source: 'network',
    author: {
      name: post.author_name || 'Unknown Chef',
      avatarUrl: post.author_avatar_url || null,
    },
    body: post.body,
    media: post.media_urls || [],
    reactions,
    timestamp: post.created_at,
    sourceLabel: 'Chef Network',
    sourceHref: '/network',
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/unit/tables-feed-unification.test.ts`
Expected: PASS

- [ ] **Step 9: Write failing test for `unifyFeeds`**

Add to `tests/unit/tables-feed-unification.test.ts`:

```ts
describe('unifyFeeds', () => {
  it('merges and sorts both feeds by timestamp descending', () => {
    const hubItems: TablesPost[] = [
      {
        id: 'hub-1',
        source: 'circle',
        author: { name: 'A', avatarUrl: null },
        body: 'old',
        media: [],
        reactions: null,
        timestamp: '2026-05-25T08:00:00Z',
        sourceLabel: 'X',
        sourceHref: '/x',
      },
    ]
    const socialPosts: TablesPost[] = [
      {
        id: 'social-1',
        source: 'network',
        author: { name: 'B', avatarUrl: null },
        body: 'new',
        media: [],
        reactions: null,
        timestamp: '2026-05-25T10:00:00Z',
        sourceLabel: 'Y',
        sourceHref: '/y',
      },
    ]

    const result = unifyFeeds(hubItems, socialPosts)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('social-1')
    expect(result[1].id).toBe('hub-1')
  })

  it('deduplicates by id', () => {
    const a: TablesPost = {
      id: 'same-id',
      source: 'circle',
      author: { name: 'A', avatarUrl: null },
      body: 'first',
      media: [],
      reactions: null,
      timestamp: '2026-05-25T08:00:00Z',
      sourceLabel: 'X',
      sourceHref: '/x',
    }
    const result = unifyFeeds([a], [{ ...a }])
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 10: Implement `unifyFeeds`**

Add to `lib/tables/feed-unification.ts`:

```ts
export function unifyFeeds(hubPosts: TablesPost[], socialPosts: TablesPost[]): TablesPost[] {
  const seen = new Set<string>()
  const merged: TablesPost[] = []

  for (const post of [...hubPosts, ...socialPosts]) {
    if (!seen.has(post.id)) {
      seen.add(post.id)
      merged.push(post)
    }
  }

  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return merged
}
```

- [ ] **Step 11: Run all tests to verify they pass**

Run: `npx vitest run tests/unit/tables-feed-unification.test.ts`
Expected: all PASS

- [ ] **Step 12: Commit**

```bash
git add lib/tables/feed-unification.ts tests/unit/tables-feed-unification.test.ts
git commit -m "feat(tables): add feed unification layer with TablesPost type"
```

---

## Task 2: Surface Governance and Route Policy

**Files:**

- Modify: `lib/interface/surface-governance.ts`
- Modify: `lib/auth/route-policy.ts`

- [ ] **Step 1: Add `/tables` to `resolveChefSurfaceMode`**

In `lib/interface/surface-governance.ts`, in `resolveChefSurfaceMode` (line 47), add after the `if (!pathname || pathname === '/dashboard') return 'triage'` line:

```ts
if (pathname.startsWith('/tables')) return 'browsing'
```

- [ ] **Step 2: Add `/tables` shell budget to `resolveChefShellBudget`**

In `lib/interface/surface-governance.ts`, in `resolveChefShellBudget` (line 280), add after the `if (isImmersiveEditor || isWelcome)` block (after line 298) and before the default return:

```ts
const isTables = pathname.startsWith('/tables')
if (isTables) {
  return {
    mode,
    showMarketResearchBanner: false,
    showFeedbackNudge: false,
    showDesktopSidebar: true,
    showMobileNav: true,
    showBreadcrumbBar: false,
    showQuickExpenseTrigger: false,
    showRemy: true,
    showQuickCapture: false,
    showLiveAlerts: false,
    showContextualRail: false,
    contentWidth: 'full',
  }
}
```

- [ ] **Step 3: Add `/tables` to CHEF_PROTECTED_PATHS**

In `lib/auth/route-policy.ts`, add `/tables` to the `CHEF_PROTECTED_PATHS` array. Insert alphabetically after `/tasks`:

```ts
  '/tables',
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add lib/interface/surface-governance.ts lib/auth/route-policy.ts
git commit -m "feat(tables): add shell budget and route policy for /tables"
```

---

## Task 3: Tables Strip Component

**Files:**

- Create: `components/tables/tables-strip.tsx`

- [ ] **Step 1: Create the tables strip component**

```tsx
// components/tables/tables-strip.tsx
import Link from 'next/link'

type TableBubble = {
  id: string
  name: string
  emoji: string | null
  token: string
  gradient: string
  hasUnread: boolean
}

export function TablesStrip({ tables }: { tables: TableBubble[] }) {
  return (
    <div className="flex gap-3 pb-4 overflow-x-auto scrollbar-hide">
      {tables.map((table) => (
        <Link
          key={table.id}
          href={`/hub/g/${table.token}`}
          className="flex-shrink-0 flex flex-col items-center gap-1 group"
        >
          <div
            className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl relative border-2 transition-transform duration-200 group-hover:-translate-y-0.5 ${
              table.hasUnread ? 'border-brand-500' : 'border-transparent'
            }`}
            style={{ background: table.gradient }}
          >
            {table.emoji || table.name.charAt(0)}
            {table.hasUnread && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2 border-surface-0" />
            )}
          </div>
          <span className="text-[11px] text-stone-400 max-w-[64px] text-center truncate">
            {table.name}
          </span>
        </Link>
      ))}
      <Link href="/circles/admin" className="flex-shrink-0 flex flex-col items-center gap-1 group">
        <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl border-2 border-dashed border-stone-600 text-stone-500 transition-colors group-hover:border-brand-500 group-hover:text-brand-500">
          +
        </div>
        <span className="text-[11px] text-stone-500">New Table</span>
      </Link>
    </div>
  )
}

export type { TableBubble }
```

- [ ] **Step 2: Commit**

```bash
git add components/tables/tables-strip.tsx
git commit -m "feat(tables): add active tables bubble strip component"
```

---

## Task 4: Tables Stats Row Component

**Files:**

- Create: `components/tables/tables-stats-row.tsx`

- [ ] **Step 1: Create the stats row component**

```tsx
// components/tables/tables-stats-row.tsx
import Link from 'next/link'

type StatCard = {
  icon: string
  label: string
  value: string
  count: number
  color: 'amber' | 'emerald' | 'blue' | 'purple'
  href: string
}

const colorMap = {
  amber: 'from-amber-800/60 to-amber-600/0 hover:border-amber-700/40',
  emerald: 'from-emerald-800/60 to-emerald-600/0 hover:border-emerald-700/40',
  blue: 'from-blue-800/60 to-blue-600/0 hover:border-blue-700/40',
  purple: 'from-purple-800/60 to-purple-600/0 hover:border-purple-700/40',
} as const

export function TablesStatsRow({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="group relative overflow-hidden rounded-xl border border-stone-700/40 bg-surface-accent p-4 transition-all duration-200 hover:border-stone-600 hover:-translate-y-px hover:shadow-lg card-transition"
          style={{
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
          }}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${colorMap[stat.color]} opacity-0 group-hover:opacity-100 transition-opacity`}
          />
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className="text-sm font-semibold text-stone-100">{stat.label}</div>
          <div className="text-xs text-stone-500">{stat.value}</div>
          <div className="absolute top-4 right-4 text-2xl font-bold text-stone-100 opacity-[0.15]">
            {stat.count}
          </div>
        </Link>
      ))}
    </div>
  )
}

export type { StatCard }
```

- [ ] **Step 2: Commit**

```bash
git add components/tables/tables-stats-row.tsx
git commit -m "feat(tables): add stats row component with gradient cards"
```

---

## Task 5: Tables Feed Component

**Files:**

- Create: `components/tables/tables-feed.tsx`

- [ ] **Step 1: Create the unified feed component**

```tsx
// components/tables/tables-feed.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
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
        <span className="text-xs text-stone-400 cursor-pointer hover:text-stone-200 transition-colors">
          💬 Reply
        </span>
        <span className="text-xs text-stone-400 cursor-pointer hover:text-stone-200 transition-colors ml-auto">
          📌 Save
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
```

- [ ] **Step 2: Commit**

```bash
git add components/tables/tables-feed.tsx
git commit -m "feat(tables): add unified feed component with source tags"
```

---

## Task 6: Tables Hub Page

**Files:**

- Create: `app/(chef)/tables/page.tsx`
- Create: `app/(chef)/tables/loading.tsx`

- [ ] **Step 1: Create the loading skeleton**

```tsx
// app/(chef)/tables/loading.tsx
export default function TablesLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div
        className="border-b border-stone-800 p-6 pb-0"
        style={{
          background: 'linear-gradient(180deg, rgba(237,168,107,0.08) 0%, transparent 100%)',
        }}
      >
        <div className="h-8 w-32 bg-stone-800 rounded mb-2" />
        <div className="h-4 w-64 bg-stone-800/60 rounded mb-5" />
        <div className="flex gap-3 pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-[52px] h-[52px] rounded-full bg-stone-800" />
              <div className="w-12 h-3 bg-stone-800/60 rounded" />
            </div>
          ))}
        </div>
        <div className="flex gap-4 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-stone-800/40 rounded" />
          ))}
        </div>
      </div>
      <div className="p-6 max-w-[1200px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-stone-800/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-stone-800/50" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-stone-800/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the hub page**

```tsx
// app/(chef)/tables/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'
import { getSocialFeed } from '@/lib/social/chef-social/posts'
import { getFollowCounts } from '@/lib/social/chef-social/follows'
import { getUnreadSocialNotificationCount } from '@/lib/social/chef-social/notifications'
import { getOpenTables } from '@/lib/hub/open-tables-actions'
import { getDiscoverChefs } from '@/lib/social/chef-social/discovery'
import { getTrendingHashtags } from '@/lib/social/chef-social/discovery'
import {
  normalizeHubFeedItem,
  normalizeChefSocialPost,
  unifyFeeds,
} from '@/lib/tables/feed-unification'
import { TablesStrip, type TableBubble } from '@/components/tables/tables-strip'
import { TablesStatsRow, type StatCard } from '@/components/tables/tables-stats-row'
import { TablesFeed } from '@/components/tables/tables-feed'

export const metadata: Metadata = { title: 'Tables' }

const CIRCLE_GRADIENTS = [
  'linear-gradient(135deg, #92400e, #d97706)',
  'linear-gradient(135deg, #065f46, #10b981)',
  'linear-gradient(135deg, #1e3a5f, #3b82f6)',
  'linear-gradient(135deg, #581c87, #7c3aed)',
  'linear-gradient(135deg, #7f1d1d, #dc2626)',
  'linear-gradient(135deg, #713f12, #ca8a04)',
  'linear-gradient(135deg, #134e4a, #14b8a6)',
  'linear-gradient(135deg, #be185d, #ec4899)',
]

export default async function TablesPage() {
  const user = await requireChef()

  return (
    <div className="min-h-screen">
      {/* Header zone */}
      <div
        className="border-b border-stone-800 px-6 lg:px-8 pt-6"
        style={{
          background: 'linear-gradient(180deg, rgba(237,168,107,0.08) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[28px] font-bold text-stone-100 font-display-serif">Tables</h1>
            <p className="text-sm text-stone-500 mt-0.5">Your social world outside the kitchen</p>
          </div>
          <div className="flex gap-2">
            <Suspense fallback={<NotifBellFallback />}>
              <NotificationBellAsync />
            </Suspense>
            <Link
              href="/network?tab=discover"
              className="h-9 px-3.5 rounded-full border border-stone-700 bg-surface-accent text-sm text-stone-300 flex items-center gap-1.5 hover:border-stone-600 hover:bg-surface transition-colors"
            >
              🔍 Search people
            </Link>
            <Link
              href="/circles/admin"
              className="h-9 px-3.5 rounded-full bg-brand-600 border border-brand-600 text-sm text-white flex items-center hover:bg-brand-500 transition-colors"
            >
              + Create Table
            </Link>
          </div>
        </div>

        {/* Active tables strip */}
        <Suspense
          fallback={
            <div className="flex gap-3 pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[52px] h-[52px] rounded-full bg-stone-800 animate-pulse"
                />
              ))}
            </div>
          }
        >
          <TablesStripAsync userId={user.entityId} tenantId={user.tenantId} />
        </Suspense>

        {/* Tab bar */}
        <div className="flex">
          {['Feed', 'Discover', 'People', 'Community', 'Content Studio'].map((tab, i) => (
            <Link
              key={tab}
              href={
                i === 0
                  ? '/tables'
                  : i === 1
                    ? '/explore'
                    : i === 2
                      ? '/network?tab=connections'
                      : i === 3
                        ? '/community'
                        : '/marketing/social'
              }
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                i === 0
                  ? 'text-brand-400 border-brand-500'
                  : 'text-stone-400 border-transparent hover:text-stone-200'
              }`}
            >
              {tab}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 lg:px-8 py-6 max-w-[1200px]">
        {/* Stats row */}
        <Suspense
          fallback={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-stone-800/50 animate-pulse" />
              ))}
            </div>
          }
        >
          <StatsRowAsync tenantId={user.tenantId} />
        </Suspense>

        {/* Quick actions */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { label: '📝 Post to Network', href: '/network?tab=feed' },
            { label: '🔍 Find a Chef', href: '/explore/discover' },
            { label: '📊 View Benchmarks', href: '/community/benchmarks' },
            { label: '🤝 Share a Lead', href: '/network?tab=collab' },
            { label: '📋 Browse Templates', href: '/community/templates' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="px-3.5 py-1.5 rounded-full bg-surface-accent border border-stone-700 text-xs text-stone-300 hover:bg-surface hover:text-stone-100 hover:border-stone-600 transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>

        {/* Two-column: Feed + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Suspense
            fallback={
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-xl bg-stone-800/50 animate-pulse" />
                ))}
              </div>
            }
          >
            <FeedAsync />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-stone-800/50 animate-pulse" />
                ))}
              </div>
            }
          >
            <SidebarAsync />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Async server sub-components (streamed via Suspense)
// ---------------------------------------------------------------------------

function NotifBellFallback() {
  return <div className="h-9 w-9 rounded-full bg-stone-800 animate-pulse" />
}

async function NotificationBellAsync() {
  const count = await getUnreadSocialNotificationCount()
  return (
    <Link
      href="/network/notifications"
      className="relative h-9 w-9 rounded-full border border-stone-700 bg-surface-accent flex items-center justify-center text-stone-300 hover:border-stone-600 transition-colors"
    >
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

async function TablesStripAsync({ userId, tenantId }: { userId: string; tenantId: string }) {
  const circles = await getChefCircles()
  const bubbles: TableBubble[] = (circles || []).slice(0, 8).map((c, i) => ({
    id: c.id,
    name: c.display_name || c.group_name || 'Table',
    emoji: c.emoji || null,
    token: c.group_token,
    gradient: CIRCLE_GRADIENTS[i % CIRCLE_GRADIENTS.length],
    hasUnread: c.has_unread ?? false,
  }))

  return <TablesStrip tables={bubbles} />
}

async function StatsRowAsync({ tenantId }: { tenantId: string }) {
  const [circles, openTables, followCounts] = await Promise.all([
    getChefCircles(),
    getOpenTables().catch(() => []),
    getFollowCounts().catch(() => ({ followers: 0, following: 0, connections: 0, pending: 0 })),
  ])

  const unreadCount = (circles || []).filter((c) => c.has_unread).length

  const stats: StatCard[] = [
    {
      icon: '🪑',
      label: 'Active Tables',
      value: unreadCount > 0 ? `${unreadCount} with unread` : 'All caught up',
      count: (circles || []).length,
      color: 'amber',
      href: '/circles',
    },
    {
      icon: '🌐',
      label: 'Open Tables',
      value: 'Browse nearby',
      count: (openTables || []).length,
      color: 'emerald',
      href: '/hub/open-tables',
    },
    {
      icon: '👥',
      label: 'Connections',
      value: followCounts.pending > 0 ? `${followCounts.pending} pending` : 'Find people',
      count: followCounts.connections + followCounts.followers,
      color: 'blue',
      href: '/network?tab=connections',
    },
    {
      icon: '📱',
      label: 'Content Queue',
      value: 'Manage posts',
      count: 0,
      color: 'purple',
      href: '/marketing/social',
    },
  ]

  return <TablesStatsRow stats={stats} />
}

async function FeedAsync() {
  const [hubFeed, socialFeed] = await Promise.all([
    getChefSocialFeed({ limit: 10 }).catch(() => ({ items: [], nextCursor: null })),
    getSocialFeed({ mode: 'for_you', limit: 10 }).catch(() => []),
  ])

  const hubPosts = hubFeed.items.map(normalizeHubFeedItem)
  const socialPosts = socialFeed.map(normalizeChefSocialPost)
  const unified = unifyFeeds(hubPosts, socialPosts)

  return <TablesFeed posts={unified} />
}

async function SidebarAsync() {
  const [openTables, trendingTags] = await Promise.all([
    getOpenTables().catch(() => []),
    getTrendingHashtags().catch(() => []),
  ])

  return (
    <div className="space-y-4">
      {/* Open Tables Nearby */}
      {(openTables || []).length > 0 && (
        <SidebarSection title="Open Tables Nearby" seeAllHref="/hub/open-tables">
          {(openTables || []).slice(0, 3).map((table: any) => (
            <Link
              key={table.id}
              href={`/hub/join/${table.group_token}`}
              className="block p-2.5 rounded-lg bg-stone-700/30 hover:bg-stone-700/50 transition-colors mb-2"
            >
              <div className="text-xs font-semibold text-stone-200">
                {table.emoji || '🪑'} {table.display_name || table.group_name}
              </div>
              <div className="text-[10px] text-stone-500 flex gap-2 mt-0.5">
                <span>{table.display_area || 'Nearby'}</span>
                {table.open_seats && (
                  <span className="text-emerald-400">{table.open_seats} seats open</span>
                )}
              </div>
            </Link>
          ))}
        </SidebarSection>
      )}

      {/* Trending */}
      {(trendingTags || []).length > 0 && (
        <SidebarSection title="Trending Topics">
          <div className="flex flex-wrap gap-1.5">
            {(trendingTags || []).slice(0, 8).map((tag: any) => (
              <span
                key={typeof tag === 'string' ? tag : tag.tag}
                className="text-xs px-2.5 py-1 rounded-full bg-stone-700/40 text-stone-300 cursor-pointer hover:bg-brand-950 hover:text-brand-400 transition-colors"
              >
                #{typeof tag === 'string' ? tag : tag.tag}
              </span>
            ))}
          </div>
        </SidebarSection>
      )}

      {/* Content Studio Mini */}
      <SidebarSection title="Content Studio" seeAllHref="/marketing/social" seeAllLabel="Manage">
        <Link
          href="/marketing/social"
          className="block p-2.5 rounded-lg bg-stone-700/30 hover:bg-stone-700/50 transition-colors"
        >
          <div className="text-xs text-stone-300">Social media planner</div>
          <div className="text-[10px] text-stone-500 mt-0.5">Schedule and publish content</div>
        </Link>
      </SidebarSection>
    </div>
  )
}

function SidebarSection({
  title,
  seeAllHref,
  seeAllLabel = 'See all',
  children,
}: {
  title: string
  seeAllHref?: string
  seeAllLabel?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border border-stone-700/40 bg-surface-accent p-4"
      style={{
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-stone-100">{title}</div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-[11px] text-brand-400 font-medium hover:text-brand-300 transition-colors"
          >
            {seeAllLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0 (may need to adjust import paths based on exact function signatures)

- [ ] **Step 4: Commit**

```bash
git add app/(chef)/tables/page.tsx app/(chef)/tables/loading.tsx
git commit -m "feat(tables): add Tables hub page with unified feed, stats, and sidebar"
```

---

## Task 7: Nav Changes -- Tables Button + Network Group Removal

**Files:**

- Modify: `components/navigation/nav-config.tsx`
- Modify: `components/navigation/chef-nav.tsx`

- [ ] **Step 1: Remove the `network` nav group from nav-config.tsx**

In `components/navigation/nav-config.tsx`, remove the entire network group object (lines 976-1034). This is the object with `id: 'network'`.

- [ ] **Step 2: Add Circles as a standalone top-level nav item**

In `components/navigation/nav-config.tsx`, find the `standaloneTop` array (or the primary nav items list) and add Circles. If standalone items are defined separately, add:

```ts
{
  href: '/circles',
  label: 'Circles',
  icon: MessagesSquare,
  children: [{ href: '/circles/admin', label: 'Circle Admin' }],
},
```

Place it after Inquiries in the nav order to keep work-related items grouped.

- [ ] **Step 3: Replace community rail link with Tables button in chef-nav.tsx**

In `components/navigation/chef-nav.tsx`, add `Armchair` to the lucide icon imports at the top of the file (near other icon imports or in the icon import block).

Then replace lines 877-885 (the `showCommunityRailLink` conditional):

```ts
const tablesRailActive = pathname.startsWith('/tables')
const showTablesRailLink =
  isAdmin ||
  isPrivileged ||
  showAllNav ||
  tablesRailActive ||
  !tenantPresence ||
  tenantPresence.hasNetwork ||
  tenantPresence.hasCircles
```

Then replace lines 1047-1064 (the community rail link rendering):

```tsx
;<div className="w-6 border-t border-stone-800 my-1.5" />

{
  /* Tables - social hub rail button */
}
{
  showTablesRailLink && (
    <div className="flex flex-col items-center mb-3">
      <Link
        href="/tables"
        title="Tables"
        aria-label="Tables - Your social hub"
        className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
          tablesRailActive
            ? 'shadow-[0_0_24px_rgba(237,168,107,0.35)]'
            : 'hover:scale-105 hover:shadow-[0_0_16px_rgba(237,168,107,0.2)]'
        }`}
        style={{
          background: 'linear-gradient(135deg, #B15C26, #EDA86B)',
        }}
      >
        <Armchair className="w-[18px] h-[18px] text-white" />
      </Link>
      <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-brand-400 mt-1">
        Tables
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Remove old `networkRailActive` and `showCommunityRailLink` variables**

Make sure the old variable names are fully replaced. Search for any remaining references to `networkRailActive` or `showCommunityRailLink` in the file and update them to the new names (`tablesRailActive`, `showTablesRailLink`).

- [ ] **Step 5: Remove `Social Hub` from marketing group in nav-config.tsx**

Find the marketing group and remove the Social Hub item (`href: '/social'`).

- [ ] **Step 6: Verify typecheck passes**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

- [ ] **Step 7: Commit**

```bash
git add components/navigation/nav-config.tsx components/navigation/chef-nav.tsx
git commit -m "feat(tables): replace community rail link with Tables button, remove network nav group"
```

---

## Task 8: Notification Routing Update

**Files:**

- Modify: `lib/social/chef-social/notifications.ts`

- [ ] **Step 1: Add `revalidatePath('/tables')` to `markSocialNotificationsRead`**

In `lib/social/chef-social/notifications.ts`, line 61 currently has:

```ts
revalidatePath('/network')
```

Change to:

```ts
revalidatePath('/network')
revalidatePath('/tables')
```

- [ ] **Step 2: Commit**

```bash
git add lib/social/chef-social/notifications.ts
git commit -m "fix(tables): revalidate /tables on social notification read"
```

---

## Task 9: Smoke Test

- [ ] **Step 1: Verify the dev server is running**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100`
Expected: 200 or 302

- [ ] **Step 2: Verify /tables loads without error**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/tables`
Expected: 200 or 302 (redirect to auth if not signed in)

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

- [ ] **Step 4: Run affected tests**

Run: `npx vitest run tests/unit/tables-feed-unification.test.ts`
Expected: all PASS

- [ ] **Step 5: Sign in via agent account and verify the page renders**

```bash
curl -X POST http://localhost:3100/api/e2e/auth -H "Content-Type: application/json" -d @.auth/agent.json -c cookies.txt
curl -b cookies.txt -s http://localhost:3100/tables | head -50
```

Expected: HTML containing "Tables" heading

- [ ] **Step 6: Final commit with any fixes**

```bash
git add -A
git commit -m "feat(tables): Tables social hub complete - unified social zone with feed, stats, nav button"
```

---

## Post-Build Checklist

After all tasks complete, the builder must run:

1. `npm run regression:firewall` -- must pass
2. `/wire-audit` -- check tables route is wired
3. `/page-xray --delta` on `/tables` route
4. Verify the Tables button appears at the bottom of the sidebar
5. Verify clicking it loads the hub page with header, strip, stats, feed, sidebar
6. Verify all tab links navigate to their target pages
7. Verify the old "Community" rail link is gone
8. Verify Circles still appears in the main nav and loads `/circles`
